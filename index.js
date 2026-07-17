import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

let mainCheckboxCache = null;

function getMainSettingsCheckbox() {
    if (mainCheckboxCache) return mainCheckboxCache;

    // Try common IDs
    let checkbox = document.querySelector('#hideChatAvatars, [name="hideChatAvatars"]');
    if (checkbox) {
        mainCheckboxCache = checkbox;
        return checkbox;
    }

    // Fallback: search by label text
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const el of allCheckboxes) {
        const label = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
        if (label && label.textContent.includes('Hide Chat Avatars')) {
            mainCheckboxCache = el;
            return el;
        }
    }
    return null;
}

function applyHideChatAvatars(state) {
    // Use the core's built-in function if available
    if (typeof window.switchHideChatAvatars === 'function') {
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = state;
        }
        window.switchHideChatAvatars();
    } else {
        // Fallback: toggle class and style
        document.body.classList.toggle('hideChatAvatars', state);
        document.querySelectorAll('.mes .avatar').forEach(avatar => {
            avatar.style.display = state ? 'none' : '';
        });
    }
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // --- Read the saved state from context.settings (which is now loaded) ---
    const isHidden = context.settings?.hideChatAvatars || false;

    // --- Apply the state (this will hide avatars if needed) ---
    applyHideChatAvatars(isHidden);

    // --- Create our extension menu item ---
    const menuItem = document.createElement('div');
    menuItem.id = 'toggle-chat-avatar-item';
    menuItem.className = 'list-group-item flex-container flexGap5';
    menuItem.style.cursor = 'pointer';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = 'toggle-chat-avatar-checkbox';
    toggle.checked = isHidden;

    const label = document.createElement('label');
    label.htmlFor = 'toggle-chat-avatar-checkbox';
    label.textContent = 'Hide Chat Avatars';
    label.style.margin = '0';
    label.style.cursor = 'pointer';

    menuItem.appendChild(toggle);
    menuItem.appendChild(label);
    extensionsMenu.appendChild(menuItem);

    // --- Sync the main checkbox (silently, no event dispatch) ---
    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // --- Listener: Extension toggle → update core and main checkbox ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        // Update the persistent setting
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        // Apply via core function
        applyHideChatAvatars(newState);
        // Save
        if (context.saveSettings) {
            context.saveSettings();
        }
        // Sync main checkbox (silent)
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // --- Listener: Main checkbox → update our toggle ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                // Update our setting and UI
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                applyHideChatAvatars(newState);
                // The core already saves via its own handler, so we don't call saveSettings here
            }
        });
    }

    // --- Re-apply after messages render (fixes refresh visibility) ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.settings?.hideChatAvatars || false;
        applyHideChatAvatars(currentState);
        // Sync checkboxes if they drifted
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    // Safety net: re-apply after a short delay
    setTimeout(() => {
        const currentState = context.settings?.hideChatAvatars || false;
        applyHideChatAvatars(currentState);
    }, 300);
}

function init() {
    // ONLY run after the app is fully ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
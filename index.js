import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

let mainCheckboxCache = null;

function getMainSettingsCheckbox() {
    if (mainCheckboxCache) return mainCheckboxCache;

    let checkbox = document.querySelector('#hideChatAvatars, [name="hideChatAvatars"]');
    if (checkbox) {
        mainCheckboxCache = checkbox;
        return checkbox;
    }

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
    // Use the core's function if available
    if (typeof window.switchHideChatAvatars === 'function') {
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = state;
        }
        window.switchHideChatAvatars();
    } else {
        // Fallback: toggle class and style directly
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

    // --- Read the current state from the body's class (the core's UI indicator) ---
    const isHidden = document.body.classList.contains('hideChatAvatars');

    // --- Ensure context.settings is updated (for other parts of the app) ---
    if (context.settings) {
        context.settings.hideChatAvatars = isHidden;
    }

    // --- Apply the state (should already be applied, but ensure it) ---
    applyHideChatAvatars(isHidden);

    // --- Create our menu item ---
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

    // --- Sync main checkbox silently ---
    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // --- Listener: Extension toggle → update all ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        applyHideChatAvatars(newState);
        if (context.saveSettings) {
            context.saveSettings();
        }
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
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                applyHideChatAvatars(newState);
                // The core saves automatically, so no need to call saveSettings here
            }
        });
    }

    // --- Re-apply after messages render (handles late-loaded avatars) ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        // Read the actual state from the body class (in case core toggled it elsewhere)
        const currentState = document.body.classList.contains('hideChatAvatars');
        if (context.settings) {
            context.settings.hideChatAvatars = currentState;
        }
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    // Safety net: re-apply after a short delay
    setTimeout(() => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        if (context.settings) {
            context.settings.hideChatAvatars = currentState;
        }
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    }, 300);
}

function init() {
    // Only run after app is fully ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
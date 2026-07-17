import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

let mainCheckboxCache = null;

function getMainSettingsCheckbox() {
    if (mainCheckboxCache) return mainCheckboxCache;

    let checkbox = document.querySelector('#hideChatAvatars');
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
    document.body.classList.toggle('hideChatAvatars', state);
    document.querySelectorAll('.mes .avatar').forEach(avatar => {
        avatar.style.display = state ? 'none' : '';
    });
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    const settings = context.settings || {};
    const isHidden = settings.hideChatAvatars || false;

    // Apply the saved state to the UI
    applyHideChatAvatars(isHidden);

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

    // Sync main checkbox silently
    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // Extension toggle → update setting and UI
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        // Update context.settings
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        applyHideChatAvatars(newState);
        if (context.saveSettings) {
            context.saveSettings();
        }
        // Update main checkbox without dispatching change
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // Main checkbox → update our toggle
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                // The core's handler already updated power_user and called switchHideChatAvatars,
                // but we also need to update our own setting and UI to stay in sync
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                applyHideChatAvatars(newState);
                // No need to save again; the core already saves via its handler
            }
        });
    }

    // Re-apply after messages render (fixes refresh visibility)
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.settings?.hideChatAvatars ?? false;
        applyHideChatAvatars(currentState);
        // Sync checkboxes in case they drifted
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    // Also apply after a short delay for safety
    setTimeout(() => {
        const currentState = context.settings?.hideChatAvatars ?? false;
        applyHideChatAvatars(currentState);
    }, 300);
}

function init() {
    // Wait for the app to be fully ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
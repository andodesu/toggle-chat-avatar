import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

let mainCheckboxCache = null;

function getMainSettingsCheckbox() {
    if (mainCheckboxCache) return mainCheckboxCache;
    const checkbox = document.querySelector('#hideChatAvatars, [name="hideChatAvatars"]');
    mainCheckboxCache = checkbox;
    return checkbox;
}

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read state from core settings (if undefined, default to false)
    const isHidden = context.settings?.hideChatAvatars ?? false;

    // Apply UI
    applyUiState(isHidden);

    // Create extension menu item
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

    // Get main checkbox
    const mainCheck = getMainSettingsCheckbox();

    // Sync main checkbox silently
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // Extension toggle → update core via main checkbox's change event
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        // Update context.settings
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        // Apply UI immediately
        applyUiState(newState);
        // Let the core handle saving by dispatching a change event on the main checkbox
        if (mainCheck) {
            mainCheck.checked = newState;
            mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // If mainCheck is not found, we can't trigger core save, but we'll assume it exists.
    });

    // Main checkbox → sync back to our toggle
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                applyUiState(newState);
                // The core's handler already saved, so we don't need to do anything else.
            }
        });
    }

    // Re-apply after new messages are rendered (fixes late-loaded avatars)
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.settings?.hideChatAvatars ?? false;
        applyUiState(currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });
}

function init() {
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

function getMainSettingsCheckbox() {
    return document.querySelector('#hideChatAvatarsEnabled');
}

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read from the core's powerUserSettings
    const isHidden = context.powerUserSettings?.hideChatAvatars_enabled ?? false;
    applyUiState(isHidden);

    // Create menu item
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

    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // --- Extension toggle ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;

        // Update core's powerUserSettings
        if (context.powerUserSettings) {
            context.powerUserSettings.hideChatAvatars_enabled = newState;
        }

        // Also update window.power_user if it exists
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }

        // Apply UI
        applyUiState(newState);

        // Sync main checkbox and trigger its change event
        if (mainCheck) {
            mainCheck.checked = newState;
            // Use jQuery if available to ensure both native and jQuery handlers fire
            if (typeof $ === 'function') {
                $(mainCheck).trigger('change');
            } else {
                mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Direct save as a safety net
        if (typeof context.saveSettingsDebounced === 'function') {
            context.saveSettingsDebounced();
        } else if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        } else if (context.saveSettings) {
            context.saveSettings();
        }
    });

    // --- Main checkbox -> sync back to our toggle ---
    if (mainCheck) {
        const handler = function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                applyUiState(newState);
            }
        };
        if (typeof $ === 'function') {
            $(mainCheck).on('change', handler);
        } else {
            mainCheck.addEventListener('change', handler);
        }
    }

    // --- Re-apply after messages render ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.powerUserSettings?.hideChatAvatars_enabled ?? false;
        applyUiState(currentState);
        if (toggle.checked !== currentState) toggle.checked = currentState;
        if (mainCheck && mainCheck.checked !== currentState) mainCheck.checked = currentState;
    });
}

function init() {
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
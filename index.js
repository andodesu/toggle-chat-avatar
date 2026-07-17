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

    // Read from core's powerUserSettings
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

        // 1. Update the core's source of truth (both places)
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        if (context.powerUserSettings) {
            context.powerUserSettings.hideChatAvatars_enabled = newState;
        }

        // 2. Apply UI (body class + avatars)
        applyUiState(newState);

        // 3. Call the core's UI update function
        if (typeof window.switchHideChatAvatars === 'function') {
            window.switchHideChatAvatars();
        }

        // 4. Save via core's debounced save
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        } else if (typeof context.saveSettingsDebounced === 'function') {
            context.saveSettingsDebounced();
        } else if (context.saveSettings) {
            context.saveSettings();
        }

        // 5. Sync the main checkbox (silent)
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // --- Main checkbox -> sync back to our toggle ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                // The core already updated power_user and saved, we just sync UI
                applyUiState(newState);
            }
        });
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
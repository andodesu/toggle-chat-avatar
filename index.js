import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
}

function saveSettings(context) {
    // Use core's debounced save if available, otherwise fallback to normal save
    if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    } else if (typeof context.saveSettingsDebounced === 'function') {
        context.saveSettingsDebounced();
    } else if (typeof context.saveSettings === 'function') {
        context.saveSettings();
    }
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu || document.getElementById('toggle-chat-avatar-item')) return;

    // Read current state from core's source of truth
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

    // Cache main checkbox
    const mainCheck = document.querySelector('#hideChatAvatarsEnabled');
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // --- Extension toggle ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;

        // Update core's sources
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        if (context.powerUserSettings) {
            context.powerUserSettings.hideChatAvatars_enabled = newState;
        }

        // Apply UI
        applyUiState(newState);

        // Apply via core's UI updater (if available)
        if (typeof window.switchHideChatAvatars === 'function') {
            window.switchHideChatAvatars();
        }

        // Save
        saveSettings(context);

        // Sync main checkbox silently
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // --- Main checkbox → sync to extension ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                applyUiState(newState);
            }
        });
    }

    // --- Re-apply after messages render ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.powerUserSettings?.hideChatAvatars_enabled ?? false;
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
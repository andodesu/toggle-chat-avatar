import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

function getMainSettingsCheckbox() {
    // The main checkbox has this ID
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

    // --- Read from core's powerUserSettings ---
    const isHidden = context.powerUserSettings?.hideChatAvatars_enabled ?? false;

    // Apply UI state
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

    // --- Extension toggle → update core ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;

        // 1. Update core's powerUserSettings
        if (context.powerUserSettings) {
            context.powerUserSettings.hideChatAvatars_enabled = newState;
        }

        // 2. Apply UI
        applyUiState(newState);

        // 3. Let the core save by dispatching change event on main checkbox
        if (mainCheck) {
            mainCheck.checked = newState;
            mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    // --- Main checkbox → sync back to our toggle ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                // Apply UI (the core already did, but this keeps us in sync)
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
    // Wait for app to be fully ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
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
    const isHidden = context.powerUserSettings?.hideChatAvatars_enabled ??
                    window.power_user?.hideChatAvatars_enabled ??
                    document.body.classList.contains('hideChatAvatars') ??
                    false;

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

    // --- Helper: Save function ---
    function saveCore() {
        if (typeof context.saveSettingsDebounced === 'function') {
            context.saveSettingsDebounced();
        } else if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        } else if (typeof context.saveSettings === 'function') {
            context.saveSettings();
        }
    }

    // --- Extension toggle ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;

        // 1. Update core's source of truth
        if (context.powerUserSettings) {
            context.powerUserSettings.hideChatAvatars_enabled = newState;
        }
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }

        // 2. Apply UI
        applyUiState(newState);

        // 3. Call core's UI update if available
        if (typeof window.switchHideChatAvatars === 'function') {
            window.switchHideChatAvatars();
        } else if (typeof context.switchHideChatAvatars === 'function') {
            context.switchHideChatAvatars();
        }

        // 4. Sync main checkbox and trigger its change event using jQuery
        if (mainCheck) {
            mainCheck.checked = newState;
            if (typeof $ === 'function') {
                $(mainCheck).trigger('change');
            } else {
                mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // 5. Directly call save with a small delay to ensure all handlers run
        setTimeout(saveCore, 50);

        // 6. Fallback: store in localStorage (belt-and-suspenders)
        localStorage.setItem('hideChatAvatarsState', String(newState));
    });

    // --- Main checkbox → sync back ---
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
        const currentState = context.powerUserSettings?.hideChatAvatars_enabled ??
                            window.power_user?.hideChatAvatars_enabled ??
                            document.body.classList.contains('hideChatAvatars') ??
                            false;
        applyUiState(currentState);
        if (toggle.checked !== currentState) toggle.checked = currentState;
        if (mainCheck && mainCheck.checked !== currentState) mainCheck.checked = currentState;
    });
}

function init() {
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
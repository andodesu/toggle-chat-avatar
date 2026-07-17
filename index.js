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
    // Store for debugging
    window.__debug__ = { context };

    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read from core's powerUserSettings (or window.power_user)
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

    // --- Extension toggle ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;

        // 1. Update all possible sources
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        if (context.powerUserSettings) {
            context.powerUserSettings.hideChatAvatars_enabled = newState;
        }

        // 2. Apply UI
        applyUiState(newState);

        // 3. Call the core's UI update function (should exist globally)
        if (typeof window.switchHideChatAvatars === 'function') {
            window.switchHideChatAvatars();
        } else if (typeof context.switchHideChatAvatars === 'function') {
            context.switchHideChatAvatars();
        }

        // 4. Save via the core's debounced save
        // Try various possibilities
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        } else if (typeof context.saveSettingsDebounced === 'function') {
            context.saveSettingsDebounced();
        } else if (typeof context.saveSettings === 'function') {
            context.saveSettings();
        } else {
            // Fallback: if all else fails, save via localStorage (we know it works)
            localStorage.setItem('hideChatAvatarsState', String(newState));
        }

        // 5. Sync main checkbox (silent)
        if (mainCheck) {
            mainCheck.checked = newState;
        }

        // Update debug object
        window.__debug__.lastToggled = newState;
    });

    // --- Main checkbox -> sync back to our toggle ---
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
        const currentState = window.power_user?.hideChatAvatars_enabled ??
                            context.powerUserSettings?.hideChatAvatars_enabled ??
                            document.body.classList.contains('hideChatAvatars') ??
                            false;
        applyUiState(currentState);
        if (toggle.checked !== currentState) toggle.checked = currentState;
        if (mainCheck && mainCheck.checked !== currentState) mainCheck.checked = currentState;
    });

    console.log('[EXT] Extension setup complete. Use window.__debug__ to inspect.');
}

function init() {
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
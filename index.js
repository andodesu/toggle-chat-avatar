import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

let mainCheckboxCache = null;

function log(msg, data) {
    console.log(`[EXT-DIAG] ${msg}`, data || '');
}

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
    log('applyHideChatAvatars', { state, method: typeof window.switchHideChatAvatars === 'function' ? 'core' : 'fallback' });
    if (typeof window.switchHideChatAvatars === 'function') {
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = state;
        }
        window.switchHideChatAvatars();
    } else {
        document.body.classList.toggle('hideChatAvatars', state);
        document.querySelectorAll('.mes .avatar').forEach(avatar => {
            avatar.style.display = state ? 'none' : '';
        });
    }
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) {
        log('extensionsMenu not found');
        return;
    }
    if (document.getElementById('toggle-chat-avatar-item')) {
        log('toggle already exists');
        return;
    }

    const isHidden = document.body.classList.contains('hideChatAvatars');
    log('Initial state from body class', isHidden);

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

    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
        log('Main checkbox synced', mainCheck.checked);
    } else {
        log('Main checkbox NOT found');
    }

    toggle.addEventListener('change', function() {
        const newState = this.checked;
        log('Extension toggled', newState);

        // Update all possible sources
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        applyHideChatAvatars(newState);

        // Try to save using multiple methods
        log('Attempting to save...');
        if (typeof window.saveSettingsDebounced === 'function') {
            log('Calling window.saveSettingsDebounced()');
            window.saveSettingsDebounced();
        } else {
            log('window.saveSettingsDebounced is NOT a function');
        }
        if (context.saveSettings) {
            log('Calling context.saveSettings()');
            context.saveSettings();
        } else {
            log('context.saveSettings is NOT available');
        }

        if (mainCheck) {
            mainCheck.checked = newState;
        }

        // Log current state after save attempts
        log('After save - power_user:', window.power_user?.hideChatAvatars_enabled);
        log('After save - context.settings:', context.settings?.hideChatAvatars);
        log('After save - body class:', document.body.classList.contains('hideChatAvatars'));
    });

    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            log('Main checkbox changed', newState);
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                if (window.power_user) {
                    window.power_user.hideChatAvatars_enabled = newState;
                }
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                applyHideChatAvatars(newState);
                // The core's own handler saves, but we also try to save
                if (typeof window.saveSettingsDebounced === 'function') {
                    window.saveSettingsDebounced();
                }
                if (context.saveSettings) {
                    context.saveSettings();
                }
            }
        });
    }

    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        log('CHAT_CHANGED - sync to', currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    setTimeout(() => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        log('Timeout re-sync to', currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    }, 300);

    log('Extension setup complete');
}

function init() {
    log('init called, waiting for APP_READY');
    eventSource.on(event_types.APP_READY, () => {
        log('APP_READY received');
        addMagicWandToggle();
        // After extension loads, log the state
        setTimeout(() => {
            log('Final state check after load:', {
                bodyClass: document.body.classList.contains('hideChatAvatars'),
                power_user: window.power_user?.hideChatAvatars_enabled,
                contextSettings: getContext().settings?.hideChatAvatars
            });
        }, 500);
    });
}

init();
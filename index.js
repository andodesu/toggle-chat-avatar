import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

function log(msg, data) {
    console.log(`[EXT] ${msg}`, data ?? '');
}

function getMainSettingsCheckbox() {
    return document.querySelector('#hideChatAvatars, [name="hideChatAvatars"]');
}

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
    log('applyUiState', { state, bodyClass: document.body.classList.contains('hideChatAvatars') });
}

function addMagicWandToggle() {
    const context = getContext();
    log('=== CONTEXT OBJECT ===', context);
    log('typeof context:', typeof context);
    log('context keys:', Object.keys(context || {}));
    log('context.settings:', context?.settings);
    log('context.settings keys:', context?.settings ? Object.keys(context.settings) : 'undefined');

    // Also check window.SillyTavern
    log('window.SillyTavern:', window.SillyTavern);
    if (window.SillyTavern) {
        log('SillyTavern keys:', Object.keys(window.SillyTavern));
        log('SillyTavern.settings:', window.SillyTavern.settings);
        log('SillyTavern.settings keys:', window.SillyTavern.settings ? Object.keys(window.SillyTavern.settings) : 'undefined');
    }

    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) {
        log('extensionsMenu not found');
        return;
    }
    if (document.getElementById('toggle-chat-avatar-item')) {
        log('toggle already exists');
        return;
    }

    // Try to read from context.settings, then window.SillyTavern.settings, then body class
    let isHidden = false;
    if (context?.settings && typeof context.settings.hideChatAvatars !== 'undefined') {
        isHidden = context.settings.hideChatAvatars;
        log('read from context.settings', isHidden);
    } else if (window.SillyTavern?.settings && typeof window.SillyTavern.settings.hideChatAvatars !== 'undefined') {
        isHidden = window.SillyTavern.settings.hideChatAvatars;
        log('read from window.SillyTavern.settings', isHidden);
    } else {
        isHidden = document.body.classList.contains('hideChatAvatars');
        log('fallback to body class', isHidden);
    }

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
    log('mainCheck element:', mainCheck);
    if (mainCheck) {
        mainCheck.checked = isHidden;
        log('mainCheck.checked set to', isHidden);
    }

    // Store for console inspection
    window.__debug__ = { context, toggle, mainCheck, state: isHidden };

    // Extension toggle
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        log('Extension toggled to', newState);
        // Update all possible sources
        if (context?.settings) {
            context.settings.hideChatAvatars = newState;
            log('updated context.settings', newState);
        }
        if (window.SillyTavern?.settings) {
            window.SillyTavern.settings.hideChatAvatars = newState;
            log('updated window.SillyTavern.settings', newState);
        }
        applyUiState(newState);
        if (mainCheck) {
            mainCheck.checked = newState;
            mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
            log('dispatched change event on mainCheck');
        } else {
            log('mainCheck not found – cannot dispatch');
        }
        window.__debug__.state = newState;
    });

    // Main checkbox listener
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            log('Main checkbox changed to', newState);
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                if (context?.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                if (window.SillyTavern?.settings) {
                    window.SillyTavern.settings.hideChatAvatars = newState;
                }
                applyUiState(newState);
                log('synced extension toggle to', newState);
            }
        });
    }

    // Re-apply on CHAT_CHANGED
    eventSource.on(event_types.CHAT_CHANGED, () => {
        let currentState = false;
        if (context?.settings && typeof context.settings.hideChatAvatars !== 'undefined') {
            currentState = context.settings.hideChatAvatars;
        } else if (window.SillyTavern?.settings && typeof window.SillyTavern.settings.hideChatAvatars !== 'undefined') {
            currentState = window.SillyTavern.settings.hideChatAvatars;
        } else {
            currentState = document.body.classList.contains('hideChatAvatars');
        }
        log('CHAT_CHANGED re-apply', currentState);
        applyUiState(currentState);
        if (toggle.checked !== currentState) toggle.checked = currentState;
        if (mainCheck && mainCheck.checked !== currentState) mainCheck.checked = currentState;
    });

    log('Extension setup complete');
}

function init() {
    log('init waiting for APP_READY');
    eventSource.on(event_types.APP_READY, () => {
        log('APP_READY received');
        addMagicWandToggle();
        // After setup, log debug info
        setTimeout(() => {
            log('=== DEBUG STATE AFTER SETUP ===');
            log('context.settings.hideChatAvatars:', window.__debug__.context?.settings?.hideChatAvatars);
            log('toggle.checked:', window.__debug__.toggle?.checked);
            log('mainCheck?.checked:', window.__debug__.mainCheck?.checked);
            log('body class:', document.body.classList.contains('hideChatAvatars'));
        }, 500);
    });
}

init();
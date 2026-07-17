import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

function log(msg, data) {
    console.log(`[EXT] ${msg}`, data ?? '');
}

function inspectContext(obj, path = 'context') {
    if (!obj || typeof obj !== 'object') {
        log(`${path}: ${String(obj)} (${typeof obj})`);
        return;
    }
    const keys = Object.keys(obj);
    log(`${path} keys:`, keys);
    for (const key of keys) {
        const val = obj[key];
        if (typeof val === 'object' && val !== null) {
            if (key === 'settings') {
                log(`${path}.${key}:`, val);
                log(`${path}.${key} keys:`, Object.keys(val));
            } else if (typeof val === 'function') {
                log(`${path}.${key}: function`);
            } else {
                // Don't recursively log huge objects to avoid spam
                if (['chat', 'characters', 'groups', 'accountStorage'].includes(key)) {
                    log(`${path}.${key}: ${Array.isArray(val) ? `[${val.length}]` : 'object'}`);
                } else {
                    log(`${path}.${key}:`, val);
                }
            }
        } else {
            log(`${path}.${key}:`, val);
        }
    }
}

function inspectLocalStorage() {
    const allKeys = Object.keys(localStorage);
    log('localStorage keys:', allKeys);
    const relevant = allKeys.filter(k => /settings|hide|avatar/i.test(k));
    if (relevant.length) {
        for (const key of relevant) {
            log(`localStorage[${key}] =`, localStorage.getItem(key));
        }
    }
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
    log('=== CONTEXT OBJECT ===');
    inspectContext(context);

    // Also check window
    log('=== window.SillyTavern ===');
    if (window.SillyTavern) {
        inspectContext(window.SillyTavern, 'SillyTavern');
    }

    // Inspect localStorage
    inspectLocalStorage();

    // Determine current state: try to read from where?
    // We'll use body class for now, but we need to find the real source.
    const isHidden = document.body.classList.contains('hideChatAvatars');
    log('Using body class as state:', isHidden);

    applyUiState(isHidden);

    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) {
        log('extensionsMenu not found');
        return;
    }
    if (document.getElementById('toggle-chat-avatar-item')) {
        log('toggle already exists');
        return;
    }

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
    }

    // Debug object with dump method
    window.__debug__ = {
        context,
        toggle,
        mainCheck,
        state: isHidden,
        dump: function() {
            console.log('=== DEBUG DUMP ===');
            console.log('toggle.checked:', this.toggle?.checked);
            console.log('mainCheck?.checked:', this.mainCheck?.checked);
            console.log('body class:', document.body.classList.contains('hideChatAvatars'));
            console.log('context keys:', Object.keys(this.context || {}));
            // Try to find hideChatAvatars in any property
            for (const key of Object.keys(this.context || {})) {
                if (typeof this.context[key] === 'object' && this.context[key] !== null) {
                    if (key === 'settings') {
                        console.log(`context.${key}.hideChatAvatars:`, this.context[key]?.hideChatAvatars);
                    } else {
                        const val = this.context[key];
                        if (val && typeof val === 'object' && 'hideChatAvatars' in val) {
                            console.log(`context.${key}.hideChatAvatars:`, val.hideChatAvatars);
                        }
                    }
                }
            }
            console.log('localStorage keys:', Object.keys(localStorage));
            console.log('SillyTavern libs:', window.SillyTavern?.libs);
        }
    };

    // Extension toggle
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        log('Extension toggled to', newState);
        // Try to update context if settings exist
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
            log('updated context.settings', newState);
        }
        // If not, try other properties
        for (const key of Object.keys(context)) {
            if (typeof context[key] === 'object' && context[key] !== null) {
                if (key === 'settings') continue; // already tried
                if ('hideChatAvatars' in context[key]) {
                    context[key].hideChatAvatars = newState;
                    log(`updated context.${key}.hideChatAvatars`, newState);
                }
            }
        }
        applyUiState(newState);
        if (mainCheck) {
            mainCheck.checked = newState;
            mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
            log('dispatched change event on mainCheck');
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
                // Update any possible source
                if (context.settings) context.settings.hideChatAvatars = newState;
                applyUiState(newState);
                log('synced extension toggle to', newState);
            }
        });
    }

    // Re-apply on CHAT_CHANGED
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = document.body.classList.contains('hideChatAvatars');
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
        setTimeout(() => {
            window.__debug__.dump();
        }, 500);
    });
}

init();
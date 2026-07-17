import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

function log(msg, data) {
    console.log(`[EXT] ${msg}`, data ?? '');
}

function getMainSettingsCheckbox() {
    // Try multiple selectors
    let el = document.querySelector('#hideChatAvatars, [name="hideChatAvatars"], input[type="checkbox"][value*="hideChatAvatars"]');
    if (el) return el;
    // Fallback: search all checkboxes by label text
    const all = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of all) {
        const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
        if (label && label.textContent.includes('Hide Chat Avatars')) {
            return cb;
        }
        // Also check parent label if wrapped
        if (cb.parentElement && cb.parentElement.tagName === 'LABEL' && cb.parentElement.textContent.includes('Hide Chat Avatars')) {
            return cb;
        }
    }
    return null;
}

function addMagicWandToggle() {
    const context = getContext();
    log('=== CONTEXT OBJECT ===');

    // Inspect powerUserSettings
    log('context.powerUserSettings:', context.powerUserSettings);
    if (context.powerUserSettings) {
        log('powerUserSettings keys:', Object.keys(context.powerUserSettings));
        // Look for hideChatAvatars keys
        for (const key of Object.keys(context.powerUserSettings)) {
            if (/hide|avatar|chat/i.test(key)) {
                log(`powerUserSettings.${key} =`, context.powerUserSettings[key]);
            }
        }
    }

    // Also check if there's a 'settings' property in any other place
    for (const key of Object.keys(context)) {
        if (typeof context[key] === 'object' && context[key] !== null && key !== 'powerUserSettings') {
            const obj = context[key];
            if (typeof obj === 'object' && 'hideChatAvatars' in obj) {
                log(`context.${key}.hideChatAvatars =`, obj.hideChatAvatars);
            }
        }
    }

    const isHidden = document.body.classList.contains('hideChatAvatars');
    log('Body class state:', isHidden);

    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) { log('extensionsMenu not found'); return; }
    if (document.getElementById('toggle-chat-avatar-item')) { log('toggle exists'); return; }

    // Create toggle
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
    } else {
        log('mainCheck not found – will try to locate later');
    }

    // Store for debugging
    window.__debug__ = { context, toggle, mainCheck, state: isHidden };

    // Toggle handler
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        log('Extension toggled to', newState);
        // Try to update powerUserSettings (if it has a relevant key)
        if (context.powerUserSettings) {
            // Try common key names
            const possibleKeys = ['hideChatAvatars', 'hideChatAvatars_enabled', 'hideChatAvatarsEnabled'];
            for (const key of possibleKeys) {
                if (key in context.powerUserSettings) {
                    context.powerUserSettings[key] = newState;
                    log(`Updated powerUserSettings.${key} =`, newState);
                }
            }
        }
        applyUiState(newState);
        if (mainCheck) {
            mainCheck.checked = newState;
            mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
        }
        window.__debug__.state = newState;
    });

    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            log('Main checkbox changed to', newState);
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                applyUiState(newState);
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

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
    log('applyUiState', { state, bodyClass: document.body.classList.contains('hideChatAvatars') });
}

function init() {
    log('init waiting for APP_READY');
    eventSource.on(event_types.APP_READY, () => {
        log('APP_READY received');
        addMagicWandToggle();
        setTimeout(() => {
            if (window.__debug__) {
                console.log('=== DEBUG DUMP ===');
                console.log('toggle.checked:', window.__debug__.toggle?.checked);
                console.log('mainCheck:', window.__debug__.mainCheck);
                console.log('mainCheck?.checked:', window.__debug__.mainCheck?.checked);
                console.log('body class:', document.body.classList.contains('hideChatAvatars'));
                console.log('powerUserSettings:', window.__debug__.context?.powerUserSettings);
                // Check if any key in powerUserSettings matches hideChat
                const pus = window.__debug__.context?.powerUserSettings;
                if (pus) {
                    for (const k of Object.keys(pus)) {
                        if (/hide|avatar|chat/i.test(k)) {
                            console.log(`powerUserSettings.${k} =`, pus[k]);
                        }
                    }
                }
            }
        }, 500);
    });
}

init();
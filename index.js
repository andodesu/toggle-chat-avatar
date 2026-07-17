import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

let mainCheckboxCache = null;
let debugCounter = 0;

function log(step, data) {
    console.log(`[DEBUG ${++debugCounter}] ${step}:`, data);
}

function getMainSettingsCheckbox() {
    if (mainCheckboxCache) return mainCheckboxCache;

    let checkbox = document.querySelector('#hideChatAvatars');
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
    log('applyHideChatAvatars called', { state, bodyClass: document.body.classList.contains('hideChatAvatars') });
    document.body.classList.toggle('hideChatAvatars', state);
    document.querySelectorAll('.mes .avatar').forEach(avatar => {
        avatar.style.display = state ? 'none' : '';
    });
}

function addMagicWandToggle() {
    log('addMagicWandToggle started');
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) {
        log('extensionsMenu not found, aborting');
        return;
    }
    if (document.getElementById('toggle-chat-avatar-item')) {
        log('toggle already exists, aborting');
        return;
    }

    // Log current state from both sources
    const settingsState = context.settings?.hideChatAvatars;
    const powerUserState = window.power_user?.hideChatAvatars_enabled;
    log('Initial states', { settingsState, powerUserState });

    const isHidden = settingsState || false;
    log('Using isHidden', isHidden);

    // Apply (this will toggle the UI)
    applyHideChatAvatars(isHidden);

    // Create menu item
    const menuItem = document.createElement('div');
    menuItem.id = 'toggle-chat-avatar-item';
    menuItem.className = 'list-group-item flex-container flexGap5';
    menuItem.style.cursor = 'pointer';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = 'toggle-chat-avatar-checkbox';
    toggle.checked = isHidden;
    log('Extension checkbox set to', toggle.checked);

    const label = document.createElement('label');
    label.htmlFor = 'toggle-chat-avatar-checkbox';
    label.textContent = 'Hide Chat Avatars';
    label.style.margin = '0';
    label.style.cursor = 'pointer';

    menuItem.appendChild(toggle);
    menuItem.appendChild(label);
    extensionsMenu.appendChild(menuItem);

    // Sync main checkbox silently
    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
        log('Main checkbox set to', mainCheck.checked);
    } else {
        log('Main checkbox NOT found');
    }

    // Log after setting checkboxes
    log('After initial sync', {
        extChecked: toggle.checked,
        mainChecked: mainCheck ? mainCheck.checked : 'N/A',
        bodyClass: document.body.classList.contains('hideChatAvatars'),
        settingsState: context.settings?.hideChatAvatars,
        powerUserState: window.power_user?.hideChatAvatars_enabled
    });

    // Extension toggle → update
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        log('Extension toggle changed', newState);
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        applyHideChatAvatars(newState);
        if (context.saveSettings) {
            context.saveSettings();
        }
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // Main checkbox → update our toggle
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            log('Main checkbox changed', newState);
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                applyHideChatAvatars(newState);
            }
        });
    }

    // Re-apply after messages
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.settings?.hideChatAvatars ?? false;
        log('CHAT_CHANGED event', currentState);
        applyHideChatAvatars(currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    setTimeout(() => {
        const currentState = context.settings?.hideChatAvatars ?? false;
        log('setTimeout (300ms) re-apply', currentState);
        applyHideChatAvatars(currentState);
    }, 300);

    log('addMagicWandToggle finished');
}

function init() {
    log('init called');
    eventSource.on(event_types.APP_READY, () => {
        log('APP_READY event received');
        addMagicWandToggle();
    });
    // Also try to run immediately if already ready
    if (document.body.classList.contains('ready') || document.getElementById('extensionsMenu')) {
        log('App already ready, calling addMagicWandToggle directly');
        addMagicWandToggle();
    }
}

init();
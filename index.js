import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar'; // Updated to match the name

let mainCheckboxCache = null;

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

function applyUsingCore(state) {
    if (window.power_user) {
        window.power_user.hideChatAvatars_enabled = state;
    }
    if (typeof window.switchHideChatAvatars === 'function') {
        window.switchHideChatAvatars();
    } else {
        document.body.classList.toggle('hideChatAvatars', state);
        const avatars = document.querySelectorAll('.mes .avatar');
        avatars.forEach(avatar => {
            avatar.style.display = state ? 'none' : '';
        });
    }
}

function syncMainCheckbox(state) {
    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck && mainCheck.checked !== state) {
        mainCheck.checked = state;
        mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    const isHidden = window.power_user?.hideChatAvatars_enabled ?? false;
    applyUsingCore(isHidden);

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

    toggle.addEventListener('change', function() {
        const newState = this.checked;
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        applyUsingCore(newState);
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        } else if (context.saveSettings) {
            context.saveSettings();
        }
        syncMainCheckbox(newState);
    });

    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
            }
        });
    }

    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = window.power_user?.hideChatAvatars_enabled ?? false;
        applyUsingCore(currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    setTimeout(() => {
        const currentState = window.power_user?.hideChatAvatars_enabled ?? false;
        applyUsingCore(currentState);
    }, 300);
}

function init() {
    const isReady = document.body.classList.contains('ready') || document.getElementById('extensionsMenu');
    if (isReady) {
        addMagicWandToggle();
    } else {
        eventSource.on(event_types.APP_READY, addMagicWandToggle);
    }
}

init();
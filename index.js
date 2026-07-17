import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

let mainCheckboxCache = null;

function getMainSettingsCheckbox() {
    if (mainCheckboxCache) return mainCheckboxCache;

    let checkbox = document.querySelector('#hideChatAvatars');
    if (checkbox) {
        mainCheckboxCache = checkbox;
        return checkbox;
    }

    // Fallback: search by label text
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

function updateCore(state) {
    if (window.power_user) {
        window.power_user.hideChatAvatars_enabled = state;
    }
    if (typeof window.switchHideChatAvatars === 'function') {
        window.switchHideChatAvatars();
    } else {
        // Fallback in case the core function is missing
        document.body.classList.toggle('hideChatAvatars', state);
        document.querySelectorAll('.mes .avatar').forEach(avatar => {
            avatar.style.display = state ? 'none' : '';
        });
    }
    if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    } else {
        // Fallback save
        const context = getContext();
        if (context.saveSettings) context.saveSettings();
    }
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // --- Read current state from the core's variable ---
    const isHidden = window.power_user?.hideChatAvatars_enabled ?? false;

    // --- Create our extension menu item ---
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

    // --- Sync the main Settings checkbox (silently, no event) ---
    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // --- Extension toggle → update core and main checkbox ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        updateCore(newState);
        // Update main checkbox without dispatching a 'change' event
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // --- Main checkbox → update our toggle ---
    // The core's own handler already updates power_user and calls switchHideChatAvatars.
    // We only need to reflect the change in our toggle.
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                // No need to call updateCore again – the core already handled it.
            }
        });
    }
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
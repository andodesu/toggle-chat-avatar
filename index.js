import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const STORAGE_KEY = 'hideChatAvatarsState';

let mainCheckboxCache = null;

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

function getStoredState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    // Fallback: read from the body class (if the core already applied it)
    return document.body.classList.contains('hideChatAvatars');
}

function setStoredState(state) {
    localStorage.setItem(STORAGE_KEY, String(state));
}

function applyHideChatAvatars(state) {
    document.body.classList.toggle('hideChatAvatars', state);
    document.querySelectorAll('.mes .avatar').forEach(avatar => {
        avatar.style.display = state ? 'none' : '';
    });
    setStoredState(state);
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read saved state
    const isHidden = getStoredState();

    // Apply to UI
    applyHideChatAvatars(isHidden);

    // Sync context.settings (if available) – optional but keeps things consistent
    if (context.settings) {
        context.settings.hideChatAvatars = isHidden;
    }

    // Create our menu item
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

    // Sync main checkbox silently
    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // --- Extension toggle → update everything ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        applyHideChatAvatars(newState);
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        // Try to save via core if available (just in case)
        if (context.saveSettings) {
            context.saveSettings();
        }
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // --- Main checkbox → update our toggle ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                applyHideChatAvatars(newState);
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                // The core's own handler saves, so we don't double-save here
            }
        });
    }

    // --- Re‑apply after messages render (fixes late‑loaded avatars) ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = getStoredState();
        applyHideChatAvatars(currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    // Safety net: re‑apply after a short delay
    setTimeout(() => {
        const currentState = getStoredState();
        applyHideChatAvatars(currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    }, 300);
}

function init() {
    // Only run after the app is ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
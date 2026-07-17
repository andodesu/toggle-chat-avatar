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

function getCurrentState() {
    const context = getContext();

    // 1. Read from core's settings object (most authoritative)
    if (context.settings && typeof context.settings.hideChatAvatars !== 'undefined') {
        return context.settings.hideChatAvatars;
    }

    // 2. Fallback to localStorage (our own persistence)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
        return stored === 'true';
    }

    // 3. Fallback to body class (if core already applied it)
    return document.body.classList.contains('hideChatAvatars');
}

function setCurrentState(state) {
    const context = getContext();

    // 1. Update core settings object
    if (context.settings) {
        context.settings.hideChatAvatars = state;
    }

    // 2. Store in localStorage (backup persistence)
    localStorage.setItem(STORAGE_KEY, String(state));

    // 3. Apply to UI (body class + avatars)
    document.body.classList.toggle('hideChatAvatars', state);
    document.querySelectorAll('.mes .avatar').forEach(avatar => {
        avatar.style.display = state ? 'none' : '';
    });

    // 4. Try to save via core's save function if available
    if (context.saveSettings) {
        context.saveSettings();
    }
    // Also try the debounced version if it exists globally (unlikely but safe)
    if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    }
}

function applyHideChatAvatars(state) {
    // Just apply UI (the state is already set via setCurrentState)
    document.body.classList.toggle('hideChatAvatars', state);
    document.querySelectorAll('.mes .avatar').forEach(avatar => {
        avatar.style.display = state ? 'none' : '';
    });
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read current state (from core settings, localStorage, or body class)
    const isHidden = getCurrentState();

    // Ensure all sources are consistent (setCurrentState will update everything)
    setCurrentState(isHidden);

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

    // --- Extension toggle → update core and localStorage ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        setCurrentState(newState); // updates settings, localStorage, UI, and saves
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
                setCurrentState(newState);
                // The core's own handler already saved, but we also update localStorage
                // and ensure the UI reflects it (setCurrentState does that)
            }
        });
    }

    // --- Re-apply after messages render (fixes late-loaded avatars) ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = getCurrentState();
        applyHideChatAvatars(currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    // Safety net
    setTimeout(() => {
        const currentState = getCurrentState();
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
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
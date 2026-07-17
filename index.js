import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

let mainCheckboxCache = null;

function getMainSettingsCheckbox() {
    if (mainCheckboxCache) return mainCheckboxCache;

    // Try common IDs
    let checkbox = document.querySelector('#hideChatAvatars, [name="hideChatAvatars"]');
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

function getCurrentState() {
    // 1. Try the core's power_user variable (the source of truth)
    if (window.power_user && typeof window.power_user.hideChatAvatars_enabled !== 'undefined') {
        return window.power_user.hideChatAvatars_enabled;
    }
    // 2. Try context.settings (fallback)
    const context = getContext();
    if (context.settings && typeof context.settings.hideChatAvatars !== 'undefined') {
        return context.settings.hideChatAvatars;
    }
    // 3. Try SillyTavern global (if available)
    if (window.SillyTavern?.settings && typeof window.SillyTavern.settings.hideChatAvatars !== 'undefined') {
        return window.SillyTavern.settings.hideChatAvatars;
    }
    // Default
    return false;
}

function setCurrentState(state) {
    // Update all possible sources to stay consistent
    const context = getContext();
    if (window.power_user) {
        window.power_user.hideChatAvatars_enabled = state;
    }
    if (context.settings) {
        context.settings.hideChatAvatars = state;
    }
    if (window.SillyTavern?.settings) {
        window.SillyTavern.settings.hideChatAvatars = state;
    }
}

function applyHideChatAvatars(state) {
    // Use the core's function if available
    if (typeof window.switchHideChatAvatars === 'function') {
        // Ensure power_user is set before calling
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = state;
        }
        window.switchHideChatAvatars();
    } else {
        // Fallback: toggle class and style
        document.body.classList.toggle('hideChatAvatars', state);
        document.querySelectorAll('.mes .avatar').forEach(avatar => {
            avatar.style.display = state ? 'none' : '';
        });
    }
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read current state (now after APP_READY)
    const isHidden = getCurrentState();

    // Apply to UI
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

    // Extension toggle → update all
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        setCurrentState(newState);
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
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                setCurrentState(newState);
                applyHideChatAvatars(newState);
                // Core saves automatically via its own handler
            }
        });
    }

    // Re-apply after messages render (fixes visibility on refresh)
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = getCurrentState();
        applyHideChatAvatars(currentState);
        // Sync checkboxes
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    // Safety net: re-apply after a short delay
    setTimeout(() => {
        const currentState = getCurrentState();
        applyHideChatAvatars(currentState);
    }, 300);
}

function init() {
    // Only run after the app is fully ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
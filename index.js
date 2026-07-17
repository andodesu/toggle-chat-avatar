import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

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

function applyHideChatAvatars(state) {
    // Use the core's function if available
    if (typeof window.switchHideChatAvatars === 'function') {
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = state;
        }
        window.switchHideChatAvatars();
    } else {
        // Fallback: toggle class and style directly
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

    // --- Read the current state from the body class (core's UI indicator) ---
    const isHidden = document.body.classList.contains('hideChatAvatars');

    // --- Ensure power_user and context.settings match the body class ---
    if (window.power_user) {
        window.power_user.hideChatAvatars_enabled = isHidden;
    }
    if (context.settings) {
        context.settings.hideChatAvatars = isHidden;
    }

    // --- Apply the state (should already be applied, but ensure it) ---
    applyHideChatAvatars(isHidden);

    // --- Create our menu item ---
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

    // --- Sync main checkbox silently ---
    const mainCheck = getMainSettingsCheckbox();
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // --- Listener: Extension toggle → update core exactly like the main checkbox ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;

        // 1. Update power_user (core's source of truth)
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        // 2. Update context.settings (for other parts)
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        // 3. Apply UI change (calls switchHideChatAvatars)
        applyHideChatAvatars(newState);
        // 4. Save using the core's debounced save (or fallback)
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
        } else if (context.saveSettings) {
            context.saveSettings();
        }
        // 5. Sync main checkbox (silent)
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // --- Listener: Main checkbox → update our toggle ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                // The core already updated power_user and called switchHideChatAvatars,
                // but we also need to update context.settings for consistency.
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                // No need to save here; core's handler already did.
            }
        });
    }

    // --- Re-apply after messages render (handles late-loaded avatars) ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        if (context.settings) {
            context.settings.hideChatAvatars = currentState;
        }
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    // Safety net: re-apply after a short delay
    setTimeout(() => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        if (context.settings) {
            context.settings.hideChatAvatars = currentState;
        }
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    }, 300);
}

function init() {
    // Only run after app is fully ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
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
    // Update the core's power_user variable
    if (window.power_user) {
        window.power_user.hideChatAvatars_enabled = state;
    }
    // Use the core's built-in function to apply the UI change
    if (typeof window.switchHideChatAvatars === 'function') {
        window.switchHideChatAvatars();
    } else {
        // Fallback: toggle class and style directly
        document.body.classList.toggle('hideChatAvatars', state);
        document.querySelectorAll('.mes .avatar').forEach(avatar => {
            avatar.style.display = state ? 'none' : '';
        });
    }
}

function saveSettings() {
    // Use the core's debounced save if available, otherwise fallback to context.saveSettings
    if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    } else {
        const context = getContext();
        if (context.saveSettings) {
            context.saveSettings();
        }
    }
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read the current state from the body's class (the core's UI indicator)
    const isHidden = document.body.classList.contains('hideChatAvatars');

    // Ensure context.settings and power_user are in sync
    if (context.settings) {
        context.settings.hideChatAvatars = isHidden;
    }
    if (window.power_user) {
        window.power_user.hideChatAvatars_enabled = isHidden;
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

    // --- Listener: Extension toggle → mimic core's handler ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        // 1. Update power_user (core's source of truth)
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        // 2. Update context.settings for compatibility
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
        }
        // 3. Apply UI change using core's function
        if (typeof window.switchHideChatAvatars === 'function') {
            window.switchHideChatAvatars();
        } else {
            document.body.classList.toggle('hideChatAvatars', newState);
            document.querySelectorAll('.mes .avatar').forEach(avatar => {
                avatar.style.display = newState ? 'none' : '';
            });
        }
        // 4. Save using core's debounced save (exactly like the core checkbox does)
        saveSettings();
        // 5. Sync main checkbox (silent, but its change event will fire if we set checked? 
        // We set it without dispatching a change event to avoid loops)
        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // --- Listener: Main checkbox → update our toggle (but don't save again) ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                // The core's own handler has already updated power_user, applied UI, and saved.
                // We just sync our toggle and context.settings.
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
            }
        });
    }

    // --- Re-apply after messages render (catches late-loaded avatars) ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        // Keep our toggle in sync
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
        // Update context.settings to match (if needed)
        if (context.settings) {
            context.settings.hideChatAvatars = currentState;
        }
    });

    // Safety net: re-apply after a short delay
    setTimeout(() => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
        if (context.settings) {
            context.settings.hideChatAvatars = currentState;
        }
    }, 300);
}

function init() {
    // Only run after app is fully ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
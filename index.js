import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

function getMainSettingsCheckbox() {
    return document.querySelector('#hideChatAvatarsEnabled');
}

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
}

function findSaveMethod(context) {
    // Search for a save function on the context
    for (const key of Object.keys(context)) {
        const val = context[key];
        if (typeof val === 'function' && /save/i.test(key)) {
            console.log(`[EXT] Found save method: context.${key}`);
            return val;
        }
    }
    // Also check window
    if (typeof window.saveSettingsDebounced === 'function') {
        console.log('[EXT] Found saveSettingsDebounced on window');
        return window.saveSettingsDebounced;
    }
    return null;
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read from core's powerUserSettings
    const isHidden = context.powerUserSettings?.hideChatAvatars_enabled ?? false;
    applyUiState(isHidden);

    // Create extension menu item
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

    // Find save method once
    const saveMethod = findSaveMethod(context);
    if (saveMethod) {
        console.log('[EXT] Save method available:', saveMethod);
    } else {
        console.warn('[EXT] No save method found – will rely on main checkbox events');
    }

    // --- Extension toggle ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        console.log('[EXT] Toggling to', newState);

        // 1. Update powerUserSettings
        if (context.powerUserSettings) {
            context.powerUserSettings.hideChatAvatars_enabled = newState;
        }

        // 2. Apply UI
        applyUiState(newState);

        // 3. Sync main checkbox
        if (mainCheck) {
            mainCheck.checked = newState;
            // Dispatch multiple events to ensure core handlers fire
            mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
            mainCheck.dispatchEvent(new Event('input', { bubbles: true }));
            mainCheck.dispatchEvent(new Event('click', { bubbles: true }));
            console.log('[EXT] Dispatched events on main checkbox');
        }

        // 4. If we found a save method, call it directly
        if (saveMethod) {
            try {
                saveMethod();
                console.log('[EXT] Called save method directly');
            } catch (e) {
                console.warn('[EXT] Save method call failed:', e);
            }
        }

        // Log state after toggle
        console.log('[EXT] After toggle - powerUserSettings.hideChatAvatars_enabled:', context.powerUserSettings?.hideChatAvatars_enabled);
    });

    // --- Main checkbox → sync back ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            console.log('[EXT] Main checkbox changed to', newState);
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                applyUiState(newState);
            }
        });
    }

    // --- Re-apply on CHAT_CHANGED ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.powerUserSettings?.hideChatAvatars_enabled ?? false;
        applyUiState(currentState);
        if (toggle.checked !== currentState) toggle.checked = currentState;
        if (mainCheck && mainCheck.checked !== currentState) mainCheck.checked = currentState;
    });

    console.log('[EXT] Extension setup complete');
}

function init() {
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
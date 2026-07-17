import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
}

// Save methods to test
const saveMethods = {
    'window.saveSettingsDebounced': () => {
        if (typeof window.saveSettingsDebounced === 'function') {
            window.saveSettingsDebounced();
            return true;
        }
        return false;
    },
    'context.saveSettingsDebounced': (context) => {
        if (typeof context.saveSettingsDebounced === 'function') {
            context.saveSettingsDebounced();
            return true;
        }
        return false;
    },
    'context.saveSettings': (context) => {
        if (typeof context.saveSettings === 'function') {
            context.saveSettings();
            return true;
        }
        return false;
    }
};

function testSaveMethods(context) {
    const results = {};
    for (const [name, fn] of Object.entries(saveMethods)) {
        try {
            const result = fn(context);
            results[name] = result ? 'success' : 'method not found';
        } catch (e) {
            results[name] = `error: ${e.message}`;
        }
    }
    console.log('[EXT] Save method test results:', results);
    return results;
}

function saveSettings(context, methodName) {
    if (methodName) {
        const fn = saveMethods[methodName];
        if (fn) {
            try {
                const result = fn(context);
                if (result) {
                    console.log(`[EXT] Saved using ${methodName}`);
                    return;
                }
            } catch (e) {
                console.warn(`[EXT] ${methodName} failed:`, e);
            }
        }
    }
    // Fallback: try all in order
    for (const [name, fn] of Object.entries(saveMethods)) {
        try {
            const result = fn(context);
            if (result) {
                console.log(`[EXT] Saved using ${name} (fallback)`);
                return;
            }
        } catch (e) {
            // ignore
        }
    }
    console.warn('[EXT] No save method worked!');
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu || document.getElementById('toggle-chat-avatar-item')) return;

    const isHidden = context.powerUserSettings?.hideChatAvatars_enabled ?? false;
    applyUiState(isHidden);

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

    const mainCheck = document.querySelector('#hideChatAvatarsEnabled');
    if (mainCheck) {
        mainCheck.checked = isHidden;
    }

    // Test save methods on load (optional)
    console.log('[EXT] Testing save methods on load...');
    testSaveMethods(context);

    // --- Extension toggle ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;

        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        if (context.powerUserSettings) {
            context.powerUserSettings.hideChatAvatars_enabled = newState;
        }

        applyUiState(newState);

        if (typeof window.switchHideChatAvatars === 'function') {
            window.switchHideChatAvatars();
        }

        // Try to save with the first method that worked on load (we'll store it)
        if (window.__saveMethod) {
            saveSettings(context, window.__saveMethod);
        } else {
            // Auto-detect
            saveSettings(context);
        }

        if (mainCheck) {
            mainCheck.checked = newState;
        }
    });

    // --- Main checkbox sync ---
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                applyUiState(newState);
            }
        });
    }

    // --- Re-apply after messages ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.powerUserSettings?.hideChatAvatars_enabled ?? false;
        applyUiState(currentState);
        if (toggle.checked !== currentState) toggle.checked = currentState;
        if (mainCheck && mainCheck.checked !== currentState) mainCheck.checked = currentState;
    });

    // After load, detect which save method works and store it
    setTimeout(() => {
        const results = testSaveMethods(context);
        // Find the first successful method
        for (const [name, status] of Object.entries(results)) {
            if (status === 'success') {
                window.__saveMethod = name;
                console.log(`[EXT] Using save method: ${name}`);
                break;
            }
        }
    }, 1000);
}

function init() {
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
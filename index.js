import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

let toggleElement = null;
let mainCheckListener = null;
let mutationObserver = null;
let chatContainer = null;

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
}

function findMainCheckbox() {
    // Search by label text (more robust than ID)
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of allCheckboxes) {
        const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
        if (label && label.textContent.includes('Hide Chat Avatars')) {
            return cb;
        }
        // Some checkboxes wrap in label
        if (cb.parentElement?.tagName === 'LABEL' && cb.parentElement.textContent.includes('Hide Chat Avatars')) {
            return cb;
        }
    }
    // Fallback to ID (just in case)
    return document.querySelector('#hideChatAvatarsEnabled');
}

function updateMainCheckbox(state) {
    const mainCheck = findMainCheckbox();
    if (mainCheck) {
        mainCheck.checked = state;
    }
}

function saveSettings() {
    if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    }
}

function applyCoreUi(state) {
    if (window.power_user) {
        window.power_user.hideChatAvatars_enabled = state;
    }
    if (typeof window.switchHideChatAvatars === 'function') {
        window.switchHideChatAvatars();
    }
    applyUiState(state);
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu || document.getElementById('toggle-chat-avatar-item')) return;

    // Read from the core's single source
    const isHidden = window.power_user?.hideChatAvatars_enabled ?? false;
    applyCoreUi(isHidden);

    // Create menu item
    const menuItem = document.createElement('div');
    menuItem.id = 'toggle-chat-avatar-item';
    menuItem.className = 'list-group-item flex-container flexGap5';
    menuItem.style.cursor = 'pointer';

    toggleElement = document.createElement('input');
    toggleElement.type = 'checkbox';
    toggleElement.id = 'toggle-chat-avatar-checkbox';
    toggleElement.checked = isHidden;

    const label = document.createElement('label');
    label.htmlFor = 'toggle-chat-avatar-checkbox';
    label.textContent = 'Hide Chat Avatars';
    label.style.margin = '0';
    label.style.cursor = 'pointer';

    menuItem.appendChild(toggleElement);
    menuItem.appendChild(label);
    extensionsMenu.appendChild(menuItem);

    // Sync main checkbox silently
    updateMainCheckbox(isHidden);

    // --- Extension toggle ---
    toggleElement.addEventListener('change', function() {
        const newState = this.checked;
        // Update core
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = newState;
        }
        // Apply UI
        applyCoreUi(newState);
        // Save
        saveSettings();
        // Sync main checkbox
        updateMainCheckbox(newState);
    });

    // --- Main checkbox → sync back (using robust finder) ---
    const mainCheck = findMainCheckbox();
    if (mainCheck) {
        // Store listener reference for cleanup
        mainCheckListener = function() {
            const newState = this.checked;
            if (toggleElement && toggleElement.checked !== newState) {
                toggleElement.checked = newState;
                applyCoreUi(newState);
            }
        };
        mainCheck.addEventListener('change', mainCheckListener);
    }

    // --- MutationObserver on chat container (replaces CHAT_CHANGED) ---
    chatContainer = document.getElementById('chat');
    if (chatContainer) {
        mutationObserver = new MutationObserver(() => {
            const currentState = window.power_user?.hideChatAvatars_enabled ?? false;
            // Only re-apply if the UI is out of sync
            if (document.body.classList.contains('hideChatAvatars') !== currentState) {
                applyCoreUi(currentState);
            }
            // Also sync checkboxes (in case they drifted)
            if (toggleElement && toggleElement.checked !== currentState) {
                toggleElement.checked = currentState;
            }
            updateMainCheckbox(currentState);
        });
        mutationObserver.observe(chatContainer, {
            childList: true,
            subtree: true,
        });
    }

    // --- Also keep CHAT_CHANGED as a fallback (but the observer is primary) ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = window.power_user?.hideChatAvatars_enabled ?? false;
        applyCoreUi(currentState);
        if (toggleElement && toggleElement.checked !== currentState) {
            toggleElement.checked = currentState;
        }
        updateMainCheckbox(currentState);
    });
}

function cleanup() {
    // Remove main checkbox listener
    const mainCheck = findMainCheckbox();
    if (mainCheck && mainCheckListener) {
        mainCheck.removeEventListener('change', mainCheckListener);
        mainCheckListener = null;
    }
    // Disconnect MutationObserver
    if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
    }
    // Remove our DOM element (optional, but if the extension is re-enabled it will be recreated)
    const ourItem = document.getElementById('toggle-chat-avatar-item');
    if (ourItem) {
        ourItem.remove();
    }
    // Remove global references
    toggleElement = null;
    chatContainer = null;
}

function init() {
    // Clean up previous instance if any (in case of hot reload)
    cleanup();

    eventSource.on(event_types.APP_READY, () => {
        addMagicWandToggle();
        // Register cleanup on page unload (optional)
        window.addEventListener('beforeunload', cleanup);
    });
}

init();
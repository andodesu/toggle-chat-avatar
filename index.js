import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

const MODULE_NAME = 'toggle-chat-avatar';

let mainCheckbox = null;
let extensionToggle = null;
let observer = null;

function getMainSettingsCheckbox() {
    // Try to find the checkbox in the DOM
    let checkbox = document.querySelector('#hideChatAvatars, [name="hideChatAvatars"]');
    if (checkbox) return checkbox;

    // Fallback: search by label text
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const el of allCheckboxes) {
        const label = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
        if (label && label.textContent.includes('Hide Chat Avatars')) {
            return el;
        }
    }
    return null;
}

function applyHideChatAvatars(state) {
    // Use the core's functions if available
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

function saveSetting() {
    if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    } else {
        const context = getContext();
        if (context.saveSettings) {
            context.saveSettings();
        }
    }
}

function syncExtensionToggle(state) {
    if (extensionToggle && extensionToggle.checked !== state) {
        extensionToggle.checked = state;
    }
}

function handleMainCheckboxChange() {
    // When the main checkbox changes, sync our toggle
    if (mainCheckbox) {
        const state = mainCheckbox.checked;
        syncExtensionToggle(state);
        // Also ensure internal state is consistent (optional)
        const context = getContext();
        if (context.settings) {
            context.settings.hideChatAvatars = state;
        }
        if (window.power_user) {
            window.power_user.hideChatAvatars_enabled = state;
        }
    }
}

function setupMainCheckboxListener() {
    if (mainCheckbox) {
        // Remove any previous listener to avoid duplicates
        mainCheckbox.removeEventListener('change', handleMainCheckboxChange);
        mainCheckbox.addEventListener('change', handleMainCheckboxChange);
        // Also sync initial state
        syncExtensionToggle(mainCheckbox.checked);
    }
}

function waitForMainCheckbox() {
    // Check if it already exists
    mainCheckbox = getMainSettingsCheckbox();
    if (mainCheckbox) {
        setupMainCheckboxListener();
        return;
    }

    // Otherwise, observe the DOM for changes
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
        const found = getMainSettingsCheckbox();
        if (found) {
            mainCheckbox = found;
            setupMainCheckboxListener();
            observer.disconnect();
            observer = null;
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function addMagicWandToggle() {
    const context = getContext();
    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return;
    if (document.getElementById('toggle-chat-avatar-item')) return;

    // Read the actual state from the body class (core's UI indicator)
    const isHidden = document.body.classList.contains('hideChatAvatars');

    // Ensure internal state matches the UI
    if (window.power_user) {
        window.power_user.hideChatAvatars_enabled = isHidden;
    }
    if (context.settings) {
        context.settings.hideChatAvatars = isHidden;
    }

    // Create our extension menu item
    const menuItem = document.createElement('div');
    menuItem.id = 'toggle-chat-avatar-item';
    menuItem.className = 'list-group-item flex-container flexGap5';
    menuItem.style.cursor = 'pointer';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = 'toggle-chat-avatar-checkbox';
    toggle.checked = isHidden;
    extensionToggle = toggle;

    const label = document.createElement('label');
    label.htmlFor = 'toggle-chat-avatar-checkbox';
    label.textContent = 'Hide Chat Avatars';
    label.style.margin = '0';
    label.style.cursor = 'pointer';

    menuItem.appendChild(toggle);
    menuItem.appendChild(label);
    extensionsMenu.appendChild(menuItem);

    // Start waiting for the main checkbox to appear
    waitForMainCheckbox();

    // --- Extension toggle listener ---
    toggle.addEventListener('change', function() {
        const newState = this.checked;

        // If the main checkbox exists, simulate a change on it
        if (mainCheckbox) {
            mainCheckbox.checked = newState;
            // Dispatch a 'change' event so the core's handler runs
            mainCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            // The core will update power_user, call switchHideChatAvatars, and save.
            // Our listener on the main checkbox will sync the extension toggle.
        } else {
            // Fallback: update manually (if main checkbox not yet found)
            applyHideChatAvatars(newState);
            if (context.settings) {
                context.settings.hideChatAvatars = newState;
            }
            saveSetting();
        }
    });

    // --- Re-apply after messages render (handles late-loaded avatars) ---
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        if (context.settings) {
            context.settings.hideChatAvatars = currentState;
        }
        syncExtensionToggle(currentState);
        if (mainCheckbox && mainCheckbox.checked !== currentState) {
            mainCheckbox.checked = currentState;
        }
    });

    // Safety net: re-apply after a short delay
    setTimeout(() => {
        const currentState = document.body.classList.contains('hideChatAvatars');
        if (context.settings) {
            context.settings.hideChatAvatars = currentState;
        }
        syncExtensionToggle(currentState);
        if (mainCheckbox && mainCheckbox.checked !== currentState) {
            mainCheckbox.checked = currentState;
        }
    }, 300);
}

function init() {
    // Only run after app is fully ready
    eventSource.on(event_types.APP_READY, addMagicWandToggle);
}

init();
import { getContext } from '/scripts/extensions.js';
import { eventSource, event_types } from '/script.js';

// Global debug object
window.__debug__ = {
    context: null,
    toggle: null,
    mainCheck: null,
    state: null,
};

let mainCheckboxCache = null;

function getMainSettingsCheckbox() {
    if (mainCheckboxCache) return mainCheckboxCache;
    const checkbox = document.querySelector('#hideChatAvatars, [name="hideChatAvatars"]');
    mainCheckboxCache = checkbox;
    return checkbox;
}

function applyUiState(state) {
    document.body.classList.toggle('hideChatAvatars', state);
    // Log state change
    console.log(`[EXT] applyUiState: ${state}, body class now: ${document.body.classList.contains('hideChatAvatars')}`);
}

function addMagicWandToggle() {
    const context = getContext();
    window.__debug__.context = context;

    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) {
        console.error('[EXT] extensionsMenu not found');
        return;
    }
    if (document.getElementById('toggle-chat-avatar-item')) {
        console.log('[EXT] toggle already exists');
        return;
    }

    // Read state from core settings
    const isHidden = context.settings?.hideChatAvatars ?? false;
    console.log(`[EXT] Initial state from context.settings: ${isHidden}`);

    // Apply UI
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
    window.__debug__.toggle = toggle;

    const label = document.createElement('label');
    label.htmlFor = 'toggle-chat-avatar-checkbox';
    label.textContent = 'Hide Chat Avatars';
    label.style.margin = '0';
    label.style.cursor = 'pointer';

    menuItem.appendChild(toggle);
    menuItem.appendChild(label);
    extensionsMenu.appendChild(menuItem);

    // Get main checkbox
    const mainCheck = getMainSettingsCheckbox();
    window.__debug__.mainCheck = mainCheck;
    console.log(`[EXT] Main checkbox found: ${!!mainCheck}`);

    // Sync main checkbox silently
    if (mainCheck) {
        mainCheck.checked = isHidden;
        console.log(`[EXT] Synced main checkbox to: ${isHidden}`);
    }

    // Extension toggle → update core via main checkbox's change event
    toggle.addEventListener('change', function() {
        const newState = this.checked;
        console.log(`[EXT] Toggle changed to: ${newState}`);
        // Update context.settings
        if (context.settings) {
            context.settings.hideChatAvatars = newState;
            console.log(`[EXT] Updated context.settings.hideChatAvatars = ${newState}`);
        }
        // Apply UI immediately
        applyUiState(newState);
        // Let the core handle saving by dispatching a change event on the main checkbox
        if (mainCheck) {
            mainCheck.checked = newState;
            mainCheck.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`[EXT] Dispatched change event on main checkbox`);
        } else {
            console.warn('[EXT] mainCheck not found – cannot trigger core save');
        }
        // Update debug state
        window.__debug__.state = newState;
    });

    // Main checkbox → sync back to our toggle
    if (mainCheck) {
        mainCheck.addEventListener('change', function() {
            const newState = this.checked;
            console.log(`[EXT] Main checkbox changed to: ${newState}`);
            if (toggle.checked !== newState) {
                toggle.checked = newState;
                console.log(`[EXT] Synced extension toggle to: ${newState}`);
                if (context.settings) {
                    context.settings.hideChatAvatars = newState;
                }
                applyUiState(newState);
            }
        });
    }

    // Re-apply after new messages are rendered
    eventSource.on(event_types.CHAT_CHANGED, () => {
        const currentState = context.settings?.hideChatAvatars ?? false;
        console.log(`[EXT] CHAT_CHANGED, re-applying state: ${currentState}`);
        applyUiState(currentState);
        if (toggle.checked !== currentState) {
            toggle.checked = currentState;
        }
        if (mainCheck && mainCheck.checked !== currentState) {
            mainCheck.checked = currentState;
        }
    });

    // Expose final state
    window.__debug__.state = isHidden;
    console.log('[EXT] Extension setup complete.');
}

function init() {
    console.log('[EXT] init waiting for APP_READY');
    eventSource.on(event_types.APP_READY, () => {
        console.log('[EXT] APP_READY received');
        addMagicWandToggle();
    });
}

init();
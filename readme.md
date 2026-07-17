# Toggle Chat Avatar

A SillyTavern extension that adds a quick toggle for **Hide Chat Avatars** directly to the Magic Wand (Extensions) menu.

---

## Features

- **Quick toggle** – hide/show chat avatars with one click from the Magic Wand menu.
- **Syncs with the main Settings** – toggling from the extension updates the main Settings checkbox, and vice versa.
- **Persists across sessions** – the setting is saved using SillyTavern's built‑in `saveSettingsDebounced` method.
- **Works with existing chat messages** – automatically applies the setting to new messages as they load.

---

## Installation

1. Navigate to your SillyTavern `data` folder (or `public/scripts/extensions/third-party/`).
2. Clone this repository into the extensions directory:
   ```bash
   git clone https://github.com/andodesu/hide-chat-avator.git toggle-chat-avatar
   ```
   (Or download the ZIP and extract it into `toggle-chat-avatar`.)
3. Restart SillyTavern or refresh the page.
4. Enable the extension in the **Extensions** panel (puzzle icon).

---

## Usage

- Click the **Magic Wand** icon in the chat bar.
- Find **"Hide Chat Avatars"** in the dropdown.
- Toggle the checkbox – avatars will hide/show immediately.
- The setting is saved and will persist after page reloads.
- Toggling the main Settings checkbox (under **User Settings → Chat**) also updates the extension toggle.

---

## How It Works

- Reads/writes directly from `context.powerUserSettings.hideChatAvatars_enabled` – the core's source of truth.
- Triggers `switchHideChatAvatars()` to apply the UI change.
- Saves using `context.saveSettingsDebounced()` – the same method used by the core.
- Listens for `CHAT_CHANGED` events to re‑apply the setting when new messages are rendered.

---

## Compatibility

- Works with SillyTavern **1.12.0** and later.
- Tested on Chrome, Firefox, and Edge.

---

## License

MIT © [Ando](https://github.com/andodesu)
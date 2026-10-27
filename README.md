# Page Helper

Claude-powered study helper, in two forms:

- **Chrome extension** (`extension/`): a side panel that summarizes pages, answers fill-in-the-blanks with explanations, finds similar sources, and chats about the page. Setup is in [extension/README.md](extension/README.md).
- **Desktop buddy** (`desktop/`, coming in Phase 1): a small always-on-top mascot. Press a hotkey, drag a box around anything on screen, and pick a tool.

The plan, what's done and the idea backlog are in [docs/ROADMAP.md](docs/ROADMAP.md).

## Layout

| Folder | What's in it |
|---|---|
| `core/` | Code shared by both apps: Claude API client, prompts, Markdown renderer |
| `extension/` | The Chrome extension |
| `desktop/` | The Electron desktop app (not started yet) |
| `scripts/` | Helper scripts, such as `sync-core.mjs` |
| `docs/` | Roadmap and design notes |

## Working on it

- Edit shared code in `core/`, never in `extension/core/` (that folder is a generated copy).
- After changing `core/`, run `npm run sync-core`, then reload the extension in `chrome://extensions`.
- Ground rules: for personal use on this PC, not on school-managed devices. Keep academic honesty in mind for graded work.

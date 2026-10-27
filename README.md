# Page Helper

A desktop buddy for Windows: a small mascot that stays on top of your screen. Press a hotkey, drag a box around anything, and Claude can summarize it, explain it, answer blanks, find sources, or chat about it.

The plan, what's done and the idea backlog are in [docs/ROADMAP.md](docs/ROADMAP.md).

## Run it

```
npm install
npm start
```

The first time, Settings opens so you can paste your Anthropic API key. After that the buddy appears in the bottom-right corner.

- **Drag** the mascot to move it. It remembers where you leave it.
- **Click** it, or press **Ctrl + Shift + Space** from anywhere, to wake it.
- **Right-click** it, or the purple dot in the taskbar tray, for Settings, switching mascots, hiding it and quitting.

## Layout

| Folder | What's in it |
|---|---|
| `core/` | Claude API client, prompts and Markdown renderer |
| `desktop/app/` | The Electron app: windows, tray, hotkey, settings |
| `desktop/mascots/` | One folder per mascot (see its README to add your own) |
| `desktop/actions/` | One file per tool (from Phase 2) |
| `desktop/inputs/` | One file per content source (from Phase 2) |
| `docs/` | Roadmap and design notes |

`npm run smoke-test` starts the app with throwaway settings, saves screenshots of each mascot and the Settings window, then quits. It's a quick check that nothing is broken.

## Ground rules

For personal use on this PC, not on school-managed devices. Keep academic honesty in mind for graded work.

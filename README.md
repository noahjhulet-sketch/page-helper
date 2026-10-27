# Page Helper

A desktop buddy for Windows: a small mascot that stays on top of your screen. Press a hotkey, drag a box around anything, and Claude can summarize it, explain it, answer blanks, find sources, or answer your question about it.

The plan, what's done and the idea backlog are in [docs/ROADMAP.md](docs/ROADMAP.md).

## Run it

In PowerShell, from this folder:

```
npm.cmd install
npm.cmd start
```

(Plain `npm` also works in Command Prompt. PowerShell blocks it by default, so use `npm.cmd` there.)

The first time, Settings opens so you can paste your Anthropic API key. After that the buddy appears in the bottom-right corner.

## Use it

1. **Click** the buddy, or press **Ctrl + Shift + Space** from anywhere. The screen freezes and dims.
2. **Drag a box** around what you want help with. Only that box is sent to Claude. **Esc** cancels.
3. **Pick a tool**: Summarize, Explain, Blanks, Sources, or type a question and press Enter.
4. The answer appears in a bubble next to the buddy. **Copy** copies it; **✕** or **Esc** closes it (and stops the request if it's still running).

Also:
- **Drag** the buddy to move it. It remembers where you leave it.
- **Right-click** it, or the purple dot in the taskbar tray, for Settings, switching mascots, hiding it and quitting.
- Model choice is in Settings. Opus gives the best answers; Haiku is far cheaper.

## Layout

| Folder | What's in it |
|---|---|
| `core/` | Claude API client (official Anthropic SDK) and Markdown renderer |
| `desktop/app/` | The Electron app: windows, tray, hotkey, settings, answer bubble |
| `desktop/actions/` | One file per tool (see its README to add one) |
| `desktop/inputs/` | Where content comes from: the screen snip, later the clipboard |
| `desktop/mascots/` | One folder per mascot (see its README to add your own) |
| `docs/` | Roadmap and design notes |

`npm.cmd run smoke-test` starts the app with throwaway settings, walks through the mascots, a snip of a fake worksheet, the answer bubble and Settings, saves screenshots, then quits. It's a quick check that nothing is broken. It makes no API calls.

## Ground rules

For personal use on this PC, not on school-managed devices. Keep academic honesty in mind for graded work.

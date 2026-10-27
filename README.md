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
4. The answer appears in a bubble next to the buddy. Type in **Ask a follow-up…** to keep going. **Copy** copies an answer; **✕** or **Esc** closes the bubble (and stops a request that's still running).

**From the clipboard:** copy some text or an image, then press **Ctrl + Alt + Space**. A bubble opens with the same tools.

**Just chat:** hover over the buddy and a chat bar slides out below him. Move down into it, type anything ("make me a study guide for…") and press Enter. In any chat, **✂️** and **📋** attach a snip or whatever you copied to your next question, so you can hand him your sources as you go.

**Ask him to do things:** in a chat, try "open Notepad with a study guide for…", "find me YouTube videos on…", "open Word", or "copy that summary". He shows a card saying exactly what he'll do, with **Allow** and **Skip**, and nothing happens until you click Allow. Turn it off in Settings → Doing things for you.

Also:
- **📌 Pin** a bubble to keep it on screen; the next snip opens a new bubble instead of replacing it. Drag bubbles by their top bar.
- **History** (right-click the buddy → History…) lists past snips and answers. Click one to reopen it and keep asking. It's saved only on this PC and can be turned off in Settings.
- **Drag** the buddy to move it. It remembers where you leave it.
- **Right-click** it, or the purple dot in the taskbar tray, to switch model or mascot, open History or Settings, hide it, or quit.
- Opus gives the best answers; Haiku is far cheaper.

## Layout

| Folder | What's in it |
|---|---|
| `core/` | Claude API client (official Anthropic SDK) and Markdown renderer |
| `desktop/app/` | The Electron app: buddy, bubbles, sessions, history, settings, menus. Pages are in `ui/`, sharing `theme.css` |
| `desktop/actions/` | One file per tool in the snip menu (see its README to add one) |
| `desktop/abilities/` | Things he can do on the computer when you ask in a chat (see its README) |
| `desktop/inputs/` | Where content comes from: the screen snip and the clipboard |
| `desktop/mascots/` | One folder per mascot (see its README to add your own) |
| `docs/` | Roadmap and design notes |

`npm.cmd run smoke-test` starts the app with throwaway settings, walks through the mascots, a snip of a fake worksheet, bubbles (snip, clipboard, chat), History and Settings, saves screenshots, then quits. It's a quick check that nothing is broken. It makes no API calls and doesn't touch your real clipboard, settings or history.

Settings and history are stored in `%APPDATA%\Page Helper`.

## Ground rules

For personal use on this PC, not on school-managed devices. Keep academic honesty in mind for graded work.

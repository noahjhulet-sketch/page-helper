# Roadmap

Each phase ends with a checkpoint: you try it, then we move on.
Status: ✅ done · 🔨 in progress · ⏳ next · 💤 later

## Phase 0: Shared core 🔨
Move the extension into `extension/`, pull shared code into `core/`, add git.
- [x] Project moved out of OneDrive to `C:\Users\jorda\Projects\Page Helper`
- [x] `core/claude.js` (API client), `core/prompts.js`, `core/markdown.js`
- [x] `npm run sync-core` copies `core/` into the extension
- [ ] **Checkpoint:** reload the extension from `extension/` and confirm all four tools work

## Phase 1: Desktop shell ⏳
- Transparent, always-on-top, draggable mascot window with click-through around it
- Tray icon: Settings, Hide buddy, Quit
- Global hotkey (`Ctrl+Shift+Space`)
- Settings window: API key (encrypted with Windows DPAPI via `safeStorage`), model, mascot choice
- Three placeholder mascots, one per chattiness level (see below)
- Remembers position across restarts
- **Checkpoint:** switch mascots, reboot, buddy comes back where you left it

## Phase 2: Snip → answer
- Hotkey freezes the screen; drag a box on the still image
- Radial menu: Summarize · Explain · Blanks · Sources · Ask
- Answer streams into a speech bubble
- Preview of exactly what gets sent before it goes out
- Multi-monitor and display-scaling support
- **Checkpoint:** every tool works on real content, on every monitor

## Phase 3: Clipboard and chat
- Clipboard hotkey (text or image)
- Expand a bubble into a chat panel for follow-ups
- Session history stored only on this PC, with "clear all"
- Pin a result on screen

## Phase 4: Personality
- Your mascot art dropped into `desktop/mascots/`
- State animations; wording that matches the chattiness level
- Study mode for Blanks: hint, then explanation, then answer
- "Graded work" toggle: Blanks becomes explain-only

## Phase 5: Polish
- Cost meter (tokens and spend)
- Ignore list: apps where the hotkey does nothing (password managers, banking)
- Do-not-disturb in fullscreen apps
- Installer and launch at login

## 💤 Later, maybe
- Computer use (clicking and typing for you): every action needs your approval, a panic hotkey stops everything, allowlisted apps only

---

## Mascots

Three looks, one per chattiness level. Simple placeholder shapes until your art is ready.

| Mascot | Placeholder | Chattiness |
|---|---|---|
| Quiet | Small calm circle | Results only, barely moves |
| Normal | Rounded square | One short line before results, gentle idle animation |
| Playful | Bouncy star or blob | Reactions and banter, livelier animation |

Each mascot is a folder in `desktop/mascots/` with one image per state plus a settings file.
States: `idle`, `hover`, `listening`, `selecting`, `thinking`, `talking`, `error`, `sleeping`, `dragged`.
A missing image falls back to `idle`, so art can be added a little at a time.

## Adding things later

| To add | Do this |
|---|---|
| A tool | Add a file to `desktop/actions/` (name, icon, prompt, default model). It shows up in the menu. |
| A mascot | Add a folder to `desktop/mascots/` |
| An input source | Add a file to `desktop/inputs/` |

## Idea backlog
Ideas that aren't scheduled yet. Add freely.
- 

# Roadmap

Each phase ends with a checkpoint: you try it, then we move on.
Status: ✅ done · 🔨 in progress · ⏳ next · 💤 later

## Phase 0: Shared core ✅
- [x] Project moved out of OneDrive to `C:\Users\jorda\Projects\Page Helper`
- [x] API client, prompts and Markdown renderer pulled out of the old Chrome extension into `core/`
- [x] Decided to go desktop-only: the extension was removed (still in git history, first commit)

## Phase 1: Desktop shell ✅
- [x] Transparent, always-on-top, draggable mascot window with click-through around it
- [x] Tray icon and right-click menu: Show/Hide buddy, Mascot, Settings, Quit
- [x] Global hotkey (`Ctrl+Shift+Space`)
- [x] Settings window: API key (encrypted with Windows DPAPI via `safeStorage`), model, mascot choice
- [x] Three placeholder mascots, one per chattiness level (see below)
- [x] Remembers position across restarts; comes back on screen if a monitor is unplugged
- [x] `npm run smoke-test` screenshot check
- [x] **Checkpoint** passed

## Phase 2: Snip → answer 🔨
- [x] Hotkey or click freezes every monitor; drag a box on the still image (Esc cancels)
- [x] Menu next to the box: Summarize · Explain · Blanks · Sources · Ask (with a question box)
- [x] Answer streams into a bubble beside the buddy, with a thumbnail of the snip, Copy and Close
- [x] Closing the bubble cancels the request; links open in your browser
- [x] Buddy reacts: thinking, talking, error
- [x] Multi-monitor and display-scaling aware; snips are scaled to Claude's 2576px limit
- [x] API calls moved to the official Anthropic SDK
- [x] The box you draw is the preview: only that region is sent
- [ ] **Checkpoint:** every tool works on real content, on every monitor

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
| A tool | Add a file to `desktop/actions/` (see its README for the template). It shows up in the snip menu. |
| A mascot | Add a folder to `desktop/mascots/` |
| An input source | Add a file to `desktop/inputs/` |

## Idea backlog
Ideas that aren't scheduled yet. Add freely.
- 

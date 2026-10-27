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

## Phase 2: Snip → answer ✅
- [x] Hotkey or click freezes every monitor; drag a box on the still image (Esc cancels)
- [x] Menu next to the box: Summarize · Explain · Blanks · Sources · Ask (with a question box)
- [x] Answer streams into a bubble beside the buddy, with a thumbnail of the snip, Copy and Close
- [x] Closing the bubble cancels the request; links open in your browser
- [x] Buddy reacts: thinking, talking, error
- [x] Multi-monitor and display-scaling aware; snips are scaled to Claude's 2576px limit
- [x] API calls moved to the official Anthropic SDK
- [x] The box you draw is the preview: only that region is sent
- [x] **Checkpoint** passed (tested on Haiku)

## Phase 3: Clipboard and chat ✅
- [x] Follow-up questions in the bubble, keeping the original snip and answers as context
- [x] Clipboard hotkey (`Ctrl+Alt+Space`) for copied text or images; the bubble offers the tools
  (not `Ctrl+Shift+V`: a global hotkey would block "paste as plain text" in every app)
- [x] History window: search, reopen and keep asking, delete, clear all; saved only on this PC; can be turned off
- [x] Pin a bubble so the next snip opens a new one instead of replacing it
- [x] Dark-and-purple theme shared by every window
- [x] Right-click menu: snip, clipboard, History, Model, Mascot
- [x] Model and history settings apply instantly; only the API key has a Save button
- [x] Settings moved to `%APPDATA%\Page Helper` (the old "Electron" folder is migrated automatically)
- [x] **Checkpoint** passed

## Phase 3.5: Plain chat ⏳
Your idea: talk to the buddy without starting from a snip ("make me a study guide", then give it the source).
- "New chat" from the right-click menu (and a hotkey): an empty bubble you type into
- Attach a snip or the clipboard partway through a chat, as many as you like
- Chats saved to History like snips

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

## Phase 6: Hands (doing things on the computer when you ask)
Your idea: fill in text boxes and surveys, open Notepad and paste, find videos.
Built in two steps, simplest and safest first.

**6a. Quick actions.** The buddy can offer a few specific actions, each shown as a button you click to approve:
- Open a link or a search (YouTube, Google Scholar, …) in your browser
- Open Notepad (or a new note) with the answer pasted in
- Copy an answer to the clipboard
- Type an answer into the text box you last clicked
Cheap, fast, and predictable: no screenshots of your screen after the first, no surprise clicks.

**6b. Full computer use.** Claude looks at the screen and clicks and types step by step, for multi-step jobs like a survey.
- You approve each step (or a whole plan, step by step on screen); a panic hotkey stops everything instantly
- Works only in apps you've allowed; never in password managers, banking, or anything asking for passwords or payment
- Never on graded quizzes or tests (academic honesty), and never on school-managed devices
- Slower and pricier than everything else: each step sends a screenshot, and it needs Opus or Sonnet

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

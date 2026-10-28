# Page Helper

A desktop study buddy for Windows: a little mascot who lives on your screen. Snip anything and he'll summarize it, explain it, help with fill-in-the-blanks or find sources. Chat with him, drop in PDFs, make flashcards, keep notes, and have him open apps and pages for you. Powered by Claude, using your own Anthropic API key.

> **Early version.** It works, but expect rough edges. The plan, what's done and the idea backlog are in [docs/ROADMAP.md](docs/ROADMAP.md).

## Get started

**You'll need:** Windows 10 or 11, [Node.js](https://nodejs.org) 20 or newer, and an Anthropic API key (setup walks you through getting one).

1. Download this project (green **Code** button → **Download ZIP**, then unzip it), or `git clone` it.
2. Open PowerShell in the project folder and run:

   ```
   npm.cmd install
   npm.cmd start
   ```

   (In Command Prompt, plain `npm` works too. PowerShell blocks plain `npm` by default, which is why it's `npm.cmd` here.)
3. A setup window walks you through connecting your API key (it checks the key works before saving it), picking a mascot and a model, and a few tips. The buddy then appears near the top-left of your screen.

To reopen setup later: right-click the buddy → **Setup guide…**.

### Costs and privacy

- **You pay Anthropic directly** for what you use. Most answers cost a few cents or less; Haiku is the cheapest model, Opus the best. Setting a monthly spend limit in the [Anthropic Console](https://console.anthropic.com) is a good idea.
- **Your API key** is encrypted with Windows' own protection and stored only on your PC. It's sent only to Anthropic.
- **What's sent to Claude** is only what you choose: the box you snip, what you copy, files you attach, notes he reads when you ask, and your messages.
- **History, notes and flashcards** stay on your PC (see the end of this page for where).

**Academic honesty:** this is meant to help you learn. Check your school's rules before using AI on graded work.

## Use it

1. **Click** the buddy, or press **Ctrl + Shift + Space** from anywhere. The screen freezes and dims.
2. **Drag a box** around what you want help with. Only that box is sent to Claude. **Esc** cancels.
3. **Pick a tool**: Summarize, Explain, Blanks, Sources, or type a question and press Enter.
4. The answer appears in a bubble next to the buddy. Type in **Ask a follow-up…** to keep going. **Copy** copies an answer; **✕** or **Esc** closes the bubble (and stops a request that's still running).

**From the clipboard:** copy some text or an image, then press **Ctrl + Alt + Space**. A bubble opens with the same tools.

**Just chat:** hover over the buddy and a chat bar slides out below him. Move down into it, type anything ("make me a study guide for…") and press Enter. In any chat, **✂️** and **📋** attach a snip or whatever you copied to your next question, so you can hand him your sources as you go.

**Ask him to do things:** in a chat, try "open Notepad with a study guide for…", "find me YouTube videos on…", "open Word", or "copy that summary". He shows a card saying exactly what he'll do, with **Allow**, **Always** and **Skip**. Nothing happens until you allow it; **Always** stops him asking for that kind of thing (you can undo it in Settings → Doing things for you, where you can also turn the whole feature off).

**Finding sources:** in a chat, ask for something specific ("find me a good source that explains orbitals", "find the PDF of…"). He searches the web, reads the pages, and gives you direct links to the ones that fit. Ask him to open one and he opens that exact page or file. Each search adds a little to the cost of that answer.

**PDFs and files:** drop a PDF (or an image, .txt or .md file) onto any chat bubble or the chat bar, or click **📄**. He reads the whole thing, so you can ask about long readings that don't fit in a snip. Word files: save as PDF first.

**Flashcards:** in a chat, ask "make flashcards on everything" or "just on hybridization", or click **🃏** at the top of the bubble. He builds a deck from that conversation and opens the **Flashcards** window: click or press Space to flip, mark **Got it** or **Again**, then review the ones you missed. Decks are saved (right-click the buddy → Flashcards…).

**Notes:** right-click the buddy → **Notes…** for essays, ideas and brainstorms. Notes save as you type, as files in **Documents\Page Helper Notes**. **Ask about it** starts a chat with that note. In any chat he can look over your notes ("check my essay draft"), reading the text only, and write in them ("add these ideas to my brainstorm") once you allow it.

**Bored?** Tell him "I'm bored" and **Pop-Up Panic** opens (free: no API call). App windows rain down on a tiny desktop and he runs along the taskbar catching 📝 notes, 🃏 flashcards and ⭐ gold stars while dodging ⚠️ error pop-ups and 🐛 bugs. ☕ coffee slows time, 📌 a pin blocks one hit, and the levels speed up from "Monday Morning" to "Finals Week". Arrow keys or the mouse to move, Space to start, P to pause. Also in the right-click menu.

Also:
- **📌 Pin** a bubble to keep it on screen; the next snip opens a new bubble instead of replacing it. Drag bubbles by their top bar.
- **History** (right-click the buddy → History…) lists past snips and answers. Click one to reopen it and keep asking. It's saved only on this PC and can be turned off in Settings.
- **Drag** the buddy to move it. It remembers where you leave it. His home spot is near the top-left of the screen.
- New windows (bubbles, Notes, Flashcards, History, Settings) open in free space so they don't cover him or each other, opening a little smaller if that's what it takes. Bubbles near the top of the screen grow downward.
- **Right-click** it, or the purple dot in the taskbar tray, to switch model or mascot, open History or Settings, hide it, or quit.
- Opus gives the best answers; Haiku is far cheaper.

## Layout

| Folder | What's in it |
|---|---|
| `core/` | Claude API client (official Anthropic SDK) and Markdown renderer |
| `desktop/app/` | The Electron app: buddy, bubbles, sessions, history, settings, menus. Pages are in `ui/`, sharing `theme.css` |
| `desktop/actions/` | One file per tool in the snip menu (see its README to add one) |
| `desktop/abilities/` | Things he can do when you ask in a chat: open apps and sites, notes, flashcards (see its README) |
| `desktop/inputs/` | Where content comes from: the screen snip and the clipboard |
| `desktop/mascots/` | One folder per mascot (see its README to add your own) |
| `docs/` | Roadmap and design notes |

`npm.cmd run smoke-test` starts the app with throwaway settings, walks through the mascots, a snip of a fake worksheet, bubbles (snip, clipboard, chat), History and Settings, saves screenshots, then quits. It's a quick check that nothing is broken. It makes no API calls and doesn't touch your real clipboard, settings or history.

Settings, history and flashcard decks are stored in `%APPDATA%\Page Helper`; notes in `Documents\Page Helper Notes`.

## Ground rules

For personal use on this PC, not on school-managed devices. Keep academic honesty in mind for graded work.

## License

MIT. See [LICENSE](LICENSE).

# Abilities

Things the buddy can do on the computer when you ask in a chat. Each `.js` file here is one ability, offered to Claude as a tool. Files starting with `_` are helpers.

**He asks first.** When Claude wants to use one, the chat shows a card describing exactly what will happen, with **Allow**, **Always** and **Skip**. Nothing runs until you allow it. **Always** stops him asking for that ability (its `permission` text names it, as in "Always allow opening apps"); Settings → Doing things for you lists these, lets you undo them, and turns the whole feature off.

Web search and page reading aren't abilities here: they're Anthropic's server tools, added to every chat in `desktop/app/session.js`. They only read; opening what he finds goes through `open_website`.

| File | What it does |
|---|---|
| `open-app.js` | Opens an app from a fixed list in `_apps.js` (never an arbitrary program) |
| `open-website.js` | Opens an http/https link in your browser |
| `search.js` | Opens a search on the web, YouTube, Google Scholar, Wikipedia or images |
| `write-note.js` | Saves text to `Documents\Page Helper Notes` and opens it in Notepad |
| `copy-text.js` | Copies text to the clipboard |
| `make-flashcards.js` | Makes a flashcard deck from the chat and opens the Flashcards window (doesn't ask: it only opens a window in this app) |
| `list-notes.js`, `read-note.js` | Look at the titles and text of your notes (don't ask: they only read what you asked about) |
| `save-to-notes.js` | Makes, adds to or rewrites a note in the Notes window |
| `play-game.js` | Opens Pop-Up Panic when you're bored or want a break (plain "I'm bored" skips Claude entirely) |

## Adding one

```js
export default {
  name: "open_calendar",              // the tool name Claude sees
  icon: "📅",                         // shown on the approval card
  permission: "opening Calendar",     // completes "Always allow …"
  // askFirst: false,                 // only for abilities that just read or open this app's own windows
  description: "Open the Calendar app. Only when the user asks.",  // tells Claude when to use it
  input_schema: { type: "object", properties: {}, additionalProperties: false },
  describe: (input) => "Open Calendar",  // the approval card's text: say exactly what will happen
  run(input, { chatTitle }) {            // runs only after Allow; return what happened
    return "Opened Calendar.";
  },
};
```

Keep abilities narrow and predictable: a fixed list of apps, a fixed set of sites, a specific folder. Clicking and typing inside other apps is a separate, later step (Phase 6b) with its own safety checks.

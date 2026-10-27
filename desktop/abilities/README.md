# Abilities

Things the buddy can do on the computer when you ask in a chat. Each `.js` file here is one ability, offered to Claude as a tool. Files starting with `_` are helpers.

**He always asks first.** When Claude wants to use one, the chat shows a card describing exactly what will happen, with **Allow** and **Skip**. Nothing runs until you click Allow. The whole feature can be turned off in Settings → Doing things for you.

| File | What it does |
|---|---|
| `open-app.js` | Opens an app from a fixed list in `_apps.js` (never an arbitrary program) |
| `open-website.js` | Opens an http/https link in your browser |
| `search.js` | Opens a search on the web, YouTube, Google Scholar, Wikipedia or images |
| `write-note.js` | Saves text to `Documents\Page Helper Notes` and opens it in Notepad |
| `copy-text.js` | Copies text to the clipboard |

## Adding one

```js
export default {
  name: "open_calendar",              // the tool name Claude sees
  icon: "📅",                         // shown on the approval card
  description: "Open the Calendar app. Only when the user asks.",  // tells Claude when to use it
  input_schema: { type: "object", properties: {}, additionalProperties: false },
  describe: (input) => "Open Calendar",  // the approval card's text: say exactly what will happen
  run(input) {                           // runs only after Allow; return what happened
    return "Opened Calendar.";
  },
};
```

Keep abilities narrow and predictable: a fixed list of apps, a fixed set of sites, a specific folder. Clicking and typing inside other apps is a separate, later step (Phase 6b) with its own safety checks.

# Actions

The tools in the snip menu. Each `.js` file here is one tool, and the app finds new files automatically (restart it after adding one). Files starting with `_` are helpers, not tools.

```js
import { streamMessage } from "../../core/claude.js";
import { sourceNote, userContent } from "./_shared.js";

export default {
  id: "translate",            // unique name
  label: "Translate",         // button text
  icon: "🌐",                 // button icon
  description: "Translate into English",  // tooltip
  order: 6,                   // position in the menu, lowest first
  needsQuestion: false,       // true = uses the "Ask about this…" box

  // input: the snip or clipboard (see _shared.js). question: the typed text (if any).
  // Call onText(markdownSoFar) to stream; return the final Markdown.
  run({ input, question, settings, onText, signal }) {
    return streamMessage(settings, {
      max_tokens: 16000,
      output_config: { effort: "medium" },
      system: `You translate text for someone. ${sourceNote(input)}`,
      messages: [{ role: "user", content: userContent(input, "Translate this into English.") }],
    }, onText, signal);
  },
};
```

`settings` holds the API key and the model chosen in Settings. `signal` cancels the request when the answer bubble is closed; pass it through.

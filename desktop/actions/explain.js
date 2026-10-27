import { streamMessage } from "../../core/claude.js";
import { sourceNote, userContent } from "./_shared.js";

export default {
  id: "explain",
  label: "Explain",
  icon: "💡",
  description: "What it means, in plain language",
  order: 2,

  run({ input, settings, onText, signal }) {
    return streamMessage(
      settings,
      {
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system: `You explain things to a student. ${sourceNote(input)} Use Markdown.`,
        messages: [
          {
            role: "user",
            content: userContent(
              input,
              "Explain this so I understand it: what it is, what the key terms mean, and how it works. Add a short example if it helps. Keep it under about 250 words.",
            ),
          },
        ],
      },
      onText,
      signal,
    );
  },
};

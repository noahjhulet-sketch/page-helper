import { streamMessage } from "../../core/claude.js";
import { sourceNote, userContent } from "./_shared.js";

export default {
  id: "summarize",
  label: "Summarize",
  icon: "📝",
  description: "The key points in a few bullets",
  order: 1,

  run({ input, settings, onText, signal }) {
    return streamMessage(
      settings,
      {
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system: `You summarize what someone is reading. ${sourceNote(input)} Skip menus, ads and other interface clutter. Use Markdown.`,
        messages: [
          {
            role: "user",
            content: userContent(input, "Summarize this: a one-sentence overview, then 3–6 bullet points with the key ideas, facts and conclusions."),
          },
        ],
      },
      onText,
      signal,
    );
  },
};

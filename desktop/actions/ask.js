import { streamMessage } from "../../core/claude.js";
import { sourceNote, userContent } from "./_shared.js";

export default {
  id: "ask",
  label: "Ask",
  icon: "💬",
  description: "Ask your own question about it",
  order: 5,
  needsQuestion: true,

  run({ input, question, settings, onText, signal }) {
    return streamMessage(
      settings,
      {
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system: `You answer questions about what someone is reading. ${sourceNote(input)} If you add outside knowledge, say so. Be concise and use Markdown.`,
        messages: [{ role: "user", content: userContent(input, question) }],
      },
      onText,
      signal,
    );
  },
};

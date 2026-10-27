import { streamMessage } from "../../core/claude.js";
import { SCREEN_CONTEXT, imageBlock } from "./_shared.js";

export default {
  id: "ask",
  label: "Ask",
  icon: "💬",
  description: "Ask your own question about it",
  order: 5,
  needsQuestion: true,

  run({ image, question, settings, onText, signal }) {
    return streamMessage(
      settings,
      {
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system: `You answer questions about what's on someone's screen. ${SCREEN_CONTEXT} If you add outside knowledge, say so. Be concise and use Markdown.`,
        messages: [{ role: "user", content: [imageBlock(image), { type: "text", text: question }] }],
      },
      onText,
      signal,
    );
  },
};

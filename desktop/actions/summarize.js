import { streamMessage } from "../../core/claude.js";
import { SCREEN_CONTEXT, imageBlock } from "./_shared.js";

export default {
  id: "summarize",
  label: "Summarize",
  icon: "📝",
  description: "The key points in a few bullets",
  order: 1,

  run({ image, settings, onText, signal }) {
    return streamMessage(
      settings,
      {
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system: `You summarize what's on someone's screen. ${SCREEN_CONTEXT} Skip menus, ads and other interface clutter. Use Markdown.`,
        messages: [
          {
            role: "user",
            content: [
              imageBlock(image),
              { type: "text", text: "Summarize this: a one-sentence overview, then 3–6 bullet points with the key ideas, facts and conclusions." },
            ],
          },
        ],
      },
      onText,
      signal,
    );
  },
};

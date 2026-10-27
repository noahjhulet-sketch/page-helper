import { createMessage, textOf } from "../../core/claude.js";
import { sourceNote, userContent } from "./_shared.js";

const SCHEMA = {
  type: "object",
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "The sentence or question containing the blank, with the blank shown as ____" },
          answer: { type: "string" },
          explanation: { type: "string", description: "One or two sentences on why this is the answer" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["question", "answer", "explanation", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["answers"],
  additionalProperties: false,
};

export default {
  id: "blanks",
  label: "Blanks",
  icon: "✏️",
  description: "Answers for fill-in-the-blanks, with why",
  order: 3,

  async run({ input, settings, onText, signal }) {
    onText("*Working out the answers…*");
    const message = await createMessage(
      settings,
      {
        max_tokens: 16000,
        output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
        system:
          `You help people with fill-in-the-blank exercises. ${sourceNote(input)} ` +
          "Find every blank (empty boxes, runs of underscores, [blank] and similar). Give the single best answer for each, sized to fit the blank, and a short explanation so the reader learns why.",
        messages: [{ role: "user", content: userContent(input, "Answer the blanks. Return an empty list if there are none.") }],
      },
      signal,
    );

    const { answers } = JSON.parse(textOf(message) || '{"answers":[]}');
    if (!answers.length) return "I didn't find any fill-in-the-blank questions there.";
    return answers
      .map((a, i) => `**${i + 1}.** ${a.question}\n\n→ **${a.answer}** · ${a.confidence} confidence\n\n${a.explanation}`)
      .join("\n\n---\n\n");
  },
};

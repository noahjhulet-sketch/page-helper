import { createDeck, openFlashcards } from "../app/decks.js";

export default {
  name: "make_flashcards",
  icon: "🃏",
  askFirst: false, // it only opens a window in this app
  description:
    "Make a deck of flashcards and open it in the Flashcards window. Use this when the user asks for flashcards or to be quizzed. " +
    "Cover exactly what they ask for: everything in this conversation and its attachments, or only the topics they name. " +
    "Fronts are a short question or term; backs a clear answer in one to three sentences. Usually 8 to 30 cards; " +
    "no duplicates, and nothing that isn't supported by the conversation or well-established facts.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A short name for the deck, like \"Atomic orbitals\"" },
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: { front: { type: "string" }, back: { type: "string" } },
          required: ["front", "back"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "cards"],
    additionalProperties: false,
  },

  describe: ({ title, cards }) => `Make ${cards?.length ?? 0} flashcards: “${title}”`,

  run({ title, cards }, { chatTitle }) {
    if (!cards?.length) throw new Error("The deck had no cards.");
    const deck = createDeck({ title, from: chatTitle, cards });
    openFlashcards(deck.id);
    return `Made a deck of ${cards.length} cards called "${title}" and opened it in the Flashcards window.`;
  },
};

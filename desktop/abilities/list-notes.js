import { listNotes } from "../app/notes.js";

export default {
  name: "list_notes",
  icon: "🗒️",
  askFirst: false, // only reads note titles
  description:
    "List the user's notes (titles, last edited, word count, first line). " +
    "Use this when they mention their notes, a draft, or an idea they wrote down, before reading one.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },

  describe: () => "Look through your notes",

  run() {
    const notes = listNotes();
    if (!notes.length) return "The user has no notes yet.";
    return notes
      .map((n) => `- "${n.title}" (${n.words} words, edited ${new Date(n.modified).toLocaleDateString()}): ${n.preview}`)
      .join("\n");
  },
};

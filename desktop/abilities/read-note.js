import { findNote, readNoteForClaude } from "../app/notes.js";

export default {
  name: "read_note",
  icon: "📖",
  askFirst: false, // reading a note the user asked about
  description:
    "Read one of the user's notes in full, by title. Use this when they ask you to look over, check, continue or use a note. " +
    "If you're not sure of the title, call list_notes first.",
  input_schema: {
    type: "object",
    properties: { title: { type: "string", description: "The note's title (or part of it)" } },
    required: ["title"],
    additionalProperties: false,
  },

  describe: ({ title }) => `Read your note “${title}”`,

  run({ title }) {
    const note = findNote(title);
    if (!note) throw new Error(`There's no note called "${title}". Use list_notes to see the titles.`);
    return `Note "${note.title}":\n\n${readNoteForClaude(note.id)}`;
  },
};

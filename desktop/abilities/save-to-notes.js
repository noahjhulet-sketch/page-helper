import { createNote, findNote, openNotes, readNote, writeNote } from "../app/notes.js";

const MODES = { new: "Make a new note", append: "Add to the end of", replace: "Rewrite" };

export default {
  name: "save_to_notes",
  icon: "🗒️",
  permission: "writing in your notes",
  description:
    "Write in the user's Notes (the app's Notes window) and show it to them. mode \"new\" makes a new note; " +
    "\"append\" adds to the end of an existing note; \"replace\" rewrites an existing note completely (only when they ask you to " +
    "rewrite or fix the whole thing). Use Markdown. Prefer this over write_note unless they specifically want Notepad.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "The note's title: a new one for \"new\", an existing one otherwise" },
      text: { type: "string", description: "The text to write" },
      mode: { type: "string", enum: Object.keys(MODES) },
    },
    required: ["title", "text", "mode"],
    additionalProperties: false,
  },

  describe: ({ title, mode }) =>
    mode === "new" ? `Make a new note “${title}”` : `${MODES[mode] ?? "Write in"} your note “${findNote(title)?.title ?? title}”`,

  run({ title, text, mode }) {
    if (mode === "new") {
      const id = createNote(title, text);
      openNotes(id);
      return `Made a new note "${title}" and opened it in the Notes window.`;
    }
    const note = findNote(title);
    if (!note) throw new Error(`There's no note called "${title}". Use mode "new" to make one.`);
    const before = readNote(note.id);
    writeNote(note.id, mode === "append" ? `${before.replace(/\s*$/, "")}\n\n${text}\n` : text);
    openNotes(note.id);
    return mode === "append" ? `Added to "${note.title}" and opened it.` : `Rewrote "${note.title}" and opened it.`;
  },
};

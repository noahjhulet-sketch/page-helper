import fs from "node:fs";
import path from "node:path";
import { notesFolder } from "../app/notes.js";
import { launch } from "./_apps.js";

// Saved in the notes folder, so nothing is lost if Notepad is closed without
// saving, and it shows up in the Notes window too.

export default {
  name: "write_note",
  icon: "📝",
  permission: "putting text in Notepad",
  description:
    "Put text into the Notepad app for the user: saves it as a .txt file in their Documents\\Page Helper Notes folder and opens it in Notepad. " +
    "Only use this when they specifically mention Notepad; for notes in general, use save_to_notes. " +
    "Write plain text (Notepad doesn't show Markdown formatting).",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A short title, used for the file name" },
      text: { type: "string", description: "The full text to put in the note" },
    },
    required: ["title", "text"],
    additionalProperties: false,
  },

  describe: ({ title }) => `Open Notepad with “${title}”`,

  run({ title, text }) {
    fs.mkdirSync(notesFolder(), { recursive: true });
    const file = path.join(notesFolder(), `${safeName(title)} ${stamp()}.txt`);
    fs.writeFileSync(file, text.replace(/\r?\n/g, "\r\n"), "utf8");
    launch("notepad", [file]);
    return `Saved as "${path.basename(file)}" in Documents\\Page Helper Notes and opened it in Notepad.`;
  },
};

function safeName(title) {
  return title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "Note";
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
}

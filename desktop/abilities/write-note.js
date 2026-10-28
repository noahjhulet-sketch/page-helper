import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { launch } from "./_apps.js";

// Notes are saved here, so nothing is lost if Notepad is closed without saving.
const notesFolder = () => path.join(app.getPath("documents"), "Page Helper Notes");

export default {
  name: "write_note",
  icon: "📝",
  permission: "putting text in Notepad",
  description:
    "Put text into Notepad for the user: saves it as a .txt file in their Documents\\Page Helper Notes folder and opens it. " +
    "Use this when they ask you to open Notepad with something, paste something into a note, or save something to read later. " +
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

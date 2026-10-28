// Notes: plain .md and .txt files in Documents\Page Helper Notes, so they're yours
// to open anywhere. The Notes window edits them; the buddy can read them and,
// with your OK, write in them. A note's id is its file name.

import { app, ipcMain, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { renderMarkdown } from "../../core/markdown.js";
import { openPanel, sendToPanel } from "./panels.js";

const EXTENSIONS = [".md", ".txt"];
const MAX_READ = 100_000; // characters he reads from one note

export const notesFolder = () => path.join(app.getPath("documents"), "Page Helper Notes");

let showing = null; // the note the Notes window should show
let onAsk = null; // set by main: start a chat about a note

// Only plain file names of notes inside the notes folder; never a path elsewhere.
function fileOf(id) {
  if (typeof id !== "string" || id !== path.basename(id) || !EXTENSIONS.includes(path.extname(id).toLowerCase())) {
    throw new Error("Invalid note");
  }
  return path.join(notesFolder(), id);
}

ipcMain.handle("notes:list", () => listNotes());
ipcMain.handle("notes:read", (_e, id) => ({ id, title: titleOf(id), text: readNote(id) }));
ipcMain.handle("notes:current", () => (showing && fs.existsSync(fileOf(showing)) ? showing : listNotes()[0]?.id ?? null));
// Saves from the Notes window itself don't announce a change, so it doesn't reload mid-typing.
ipcMain.handle("notes:save", (_e, id, text) => fs.writeFileSync(fileOf(id), text, "utf8"));
ipcMain.handle("notes:create", (_e, title) => createNote(title || "Untitled", ""));
ipcMain.handle("notes:rename", (_e, id, title) => renameNote(id, title));
ipcMain.handle("notes:delete", (_e, id) => shell.trashItem(fileOf(id))); // to the Recycle Bin, not gone for good
ipcMain.handle("notes:render", (_e, text) => renderMarkdown(text));
ipcMain.on("notes:ask", (_e, id) => onAsk?.(id));
ipcMain.on("notes:show-folder", () => shell.openPath(notesFolder()));

export function setAskAboutNote(fn) {
  onAsk = fn;
}

export function openNotes(id) {
  if (id) showing = id;
  openPanel("notes");
  sendToPanel("notes", "notes:changed");
}

// Newest first: { id, title, modified, preview, words }.
export function listNotes() {
  if (!fs.existsSync(notesFolder())) return [];
  return fs
    .readdirSync(notesFolder())
    .filter((f) => EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .map((id) => {
      const file = fileOf(id);
      const text = fs.readFileSync(file, "utf8");
      return {
        id,
        title: titleOf(id),
        modified: fs.statSync(file).mtimeMs,
        preview: text.replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim().slice(0, 120),
        words: countWords(text),
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

export function readNote(id) {
  return fs.readFileSync(fileOf(id), "utf8");
}

// For the buddy: the note whose title best matches, or null.
export function findNote(title) {
  const want = title.trim().toLowerCase();
  const notes = listNotes();
  return notes.find((n) => n.title.toLowerCase() === want) ?? notes.find((n) => n.title.toLowerCase().includes(want)) ?? null;
}

export function readNoteForClaude(id) {
  const text = readNote(id);
  return text.length > MAX_READ ? `${text.slice(0, MAX_READ)}\n\n[…the rest of the note was cut off]` : text;
}

export function writeNote(id, text) {
  fs.writeFileSync(fileOf(id), text, "utf8");
  sendToPanel("notes", "notes:changed");
}

export function createNote(title, text) {
  fs.mkdirSync(notesFolder(), { recursive: true });
  const base = safeName(title);
  let id = `${base}.md`;
  for (let n = 2; fs.existsSync(fileOf(id)); n++) id = `${base} (${n}).md`;
  writeNote(id, text);
  return id;
}

export function renameNote(id, title) {
  const base = safeName(title);
  const ext = path.extname(id);
  if (`${base}${ext}` === id) return id;
  let next = `${base}${ext}`;
  for (let n = 2; fs.existsSync(fileOf(next)); n++) next = `${base} (${n})${ext}`;
  fs.renameSync(fileOf(id), fileOf(next));
  if (showing === id) showing = next;
  sendToPanel("notes", "notes:changed");
  return next;
}

export const titleOf = (id) => path.basename(id, path.extname(id));

function safeName(title) {
  return title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled";
}

function countWords(text) {
  return (text.match(/\S+/g) ?? []).length;
}

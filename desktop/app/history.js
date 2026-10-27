// Saved sessions, kept only on this PC in the app's data folder:
//   history/<id>/entry.json   title, answers, and copied text
//   history/<id>/input.png    the snip or copied image, if there was one
// Only the newest MAX_ENTRIES are kept.

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

const MAX_ENTRIES = 100;
const VALID_ID = /^[\w-]+$/;

const root = () => path.join(app.getPath("userData"), "history");
const folder = (id) => {
  if (!VALID_ID.test(id)) throw new Error("Invalid history id");
  return path.join(root(), id);
};
const imageFile = (id, mediaType) => path.join(folder(id), mediaType === "image/jpeg" ? "input.jpg" : "input.png");

export function saveEntry(entry, input) {
  const dir = folder(entry.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "entry.json"), JSON.stringify(entry));
  if (input.kind === "image") {
    const file = imageFile(entry.id, input.mediaType);
    if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(input.data, "base64"));
  }
  prune();
}

// Newest first, without the answers' full text.
export function listEntries() {
  return readAll().map(({ id, createdAt, title, thumbnail, preview, turns }) => ({
    id,
    createdAt,
    title,
    thumbnail,
    preview,
    snippet: plainText(turns[0]?.markdown ?? "").slice(0, 160),
    answers: turns.length,
  }));
}

// The entry plus its input, ready to reopen as a session.
export function loadEntry(id) {
  const entry = JSON.parse(fs.readFileSync(path.join(folder(id), "entry.json"), "utf8"));
  const input = { ...entry.input };
  if (input.kind === "image") input.data = fs.readFileSync(imageFile(id, input.mediaType)).toString("base64");
  return { ...entry, input };
}

export function deleteEntry(id) {
  fs.rmSync(folder(id), { recursive: true, force: true });
}

export function clearHistory() {
  fs.rmSync(root(), { recursive: true, force: true });
}

function readAll() {
  if (!fs.existsSync(root())) return [];
  const entries = [];
  for (const id of fs.readdirSync(root())) {
    try {
      entries.push(JSON.parse(fs.readFileSync(path.join(folder(id), "entry.json"), "utf8")));
    } catch {
      // A half-written or hand-edited entry; skip it.
    }
  }
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

function prune() {
  for (const { id } of readAll().slice(MAX_ENTRIES)) deleteEntry(id);
}

function plainText(markdown) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>→]|^-{3,}$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

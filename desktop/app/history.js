// Saved sessions, kept only on this PC in the app's data folder:
//   history/<id>/entry.json      title, answers, copied text
//   history/<id>/source-<n>.png  each snip or image (.pdf for PDFs)
// Only the newest MAX_ENTRIES are kept.

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { withoutReveals } from "../../core/markdown.js";

const MAX_ENTRIES = 100;
const VALID_ID = /^[\w-]+$/;

const root = () => path.join(app.getPath("userData"), "history");
const folder = (id) => {
  if (!VALID_ID.test(id)) throw new Error("Invalid history id");
  return path.join(root(), id);
};
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };
const fileName = (n, mediaType) => `source-${n}.${EXTENSIONS[mediaType] ?? "bin"}`;

// `entry.sources` are { input, thumbnail, preview, icon }; images and PDFs are
// written to their own files.
export function saveEntry(entry) {
  const dir = folder(entry.id);
  fs.mkdirSync(dir, { recursive: true });
  const sources = entry.sources.map(({ input, ...shown }, n) => {
    if (!input.data) return { input, ...shown };
    const { data, ...meta } = input;
    const file = fileName(n, input.mediaType);
    const target = path.join(dir, file);
    if (!fs.existsSync(target)) fs.writeFileSync(target, Buffer.from(data, "base64"));
    return { input: { ...meta, file }, ...shown };
  });
  fs.writeFileSync(path.join(dir, "entry.json"), JSON.stringify({ ...entry, sources }));
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

// The entry with its images loaded, ready to reopen as a session.
export function loadEntry(id) {
  const dir = folder(id);
  const entry = upgrade(JSON.parse(fs.readFileSync(path.join(dir, "entry.json"), "utf8")));
  const sources = entry.sources.map(({ input, ...shown }) => {
    if (!input.file) return { input, ...shown };
    const { file, ...meta } = input;
    const data = fs.readFileSync(path.join(dir, path.basename(file))).toString("base64");
    return { input: { ...meta, data }, ...shown };
  });
  return { ...entry, sources };
}

export function deleteEntry(id) {
  fs.rmSync(folder(id), { recursive: true, force: true });
}

export function clearHistory() {
  fs.rmSync(root(), { recursive: true, force: true });
}

// Entries saved before chats could have several sources had one `input`.
function upgrade(entry) {
  if (entry.sources) return entry;
  const { input, thumbnail, preview, turns, ...rest } = entry;
  const file = input.mediaType === "image/jpeg" ? "input.jpg" : "input.png";
  return {
    ...rest,
    thumbnail,
    preview,
    sources: [{ input: input.kind === "image" ? { ...input, file } : input, thumbnail, preview }],
    turns: turns.map((t, i) => ({ ...t, sources: i === 0 ? [0] : [] })),
  };
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
  return withoutReveals(markdown)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>→]|^-{3,}$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

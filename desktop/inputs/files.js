// Files: a PDF, image or text file you drop on a chat or pick with the 📄 button,
// turned into a chat source.

import { nativeImage } from "electron";
import fs from "node:fs";
import path from "node:path";

const MAX_BYTES = 30 * 1024 * 1024; // the API takes up to 32 MB per request
const MAX_EDGE = 2576; // largest image side Claude reads at full detail
const MAX_TEXT = 200_000; // characters

export const FILE_TYPES = [
  { name: "PDFs, images and text", extensions: ["pdf", "png", "jpg", "jpeg", "webp", "gif", "txt", "md"] },
];

// Returns { input, thumbnail, preview, icon }, or throws a message a person can act on.
export function readFileSource(file) {
  const name = path.basename(file);
  const ext = path.extname(file).slice(1).toLowerCase();
  if (!FILE_TYPES[0].extensions.includes(ext)) {
    throw new Error(`${name}: I can read PDFs, images (PNG, JPG, WebP, GIF) and text files (.txt, .md). For a Word file, save it as a PDF first.`);
  }
  if (!fs.existsSync(file)) throw new Error(`Couldn't find ${name}.`);
  if (fs.statSync(file).size > MAX_BYTES) throw new Error(`${name} is too big (over 30 MB).`);

  if (ext === "pdf") {
    const data = fs.readFileSync(file);
    if (data.subarray(0, 5).toString() !== "%PDF-") throw new Error(`${name} doesn't look like a PDF.`);
    return { input: { kind: "document", name, data: data.toString("base64"), mediaType: "application/pdf" }, thumbnail: "", preview: name, icon: "📄" };
  }

  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    let image = nativeImage.createFromPath(file);
    if (image.isEmpty()) throw new Error(`Couldn't open ${name} as an image.`);
    const { width, height } = image.getSize();
    if (Math.max(width, height) > MAX_EDGE) {
      image = image.resize(width >= height ? { width: MAX_EDGE, quality: "best" } : { height: MAX_EDGE, quality: "best" });
    }
    return {
      input: { kind: "image", data: image.toPNG().toString("base64"), mediaType: "image/png" },
      thumbnail: image.resize({ height: 80, quality: "good" }).toDataURL(),
      preview: name,
      icon: "🖼️",
    };
  }

  if (["txt", "md"].includes(ext)) {
    let text = fs.readFileSync(file, "utf8");
    if (text.length > MAX_TEXT) text = `${text.slice(0, MAX_TEXT)}\n\n[…cut off: the file was very long]`;
    return { input: { kind: "text", text, name }, thumbnail: "", preview: name, icon: "📃" };
  }
}

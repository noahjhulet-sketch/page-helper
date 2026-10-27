// Clipboard: whatever you last copied, as a tool input. Images win over text when
// both are there (copying an image in a browser often puts its URL on the clipboard too).

import { clipboard } from "electron";

const MAX_EDGE = 2576; // largest image side Claude reads at full detail
const MAX_TEXT = 200_000; // characters; keeps very long copies affordable

// Returns { input, thumbnail, preview } or null if the clipboard has nothing usable.
export function readClipboard() {
  let image = clipboard.readImage();
  if (!image.isEmpty()) {
    const { width, height } = image.getSize();
    if (Math.max(width, height) > MAX_EDGE) {
      image = image.resize(width >= height ? { width: MAX_EDGE, quality: "best" } : { height: MAX_EDGE, quality: "best" });
    }
    return {
      input: { kind: "image", data: image.toPNG().toString("base64"), mediaType: "image/png" },
      thumbnail: image.resize({ height: 80, quality: "good" }).toDataURL(),
      preview: "Copied image",
    };
  }

  let text = clipboard.readText().trim();
  if (!text) return null;
  if (text.length > MAX_TEXT) text = `${text.slice(0, MAX_TEXT)}\n\n[…cut off: the copied text was very long]`;
  return {
    input: { kind: "text", text },
    thumbnail: "",
    preview: text.length > 160 ? `${text.slice(0, 160).trim()}…` : text,
  };
}

// Mascot packs. Each folder in desktop/mascots/ holds a mascot.json and one image
// per state, named after the state (idle.svg, thinking.png, …). Only idle is
// required; the mascot window falls back to it for any state without an image.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MASCOTS_DIR = path.join(import.meta.dirname, "..", "mascots");
const IMAGE_TYPES = [".svg", ".png", ".gif", ".webp"];

export const STATES = ["idle", "hover", "listening", "selecting", "thinking", "talking", "error", "sleeping", "dragged"];

export function listMascots() {
  const mascots = [];
  for (const entry of fs.readdirSync(MASCOTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      mascots.push(loadMascot(entry.name));
    } catch (err) {
      console.warn(`Skipping mascot "${entry.name}": ${err.message}`);
    }
  }
  return mascots.sort((a, b) => a.order - b.order);
}

function loadMascot(id) {
  const dir = path.join(MASCOTS_DIR, id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "mascot.json"), "utf8"));

  const images = {};
  for (const file of fs.readdirSync(dir)) {
    const { name, ext } = path.parse(file);
    if (STATES.includes(name) && IMAGE_TYPES.includes(ext.toLowerCase())) {
      images[name] = pathToFileURL(path.join(dir, file)).href;
    }
  }
  if (!images.idle) throw new Error("it has no idle image");

  return {
    id,
    name: meta.name ?? id,
    description: meta.description ?? "",
    chattiness: meta.chattiness ?? "normal", // quiet | normal | playful
    motion: meta.motion ?? "gentle", // calm | gentle | bouncy
    size: meta.size ?? 72,
    order: meta.order ?? 99,
    images,
  };
}

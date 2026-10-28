// Ordinary app windows with a title bar: Settings, History, Flashcards, Notes and the game. One of each at a
// time; opening one that's already open brings it to the front. New ones open in
// a free spot, so they don't cover the buddy, his bubbles or each other.

import { BrowserWindow, screen } from "electron";
import path from "node:path";
import { findSpot } from "./layout.js";

// `min`: the smallest a panel may open at to avoid covering other windows.
const PANELS = {
  settings: { title: "Page Helper Settings", width: 500, height: 1000, min: { width: 500, height: 640 } },
  history: { title: "Page Helper History", width: 560, height: 680, resizable: true, min: { width: 420, height: 460 } },
  flashcards: { title: "Page Helper Flashcards", width: 600, height: 620, resizable: true, min: { width: 440, height: 460 } },
  notes: { title: "Page Helper Notes", width: 980, height: 680, resizable: true, min: { width: 640, height: 460 } },
  game: { title: "Pop-Up Panic", width: 540, height: 700, min: { width: 540, height: 700 } },
  welcome: { title: "Welcome to Page Helper", width: 560, height: 700, min: { width: 560, height: 640 } },
};

const open = new Map(); // name → BrowserWindow

export function openPanel(name) {
  const existing = open.get(name);
  if (existing) {
    existing.show();
    existing.focus();
    return existing;
  }
  const { title, width, resizable = false, min } = PANELS[name];
  // Ideally centered on the screen the pointer is on; never taller than that screen.
  const { workArea: a } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const height = Math.min(PANELS[name].height, a.height - 20);
  const spot = findSpot({ width, height }, { x: a.x + (a.width - width) / 2, y: a.y + (a.height - height) / 2 }, min);
  const win = new BrowserWindow({
    title,
    ...spot,
    resizable,
    show: false,
    backgroundColor: "#15141c", // matches theme.css, so there's no white flash
    webPreferences: { preload: path.join(import.meta.dirname, "preload.cjs") },
  });
  win.removeMenu();
  win.loadFile(path.join(import.meta.dirname, "ui", `${name}.html`));
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => open.delete(name));
  open.set(name, win);
  return win;
}

export function closePanel(name) {
  open.get(name)?.close();
}

export function sendToPanel(name, channel) {
  open.get(name)?.webContents.send(channel);
}

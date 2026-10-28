// Ordinary app windows with a title bar: Settings and History. One of each at a
// time; opening one that's already open brings it to the front.

import { BrowserWindow } from "electron";
import path from "node:path";

const PANELS = {
  settings: { title: "Page Helper Settings", width: 500, height: 1000 },
  history: { title: "Page Helper History", width: 560, height: 680, resizable: true },
};

const open = new Map(); // name → BrowserWindow

export function openPanel(name) {
  const existing = open.get(name);
  if (existing) {
    existing.show();
    existing.focus();
    return existing;
  }
  const { title, width, height, resizable = false } = PANELS[name];
  const win = new BrowserWindow({
    title,
    width,
    height,
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

export function sendToPanel(name, channel) {
  open.get(name)?.webContents.send(channel);
}

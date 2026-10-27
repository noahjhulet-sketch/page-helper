// The Settings window: API key, model and mascot choice.

import { BrowserWindow } from "electron";
import path from "node:path";

let win = null;

export function openSettingsWindow() {
  if (win) {
    win.show();
    win.focus();
    return win;
  }
  win = new BrowserWindow({
    width: 480,
    height: 730,
    resizable: false,
    title: "Page Helper Settings",
    show: false,
    webPreferences: { preload: path.join(import.meta.dirname, "preload.cjs") },
  });
  win.removeMenu();
  win.loadFile(path.join(import.meta.dirname, "ui", "settings.html"));
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => (win = null));
  return win;
}

export function sendToSettings(channel) {
  win?.webContents.send(channel);
}

// Settings saved as JSON in the app's user-data folder. The API key is encrypted
// with Windows DPAPI (safeStorage), so only this Windows account can read it.

import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_MODEL } from "../../core/claude.js";

const DEFAULTS = {
  model: DEFAULT_MODEL,
  mascot: "normal",
  hotkey: "Control+Shift+Space", // snip the screen
  clipboardHotkey: "Control+Alt+Space", // use what's on the clipboard
  saveHistory: true,
  position: null, // { x, y } of the mascot window, or null for the default corner
  apiKeyEncrypted: "",
};

let file;
let data;

// `migrateFrom`: an older settings file to move here if this one doesn't exist yet.
export function loadSettings({ migrateFrom } = {}) {
  file = path.join(app.getPath("userData"), "settings.json");
  if (migrateFrom && !fs.existsSync(file) && fs.existsSync(migrateFrom)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(migrateFrom, file);
    fs.rmSync(migrateFrom);
  }
  try {
    data = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    data = { ...DEFAULTS };
  }
}

export function getSetting(key) {
  return data[key];
}

export function setSettings(changes) {
  Object.assign(data, changes);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function hasApiKey() {
  return Boolean(data.apiKeyEncrypted);
}

// Only the main process calls this; the key is never sent to a window.
export function getApiKey() {
  if (!data.apiKeyEncrypted) return "";
  return safeStorage.decryptString(Buffer.from(data.apiKeyEncrypted, "base64"));
}

export function setApiKey(key) {
  if (!key) return setSettings({ apiKeyEncrypted: "" });
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows encryption isn't available, so the key can't be stored safely.");
  setSettings({ apiKeyEncrypted: safeStorage.encryptString(key).toString("base64") });
}

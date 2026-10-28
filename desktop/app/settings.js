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
  allowActions: true, // in chats, may open apps and sites, write notes, copy text
  autoAllow: [], // abilities that no longer ask first ("Always allow")
  position: null, // { x, y } of the mascot window, or null for the default corner
  apiKeyEncrypted: "",
};

let file;
let data;

export function loadSettings() {
  file = path.join(app.getPath("userData"), "settings.json");
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
  try {
    return safeStorage.decryptString(Buffer.from(data.apiKeyEncrypted, "base64"));
  } catch {
    // The encryption key it was saved with is gone (for example, the data folder was moved).
    throw new Error("Your saved API key couldn't be unlocked. Paste it again in Settings.");
  }
}

export function setApiKey(key) {
  if (!key) return setSettings({ apiKeyEncrypted: "" });
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows encryption isn't available, so the key can't be stored safely.");
  setSettings({ apiKeyEncrypted: safeStorage.encryptString(key).toString("base64") });
}

// Desktop buddy entry point: connects the mascot, hotkeys, menus, sessions,
// history and settings.

import { app, globalShortcut, ipcMain, Menu, nativeTheme } from "electron";
import path from "node:path";
import { MODELS } from "../../core/claude.js";
import { readClipboard } from "../inputs/clipboard.js";
import { isSnipping, snip } from "../inputs/snip.js";
import { loadActions, menuItems } from "./actions.js";
import { closeLatestBubble, openBubble } from "./bubbles.js";
import { clearHistory, deleteEntry, listEntries, loadEntry, saveEntry } from "./history.js";
import { listMascots } from "./mascots.js";
import {
  createMascotWindow, getMascotBounds, isMascotVisible, sendToMascot, setMascotOpacity, toggleMascot,
} from "./mascot-window.js";
import { openPanel, sendToPanel } from "./panels.js";
import { Session } from "./session.js";
import { getApiKey, getSetting, hasApiKey, loadSettings, setApiKey, setSettings } from "./settings.js";
import { runSmokeTest } from "./smoke-test.js";
import { createTray } from "./tray.js";

const smokeTest = process.argv.includes("--smoke-test");

app.setName("Page Helper");
// Settings and history live in %APPDATA%\Page Helper. The smoke test uses a
// throwaway folder instead so it never touches the real ones.
app.setPath("userData", smokeTest ? path.join(app.getPath("temp"), "page-helper-smoke-test") : path.join(app.getPath("appData"), "Page Helper"));
// Early versions saved settings in the generic "Electron" folder.
const OLD_SETTINGS = path.join(app.getPath("appData"), "Electron", "settings.json");

nativeTheme.themeSource = "dark"; // dark title bars to match the app's look

let hotkeyErrors = [];
let stateTimer;
let snipOptions = {}; // the smoke test swaps in a fake screenshot here

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const formatKey = (hotkey) => hotkey.replace("Control", "Ctrl");

// What sessions need from the rest of the app.
const sessionApp = {
  actions: [],
  settings: () => ({ apiKey: getApiKey(), model: getSetting("model") }),
  near: () => getMascotBounds(),
  setMascotState,
  save(session) {
    if (!getSetting("saveHistory")) return;
    saveEntry(session.toEntry(), session.input);
    sendToPanel("history", "history:changed");
  },
};

// Sets the buddy's state, optionally going back to idle after `ms`.
function setMascotState(state, ms) {
  clearTimeout(stateTimer);
  sendToMascot("mascot:state", state);
  if (ms) stateTimer = setTimeout(() => sendToMascot("mascot:state", "idle"), ms);
}

function currentMascot() {
  const all = listMascots();
  return all.find((m) => m.id === getSetting("mascot")) ?? all.find((m) => m.id === "normal") ?? all[0];
}

function chooseMascot(id) {
  setSettings({ mascot: id });
  sendToMascot("mascot:set", currentMascot());
  sendToPanel("settings", "settings:changed");
}

function chooseModel(id) {
  setSettings({ model: id });
  sendToPanel("settings", "settings:changed");
}

// Hotkey or click: snip part of the screen, then run the chosen tool on it.
async function snipScreen() {
  if (isSnipping()) return;
  closeLatestBubble();
  setMascotState("selecting");
  // Keep the buddy out of its own screenshot.
  setMascotOpacity(0);
  await wait(80);
  let choice;
  try {
    choice = await snip(menuItems(sessionApp.actions), snipOptions);
  } finally {
    setMascotOpacity(1);
  }
  if (!choice) return setMascotState("idle");
  new Session(sessionApp, choice).open({ actionId: choice.actionId, question: choice.question });
}

// Clipboard hotkey: offer the tools for whatever was last copied.
// `copied` replaces the real clipboard (the smoke test uses this).
function useClipboard(copied = readClipboard()) {
  if (isSnipping()) return;
  if (!copied) {
    setMascotState("error", 1600);
    const bubble = openBubble({
      title: "The clipboard is empty",
      preview: "Copy some text or an image first, then try again.",
      near: getMascotBounds(),
    });
    setTimeout(() => bubble.close(), 4000);
    return;
  }
  setMascotState("listening", 1200);
  new Session(sessionApp, copied).open({ title: copied.input.kind === "text" ? "Copied text" : "Copied image", focus: true });
}

function openHistoryEntry(id) {
  new Session(sessionApp, loadEntry(id)).open();
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  hotkeyErrors = [
    [getSetting("hotkey"), () => snipScreen()],
    [getSetting("clipboardHotkey"), () => useClipboard()],
  ]
    .filter(([key, fn]) => !globalShortcut.register(key, fn))
    .map(([key]) => `${formatKey(key)} is already in use by another app.`);
}

// Shared by the tray icon and right-clicking the mascot.
function buildMenu() {
  const mascot = currentMascot()?.id;
  const model = getSetting("model");
  return [
    { label: "Snip the screen", accelerator: getSetting("hotkey"), registerAccelerator: false, click: () => snipScreen() },
    { label: "Use the clipboard", accelerator: getSetting("clipboardHotkey"), registerAccelerator: false, click: () => useClipboard() },
    { label: "History…", click: () => openPanel("history") },
    { type: "separator" },
    {
      label: "Model",
      submenu: MODELS.map((m) => ({ label: m.label, type: "radio", checked: m.id === model, click: () => chooseModel(m.id) })),
    },
    {
      label: "Mascot",
      submenu: listMascots().map((m) => ({ label: m.name, type: "radio", checked: m.id === mascot, click: () => chooseMascot(m.id) })),
    },
    { label: isMascotVisible() ? "Hide buddy" : "Show buddy", click: () => toggleMascot() },
    { label: "Settings…", click: () => openPanel("settings") },
    { type: "separator" },
    { label: "Quit Page Helper", click: () => app.quit() },
  ];
}

ipcMain.handle("mascot:current", () => currentMascot());

ipcMain.handle("history:list", () => listEntries());
ipcMain.on("history:open", (_e, id) => openHistoryEntry(id));
ipcMain.handle("history:delete", (_e, id) => deleteEntry(id));
ipcMain.handle("history:clear", () => {
  clearHistory();
  sendToPanel("history", "history:changed");
});

ipcMain.handle("settings:get", () => ({
  model: getSetting("model"),
  mascot: currentMascot()?.id,
  hotkey: getSetting("hotkey"),
  clipboardHotkey: getSetting("clipboardHotkey"),
  hotkeyError: hotkeyErrors.join(" "),
  saveHistory: getSetting("saveHistory"),
  hasApiKey: hasApiKey(),
  models: MODELS,
  mascots: listMascots().map(({ id, name, description, images }) => ({ id, name, description, image: images.idle })),
}));

// Only the fields present in `changes` are updated. An apiKey of "" removes the key.
ipcMain.handle("settings:save", (_e, changes) => {
  try {
    if (changes.apiKey !== undefined) setApiKey(changes.apiKey.trim());
    if (MODELS.some((m) => m.id === changes.model)) setSettings({ model: changes.model });
    if (typeof changes.saveHistory === "boolean") setSettings({ saveHistory: changes.saveHistory });
    if (changes.mascot && changes.mascot !== currentMascot()?.id) chooseMascot(changes.mascot);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => toggleMascot(true));
  // The app lives in the tray, so closing every window must not quit it.
  app.on("window-all-closed", () => {});
  app.on("will-quit", () => globalShortcut.unregisterAll());

  app.whenReady().then(async () => {
    app.setAppUserModelId("com.pagehelper.buddy");
    loadSettings({ migrateFrom: smokeTest ? null : OLD_SETTINGS });
    sessionApp.actions = await loadActions();
    const mascotWindow = createMascotWindow({
      onActivate: snipScreen,
      onMenu: () => Menu.buildFromTemplate(buildMenu()).popup(),
    });
    createTray({ onClick: () => toggleMascot(), buildMenu });
    registerHotkeys();

    if (smokeTest) {
      runSmokeTest({
        mascotWindow,
        mascots: listMascots(),
        chooseMascot,
        snipScreen,
        useClipboard,
        openPanel,
        openBubble,
        saveEntry,
        useFakeScreen: (capture) => (snipOptions = { capture }),
      });
    } else if (!hasApiKey()) {
      openPanel("settings");
    }
  });
}

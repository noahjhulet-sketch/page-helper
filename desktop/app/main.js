// Desktop buddy entry point: connects the mascot window, tray icon, hotkey and settings.

import { app, globalShortcut, ipcMain, Menu } from "electron";
import path from "node:path";
import { MODELS } from "../../core/claude.js";
import { listMascots } from "./mascots.js";
import { createMascotWindow, isMascotVisible, sendToMascot, toggleMascot } from "./mascot-window.js";
import { getSetting, hasApiKey, loadSettings, setApiKey, setSettings } from "./settings.js";
import { openSettingsWindow, sendToSettings } from "./settings-window.js";
import { runSmokeTest } from "./smoke-test.js";
import { createTray } from "./tray.js";

const smokeTest = process.argv.includes("--smoke-test");
// The smoke test uses throwaway settings so it never touches the real ones.
if (smokeTest) app.setPath("userData", path.join(app.getPath("temp"), "page-helper-smoke-test"));

let hotkeyError = "";
let activateTimer;

function currentMascot() {
  const all = listMascots();
  return all.find((m) => m.id === getSetting("mascot")) ?? all.find((m) => m.id === "normal") ?? all[0];
}

function chooseMascot(id) {
  setSettings({ mascot: id });
  sendToMascot("mascot:set", currentMascot());
  sendToSettings("settings:changed");
}

// Hotkey or click. For now the buddy only shows that it heard you;
// Phase 2 opens the snipping overlay here.
function activate() {
  toggleMascot(true);
  sendToMascot("mascot:state", "listening");
  clearTimeout(activateTimer);
  activateTimer = setTimeout(() => sendToMascot("mascot:state", "idle"), 1200);
}

function registerHotkey() {
  globalShortcut.unregisterAll();
  const hotkey = getSetting("hotkey");
  hotkeyError = globalShortcut.register(hotkey, activate) ? "" : `${hotkey} is already in use by another app.`;
}

// Shared by the tray icon and right-clicking the mascot.
function buildMenu() {
  const selected = currentMascot()?.id;
  return [
    { label: isMascotVisible() ? "Hide buddy" : "Show buddy", click: () => toggleMascot() },
    {
      label: "Mascot",
      submenu: listMascots().map((m) => ({
        label: m.name,
        type: "radio",
        checked: m.id === selected,
        click: () => chooseMascot(m.id),
      })),
    },
    { label: "Settings…", click: openSettingsWindow },
    { type: "separator" },
    { label: "Quit Page Helper", click: () => app.quit() },
  ];
}

ipcMain.handle("mascot:current", () => currentMascot());

ipcMain.handle("settings:get", () => ({
  model: getSetting("model"),
  mascot: currentMascot()?.id,
  hotkey: getSetting("hotkey"),
  hotkeyError,
  hasApiKey: hasApiKey(),
  models: MODELS,
  mascots: listMascots().map(({ id, name, description, images }) => ({ id, name, description, image: images.idle })),
}));

// Only the fields present in `changes` are updated. An apiKey of "" removes the key.
ipcMain.handle("settings:save", (_e, changes) => {
  try {
    if (changes.apiKey !== undefined) setApiKey(changes.apiKey.trim());
    if (MODELS.some((m) => m.id === changes.model)) setSettings({ model: changes.model });
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
  // The app lives in the tray, so closing the Settings window must not quit it.
  app.on("window-all-closed", () => {});
  app.on("will-quit", () => globalShortcut.unregisterAll());

  app.whenReady().then(() => {
    app.setAppUserModelId("com.pagehelper.buddy");
    loadSettings();
    const mascotWindow = createMascotWindow({
      onActivate: activate,
      onMenu: () => Menu.buildFromTemplate(buildMenu()).popup(),
    });
    createTray({ onClick: () => toggleMascot(), buildMenu });
    registerHotkey();

    if (smokeTest) {
      runSmokeTest({ mascotWindow, mascots: listMascots(), chooseMascot, activate, openSettingsWindow });
    } else if (!hasApiKey()) {
      openSettingsWindow();
    }
  });
}

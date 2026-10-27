// Desktop buddy entry point: connects the mascot window, tray icon, hotkey and settings.

import { app, globalShortcut, ipcMain, Menu } from "electron";
import path from "node:path";
import { MODELS, isCancelled } from "../../core/claude.js";
import { isSnipping, snip } from "../inputs/snip.js";
import { loadActions, menuItems } from "./actions.js";
import { closeAnswer, openAnswer } from "./answer-window.js";
import { listMascots } from "./mascots.js";
import {
  createMascotWindow, getMascotBounds, isMascotVisible, sendToMascot, setMascotOpacity, toggleMascot,
} from "./mascot-window.js";
import { getApiKey, getSetting, hasApiKey, loadSettings, setApiKey, setSettings } from "./settings.js";
import { openSettingsWindow, sendToSettings } from "./settings-window.js";
import { runSmokeTest } from "./smoke-test.js";
import { createTray } from "./tray.js";

const smokeTest = process.argv.includes("--smoke-test");
// The smoke test uses throwaway settings so it never touches the real ones.
if (smokeTest) app.setPath("userData", path.join(app.getPath("temp"), "page-helper-smoke-test"));

let hotkeyError = "";
let actions = [];
let stateTimer;
let snipOptions = {}; // the smoke test swaps in a fake screenshot here

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  sendToSettings("settings:changed");
}

// Hotkey or click: snip part of the screen, then run the chosen tool on it.
async function activate() {
  if (isSnipping()) return;
  closeAnswer();
  setMascotState("selecting");
  // Keep the buddy out of its own screenshot.
  setMascotOpacity(0);
  await wait(80);
  let choice;
  try {
    choice = await snip(menuItems(actions), snipOptions);
  } finally {
    setMascotOpacity(1);
  }
  if (choice) runAction(choice);
  else setMascotState("idle");
}

async function runAction({ actionId, question, image, thumbnail }) {
  const action = actions.find((a) => a.id === actionId);
  const controller = new AbortController();
  const bubble = openAnswer({
    title: question ? `${action.label}: ${question}` : action.label,
    thumbnail,
    near: getMascotBounds(),
    onClose: () => controller.abort(),
  });
  setMascotState("thinking");

  try {
    const markdown = await action.run({
      image,
      question,
      settings: { apiKey: getApiKey(), model: getSetting("model") },
      signal: controller.signal,
      onText: (text) => {
        setMascotState("talking");
        bubble.update(text, "streaming");
      },
    });
    bubble.update(markdown, "done");
    setMascotState("talking", 1500);
  } catch (err) {
    if (controller.signal.aborted || isCancelled(err)) return setMascotState("idle");
    console.error(err);
    bubble.fail(err.message);
    setMascotState("error", 1600);
  }
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

  app.whenReady().then(async () => {
    app.setAppUserModelId("com.pagehelper.buddy");
    loadSettings();
    actions = await loadActions();
    const mascotWindow = createMascotWindow({
      onActivate: activate,
      onMenu: () => Menu.buildFromTemplate(buildMenu()).popup(),
    });
    createTray({ onClick: () => toggleMascot(), buildMenu });
    registerHotkey();

    if (smokeTest) {
      runSmokeTest({
        mascotWindow,
        mascots: listMascots(),
        chooseMascot,
        activate,
        openSettingsWindow,
        openAnswer,
        useFakeScreen: (capture) => (snipOptions = { capture }),
      });
    } else if (!hasApiKey()) {
      openSettingsWindow();
    }
  });
}

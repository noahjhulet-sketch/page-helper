// The floating buddy: a small transparent window that stays on top of everything.
// Clicks pass through it except over the mascot itself.

import { BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { keepClear } from "./layout.js";
import { getSetting, setSettings } from "./settings.js";

const SIZE = 140; // larger than any mascot, so animations have room
const BOTTOM_PAD = 14; // space under the mascot inside the window (matches mascot.css)
// His home spot: near the top-left of the main screen, out of the way but not
// hugging the corner. (The window's top part is empty room for animations, so
// he himself sits about 60px further down.)
const HOME = { x: 48, y: 4 };

let win;
let dragTimer = null;

export function createMascotWindow({ onActivate, onMenu, onHover, onDragStart }) {
  win = new BrowserWindow({
    ...startBounds(),
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    show: false,
    webPreferences: { preload: path.join(import.meta.dirname, "preload.cjs") },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setIgnoreMouseEvents(true, { forward: true });
  keepClear(win); // new windows open around him, not on top of him
  win.loadFile(path.join(import.meta.dirname, "ui", "mascot.html"));
  win.once("ready-to-show", () => win.showInactive());

  ipcMain.on("mascot:ignore-mouse", (_e, ignore) => win.setIgnoreMouseEvents(ignore, { forward: true }));
  ipcMain.on("mascot:drag-start", (_e, offset) => {
    onDragStart();
    startDrag(offset);
  });
  ipcMain.on("mascot:drag-end", endDrag);
  ipcMain.on("mascot:activate", onActivate);
  ipcMain.on("mascot:menu", onMenu);
  ipcMain.on("mascot:hover", onHover);

  // A monitor was unplugged or rearranged: bring the buddy back if it ended up off screen.
  const keepOnScreen = () => {
    if (!isOnScreen(win.getBounds())) win.setBounds(defaultBounds());
  };
  screen.on("display-removed", keepOnScreen);
  screen.on("display-metrics-changed", keepOnScreen);

  return win;
}

export function sendToMascot(channel, ...args) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

export function getMascotBounds() {
  return win.getBounds();
}

// Where the mascot himself is on screen: a `size`-pixel square at the bottom
// center of his window. Null once the window is gone (the app is quitting).
export function getMascotImageBounds(size) {
  if (!win || win.isDestroyed()) return null;
  const b = win.getBounds();
  return { x: b.x + Math.round((SIZE - size) / 2), y: b.y + SIZE - BOTTOM_PAD - size, width: size, height: size };
}

// Hidden this way (rather than win.hide()) so it can vanish for a screenshot
// without changing whether the person has chosen to show it.
export function setMascotOpacity(opacity) {
  win.setOpacity(opacity);
}

export function isMascotVisible() {
  return win?.isVisible() ?? false;
}

export function toggleMascot(visible = !isMascotVisible()) {
  if (visible) win.showInactive();
  else win.hide();
}

function startBounds() {
  const saved = getSetting("position");
  return saved && isOnScreen(saved) ? { ...saved, width: SIZE, height: SIZE } : defaultBounds();
}

function defaultBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return { x: workArea.x + HOME.x, y: workArea.y + HOME.y, width: SIZE, height: SIZE };
}

function isOnScreen({ x, y }) {
  const cx = x + SIZE / 2;
  const cy = y + SIZE / 2;
  return screen.getAllDisplays().some(({ workArea: a }) => cx >= a.x && cx < a.x + a.width && cy >= a.y && cy < a.y + a.height);
}

function startDrag({ offsetX, offsetY }) {
  clearInterval(dragTimer);
  // Follow the cursor itself rather than the window's mouse events, which stop
  // when a fast drag outruns the window.
  let last = win.getBounds();
  dragTimer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    const next = { x: p.x - offsetX, y: p.y - offsetY };
    // setBounds with a fixed size: setPosition can resize the window when it
    // crosses monitors with different display scaling.
    win.setBounds({ ...next, width: SIZE, height: SIZE });
    // Tell the page how far he moved, so he can sway with it.
    win.webContents.send("mascot:moved", { dx: next.x - last.x, dy: next.y - last.y });
    last = next;
  }, 16);
}

function endDrag() {
  clearInterval(dragTimer);
  dragTimer = null;
  if (!isOnScreen(win.getBounds())) win.setBounds(defaultBounds());
  const { x, y } = win.getBounds();
  setSettings({ position: { x, y } });
}

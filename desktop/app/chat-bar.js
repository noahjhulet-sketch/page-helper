// The chat bar: a slim box that slides out under the buddy when you hover over
// him. Type a question to start a chat, or use its buttons to snip the screen or
// use the clipboard. It hides shortly after the pointer leaves both the buddy and
// the bar, unless you've clicked into it.

import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";

const WIDTH = 360;
const HEIGHT = 64; // includes room around the bar for its shadow
const GAP = 2;
const HIDE_AFTER = 500; // ms with the pointer away before it hides

let win = null;
let anchor = null; // () => the buddy's on-screen bounds
let watchTimer = null;
let awaySince = null;

// `getAnchor` returns the bounds of the buddy himself (not his whole window), or
// null once his window is gone.
export function createChatBar({ getAnchor, onAsk, onSnip, onClipboard, onFiles }) {
  anchor = getAnchor;
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: { preload: path.join(import.meta.dirname, "preload.cjs") },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.loadFile(path.join(import.meta.dirname, "ui", "chat-bar.html"));

  const from = (fn) => (e, ...args) => e.sender === win.webContents && fn(...args);
  ipcMain.on("bar:ask", from((question) => {
    hideChatBar({ clear: true });
    onAsk(question);
  }));
  ipcMain.on("bar:snip", from(() => {
    hideChatBar();
    onSnip();
  }));
  ipcMain.on("bar:clipboard", from(() => {
    hideChatBar();
    onClipboard();
  }));
  ipcMain.on("bar:close", from(() => hideChatBar()));
  // Dropped files (paths), or [] for the 📄 button (pick files).
  ipcMain.on("bar:files", from((paths) => {
    hideChatBar();
    onFiles(paths);
  }));
  app.on("before-quit", () => clearInterval(watchTimer));
  return win;
}

export function showChatBar() {
  if (!win || win.isDestroyed() || win.isVisible() || !anchor()) return;
  win.setBounds({ ...placement(), width: WIDTH, height: HEIGHT });
  win.showInactive();
  win.webContents.send("bar:shown");
  watchPointer();
}

export function hideChatBar({ clear = false } = {}) {
  clearInterval(watchTimer);
  if (!win || win.isDestroyed() || !win.isVisible()) return;
  win.hide();
  if (clear) win.webContents.send("bar:clear");
}

// Right below the buddy, centered. If there's no room below (he's near the bottom
// of the screen), just above him instead.
function placement() {
  const a = anchor();
  const { workArea } = screen.getDisplayMatching(a);
  const x = Math.round(a.x + a.width / 2 - WIDTH / 2);
  let y = a.y + a.height + GAP;
  if (y + HEIGHT > workArea.y + workArea.height) y = a.y - HEIGHT - GAP;
  return { x: Math.min(Math.max(workArea.x, x), workArea.x + workArea.width - WIDTH), y };
}

// Hide once the pointer has been away from the buddy and the bar for a moment.
// Clicking into the bar keeps it open until you click somewhere else.
function watchPointer() {
  clearInterval(watchTimer);
  awaySince = null;
  watchTimer = setInterval(() => {
    // The app is quitting and its windows are already gone.
    if (!win || win.isDestroyed() || !anchor()) return clearInterval(watchTimer);
    const p = screen.getCursorScreenPoint();
    const near = win.isFocused() || inside(p, win.getBounds()) || inside(p, grow(anchor(), 10));
    if (near) awaySince = null;
    else if (!awaySince) awaySince = Date.now();
    else if (Date.now() - awaySince > HIDE_AFTER) hideChatBar();
  }, 100);
}

const inside = (p, r) => p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;
const grow = (r, by) => ({ x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 });

// Shows the bar and puts the cursor in it (the "New chat" menu item).
export function openChatBar() {
  showChatBar();
  win.show();
  win.focus();
}

// The answer bubble: a card beside the buddy that shows Claude's reply as it
// streams in. Closing it cancels the request.

import { BrowserWindow, clipboard, ipcMain, screen, shell } from "electron";
import path from "node:path";
import { renderMarkdown } from "../../core/markdown.js";

const WIDTH = 440;
const MIN_HEIGHT = 140;
const MAX_HEIGHT = 600;
const GAP = 4;

let win = null;
let current = null; // { state, onClose } for the open bubble

ipcMain.on("answer:resize", (e, height) => {
  if (!win || e.sender !== win.webContents) return;
  // Grow upward, keeping the bottom edge level with the buddy.
  const b = win.getBounds();
  const { workArea } = screen.getDisplayMatching(b);
  const h = Math.min(Math.max(Math.ceil(height), MIN_HEIGHT), MAX_HEIGHT, workArea.height);
  const y = Math.max(workArea.y, b.y + b.height - h);
  win.setBounds({ x: b.x, y, width: WIDTH, height: h });
});
ipcMain.on("answer:copy", () => clipboard.writeText(current?.state.markdown ?? ""));
ipcMain.on("answer:close", () => closeAnswer());

// `near` is the buddy's window bounds. Returns { update(markdown, status), fail(message) }.
export function openAnswer({ title, thumbnail, near, onClose }) {
  closeAnswer();
  const mine = new BrowserWindow({
    ...placement(near),
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: { preload: path.join(import.meta.dirname, "preload.cjs") },
  });
  win = mine;
  current = { state: { title, thumbnail, status: "thinking", markdown: "", html: "", error: "" }, onClose };

  mine.setAlwaysOnTop(true, "screen-saver");
  // Links in answers open in the default browser, never inside the app.
  mine.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mine.webContents.on("will-navigate", (e) => e.preventDefault());
  mine.loadFile(path.join(import.meta.dirname, "ui", "answer.html"));
  mine.webContents.once("did-finish-load", () => {
    send();
    mine.showInactive();
  });
  mine.on("closed", () => {
    if (win === mine) closeAnswer();
  });

  const send = () => win === mine && mine.webContents.send("answer:update", current.state);
  return {
    window: mine,
    update(markdown, status) {
      if (win !== mine) return;
      Object.assign(current.state, { markdown, html: renderMarkdown(markdown), status });
      if (!mine.webContents.isLoading()) send();
    },
    fail(message) {
      if (win !== mine) return;
      Object.assign(current.state, { status: "error", error: message });
      if (!mine.webContents.isLoading()) send();
    },
  };
}

export function closeAnswer() {
  if (!win) return;
  const closing = win;
  const { onClose } = current;
  win = null;
  current = null;
  if (!closing.isDestroyed()) closing.destroy();
  onClose?.();
}

// Beside the buddy (left if there's room, else right), bottoms aligned.
function placement(near) {
  const { workArea: a } = screen.getDisplayMatching(near);
  let x = near.x - WIDTH - GAP;
  if (x < a.x) x = near.x + near.width + GAP;
  x = Math.min(Math.max(a.x, x), a.x + a.width - WIDTH);
  const y = Math.min(Math.max(a.y, near.y + near.height - MIN_HEIGHT), a.y + a.height - MIN_HEIGHT);
  return { x, y, width: WIDTH, height: MIN_HEIGHT };
}

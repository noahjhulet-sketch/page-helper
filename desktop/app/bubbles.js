// Answer bubbles: cards beside the buddy showing Claude's replies, with a box for
// follow-up questions. The newest bubble is replaced by the next snip unless it's
// pinned; pinned bubbles stay until you close them.

import { BrowserWindow, clipboard, ipcMain, screen, shell } from "electron";
import path from "node:path";
import { renderMarkdown } from "../../core/markdown.js";
import { findSpot } from "./layout.js";

const WIDTH = 460;
const MIN_HEIGHT = 150;
const MAX_HEIGHT = 640;
const ROOM = 440; // height kept clear for a new bubble to grow into
const GAP = 4;

const bubbles = new Map(); // webContents id → Bubble
let latest = null;

const from = (e) => bubbles.get(e.sender.id);
ipcMain.on("bubble:resize", (e, height) => from(e)?.fit(height));
ipcMain.on("bubble:copy", (e, index) => from(e)?.copy(index));
ipcMain.on("bubble:pin", (e) => from(e)?.togglePin());
ipcMain.on("bubble:close", (e) => from(e)?.close());
ipcMain.on("bubble:ask", (e, question) => from(e)?.handlers.onAsk?.(question));
ipcMain.on("bubble:choose", (e, { actionId, question }) => from(e)?.handlers.onChoose?.(actionId, question));
ipcMain.on("bubble:attach", (e, how) => from(e)?.handlers.onAttach?.(how));
ipcMain.on("bubble:attach-files", (e, paths) => from(e)?.handlers.onAttachFiles?.(paths));
ipcMain.on("bubble:remove-pending", (e, position) => from(e)?.handlers.onRemovePending?.(position));
ipcMain.on("bubble:decide", (e, { turn, action, choice }) => from(e)?.handlers.onDecide?.(turn, action, choice));

// Opens a bubble, first closing the previous one unless it's pinned.
// Handlers: onAsk(question), onChoose(actionId, question), onAttach("snip" | "clipboard" | "file"),
// onAttachFiles(paths),
// onRemovePending(position), onDecide(turn, action, "allow" | "always" | "skip"), onClose().
export function openBubble(options) {
  if (latest && !latest.state.pinned) latest.close();
  latest = new Bubble(options);
  return latest;
}

export function closeLatestBubble() {
  if (latest && !latest.state.pinned) latest.close();
}

// Hides every bubble without closing it, so they stay out of a screenshot.
export function setBubblesOpacity(opacity) {
  for (const bubble of bubbles.values()) bubble.win.setOpacity(opacity);
}

class Bubble {
  // `menu`: tools to offer before anything has run (used for clipboard content).
  // `near`: the buddy's window bounds. `focus`: take keyboard focus when shown.
  constructor({ title, thumbnail = "", preview = "", menu = null, turns = [], near, focus = false, ...handlers }) {
    this.handlers = handlers;
    // `pending`: attachments waiting to be sent with the next question.
    this.state = { title, thumbnail, preview, menu, pinned: false, busy: false, turns: [], pending: [], notice: "" };
    for (const t of turns) this.state.turns.push(this.#turn(t, t.markdown, "done"));

    const { bounds, growDown } = placement(near);
    this.growDown = growDown;
    this.win = new BrowserWindow({
      ...bounds,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      show: false,
      webPreferences: { preload: path.join(import.meta.dirname, "preload.cjs") },
    });
    this.id = this.win.webContents.id;
    bubbles.set(this.id, this);

    this.win.setAlwaysOnTop(true, "screen-saver");
    // Links in answers open in the default browser, never inside the app.
    this.win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      return { action: "deny" };
    });
    this.win.webContents.on("will-navigate", (e) => e.preventDefault());
    this.win.loadFile(path.join(import.meta.dirname, "ui", "bubble.html"));
    this.loaded = false;
    this.win.webContents.once("did-finish-load", () => {
      this.loaded = true;
      this.send();
      if (focus) this.win.show();
      else this.win.showInactive();
    });
    this.win.on("closed", () => this.close());
  }

  get closed() {
    return !bubbles.has(this.id);
  }

  // Starts a new answer and returns its index. `attachments`: [{ thumbnail, preview }]
  // sent with the question.
  addTurn(turn) {
    this.state.turns.push(this.#turn(turn, "", "thinking"));
    Object.assign(this.state, { menu: null, busy: true });
    this.send();
    return this.state.turns.length - 1;
  }

  setTitle(title) {
    this.state.title = title;
    this.send();
  }

  // Things done (or waiting to be approved) on the computer during an answer.
  setActions(index, actions) {
    this.state.turns[index].actions = actions.map((a) => ({ ...a }));
    this.send();
  }

  setPending(pending) {
    Object.assign(this.state, { pending, notice: "" });
    this.send();
  }

  // A short message above the question box, such as "The clipboard is empty".
  notify(notice) {
    this.state.notice = notice;
    this.send();
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.state.notice = "";
      this.send();
    }, 3500);
  }

  focus() {
    if (this.closed) return;
    this.win.show();
    this.win.focus();
  }

  updateTurn(index, markdown, status) {
    Object.assign(this.state.turns[index], { markdown, html: renderMarkdown(markdown), status });
    if (status === "done") this.state.busy = false;
    this.send();
  }

  failTurn(index, message) {
    Object.assign(this.state.turns[index], { status: "error", error: message });
    this.state.busy = false;
    this.send();
  }

  copy(index) {
    clipboard.writeText(this.state.turns[index]?.markdown ?? "");
  }

  togglePin() {
    this.state.pinned = !this.state.pinned;
    this.send();
  }

  // Fit the window to its content. Bubbles in the top half of the screen grow
  // downward (top edge stays put); lower ones grow upward (bottom edge stays put).
  fit(height) {
    if (this.closed) return;
    const b = this.win.getBounds();
    const { workArea: a } = screen.getDisplayMatching(b);
    const h = Math.min(Math.max(Math.ceil(height), MIN_HEIGHT), MAX_HEIGHT, a.height);
    const y = this.growDown ? Math.min(b.y, a.y + a.height - h) : Math.max(a.y, b.y + b.height - h);
    this.win.setBounds({ x: b.x, y, width: WIDTH, height: h });
  }

  close() {
    if (this.closed) return;
    bubbles.delete(this.id);
    if (latest === this) latest = null;
    if (!this.win.isDestroyed()) this.win.destroy();
    this.handlers.onClose?.();
  }

  send() {
    if (this.loaded && !this.closed) this.win.webContents.send("bubble:update", this.state);
  }

  #turn({ question, label, attachments = [], actions = [] }, markdown, status) {
    return { question, label, attachments, actions, markdown, html: renderMarkdown(markdown), status, error: "" };
  }
}

// Ideally right beside the buddy (to his right if there's room, else his left),
// level with him; otherwise the nearest spot that doesn't cover another window.
// Room is kept for the bubble to grow to a typical answer's height.
function placement(near) {
  const { workArea: a } = screen.getDisplayMatching(near);
  let x = near.x + near.width + GAP;
  if (x + WIDTH > a.x + a.width) x = near.x - WIDTH - GAP;
  const spot = findSpot({ width: WIDTH, height: ROOM }, { x, y: near.y });
  const growDown = spot.y + ROOM / 2 < a.y + a.height / 2;
  return {
    bounds: { x: spot.x, y: growDown ? spot.y : spot.y + ROOM - MIN_HEIGHT, width: WIDTH, height: MIN_HEIGHT },
    growDown,
  };
}

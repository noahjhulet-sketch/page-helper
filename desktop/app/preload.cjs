// Bridge between the app's windows and the main process. Pages get only these
// functions, never Node or Electron directly.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("buddy", {
  // Mascot window
  currentMascot: () => ipcRenderer.invoke("mascot:current"),
  onMascot: (fn) => ipcRenderer.on("mascot:set", (_e, mascot) => fn(mascot)),
  onState: (fn) => ipcRenderer.on("mascot:state", (_e, state) => fn(state)),
  ignoreMouse: (ignore) => ipcRenderer.send("mascot:ignore-mouse", ignore),
  dragStart: (offset) => ipcRenderer.send("mascot:drag-start", offset),
  dragEnd: () => ipcRenderer.send("mascot:drag-end"),
  activate: () => ipcRenderer.send("mascot:activate"),
  openMenu: () => ipcRenderer.send("mascot:menu"),

  hoverMascot: () => ipcRenderer.send("mascot:hover"),

  // Chat bar
  barAsk: (question) => ipcRenderer.send("bar:ask", question),
  barSnip: () => ipcRenderer.send("bar:snip"),
  barClipboard: () => ipcRenderer.send("bar:clipboard"),
  barClose: () => ipcRenderer.send("bar:close"),
  onBarShown: (fn) => ipcRenderer.on("bar:shown", () => fn()),
  onBarClear: (fn) => ipcRenderer.on("bar:clear", () => fn()),

  // Snip overlay
  snipInit: () => ipcRenderer.invoke("snip:init"),
  snipSelecting: () => ipcRenderer.send("snip:selecting"),
  snipDone: (choice) => ipcRenderer.send("snip:done", choice),
  snipCancel: () => ipcRenderer.send("snip:cancel"),
  onSnipClear: (fn) => ipcRenderer.on("snip:clear", () => fn()),

  // Answer bubble
  onBubble: (fn) => ipcRenderer.on("bubble:update", (_e, state) => fn(state)),
  resizeBubble: (height) => ipcRenderer.send("bubble:resize", height),
  chooseTool: (choice) => ipcRenderer.send("bubble:choose", choice),
  askFollowUp: (question) => ipcRenderer.send("bubble:ask", question),
  attach: (how) => ipcRenderer.send("bubble:attach", how),
  removePending: (position) => ipcRenderer.send("bubble:remove-pending", position),
  copyAnswer: (index) => ipcRenderer.send("bubble:copy", index),
  pinBubble: () => ipcRenderer.send("bubble:pin"),
  closeBubble: () => ipcRenderer.send("bubble:close"),

  // History window
  listHistory: () => ipcRenderer.invoke("history:list"),
  openHistoryEntry: (id) => ipcRenderer.send("history:open", id),
  deleteHistoryEntry: (id) => ipcRenderer.invoke("history:delete", id),
  clearHistory: () => ipcRenderer.invoke("history:clear"),
  onHistoryChanged: (fn) => ipcRenderer.on("history:changed", () => fn()),

  // Settings window
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (changes) => ipcRenderer.invoke("settings:save", changes),
  onSettingsChanged: (fn) => ipcRenderer.on("settings:changed", () => fn()),
});

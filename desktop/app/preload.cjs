// Bridge between the app's windows and the main process. Pages get only these
// functions, never Node or Electron directly.

const { contextBridge, ipcRenderer, webUtils } = require("electron");

// Where dropped files are on disk (pages can't see file paths themselves).
const pathsOf = (files) => [...files].map((file) => webUtils.getPathForFile(file)).filter(Boolean);

contextBridge.exposeInMainWorld("buddy", {
  // Mascot window
  currentMascot: () => ipcRenderer.invoke("mascot:current"),
  onMascot: (fn) => ipcRenderer.on("mascot:set", (_e, mascot) => fn(mascot)),
  onState: (fn) => ipcRenderer.on("mascot:state", (_e, state) => fn(state)),
  onMoved: (fn) => ipcRenderer.on("mascot:moved", (_e, step) => fn(step)),
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
  barFiles: (files) => ipcRenderer.send("bar:files", pathsOf(files)),
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
  attachFiles: (files) => ipcRenderer.send("bubble:attach-files", pathsOf(files)),
  removePending: (position) => ipcRenderer.send("bubble:remove-pending", position),
  decide: (turn, action, choice) => ipcRenderer.send("bubble:decide", { turn, action, choice }),
  copyAnswer: (index) => ipcRenderer.send("bubble:copy", index),
  pinBubble: () => ipcRenderer.send("bubble:pin"),
  closeBubble: () => ipcRenderer.send("bubble:close"),

  // History window
  listHistory: () => ipcRenderer.invoke("history:list"),
  openHistoryEntry: (id) => ipcRenderer.send("history:open", id),
  deleteHistoryEntry: (id) => ipcRenderer.invoke("history:delete", id),
  clearHistory: () => ipcRenderer.invoke("history:clear"),
  onHistoryChanged: (fn) => ipcRenderer.on("history:changed", () => fn()),

  // Flashcards window
  listDecks: () => ipcRenderer.invoke("decks:list"),
  getDeck: (id) => ipcRenderer.invoke("decks:get", id),
  markCard: (id, index, known) => ipcRenderer.invoke("decks:mark", id, index, known),
  deleteDeck: (id) => ipcRenderer.invoke("decks:delete", id),
  onDecksChanged: (fn) => ipcRenderer.on("decks:changed", () => fn()),

  // Notes window
  listNotes: () => ipcRenderer.invoke("notes:list"),
  readNote: (id) => ipcRenderer.invoke("notes:read", id),
  currentNote: () => ipcRenderer.invoke("notes:current"),
  saveNote: (id, text) => ipcRenderer.invoke("notes:save", id, text),
  createNote: (title) => ipcRenderer.invoke("notes:create", title),
  renameNote: (id, title) => ipcRenderer.invoke("notes:rename", id, title),
  deleteNote: (id) => ipcRenderer.invoke("notes:delete", id),
  renderMarkdown: (text) => ipcRenderer.invoke("notes:render", text),
  askAboutNote: (id) => ipcRenderer.send("notes:ask", id),
  showNotesFolder: () => ipcRenderer.send("notes:show-folder"),
  onNotesChanged: (fn) => ipcRenderer.on("notes:changed", () => fn()),

  // First-run setup window
  checkApiKey: (key) => ipcRenderer.invoke("setup:check-key", key),
  openKeyPage: () => ipcRenderer.send("setup:open-key-page"),
  finishSetup: () => ipcRenderer.send("setup:finish"),

  // Settings window
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (changes) => ipcRenderer.invoke("settings:save", changes),
  onSettingsChanged: (fn) => ipcRenderer.on("settings:changed", () => fn()),
});

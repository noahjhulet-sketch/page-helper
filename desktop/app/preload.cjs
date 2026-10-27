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

  // Settings window
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (changes) => ipcRenderer.invoke("settings:save", changes),
  onSettingsChanged: (fn) => ipcRenderer.on("settings:changed", () => fn()),
});

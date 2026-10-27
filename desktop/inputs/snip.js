// Screen snip: takes a screenshot of every monitor, covers each with a frozen copy,
// and lets you drag a box and pick a tool. Resolves with the cropped image and the
// chosen tool, or null if you cancel.

import { BrowserWindow, desktopCapturer, ipcMain, screen } from "electron";
import path from "node:path";

const APP_DIR = path.join(import.meta.dirname, "..", "app");
const MAX_EDGE = 2576; // largest image side Claude reads at full detail
const MAX_BASE64 = 5 * 1024 * 1024; // API limit per image

let session = null; // the snip in progress: { overlays: Map<webContentsId, {win, display, shot}>, resolve, menu }

ipcMain.handle("snip:init", (e) => {
  const overlay = session?.overlays.get(e.sender.id);
  if (!overlay) return null;
  return { screenshot: overlay.shot.toDataURL(), actions: session.menu };
});
ipcMain.on("snip:done", (e, choice) => {
  const overlay = session?.overlays.get(e.sender.id);
  if (overlay) finish({ ...choice, ...crop(overlay, choice.rect) });
});
ipcMain.on("snip:cancel", () => finish(null));
// A new box on one monitor clears the box on the others.
ipcMain.on("snip:selecting", (e) => {
  for (const [id, { win }] of session?.overlays ?? []) if (id !== e.sender.id) win.webContents.send("snip:clear");
});

export function isSnipping() {
  return session !== null;
}

// `menu` is the list of tools to offer: [{ id, label, icon, needsQuestion }].
// `capture` replaces the real screenshot (the smoke test uses this).
export async function snip(menu, { capture = captureDisplays } = {}) {
  if (session) return null;
  const displays = screen.getAllDisplays();
  const shots = await capture(displays);

  return new Promise((resolve) => {
    session = { overlays: new Map(), resolve, menu };
    const cursor = screen.getCursorScreenPoint();
    displays.forEach((display, i) => {
      const win = createOverlay(display);
      session.overlays.set(win.webContents.id, { win, display, shot: shots[i] });
      win.once("ready-to-show", () => {
        win.show();
        // Keyboard focus goes to the monitor the pointer is on, so Esc works right away.
        if (display.id === screen.getDisplayNearestPoint(cursor).id) win.focus();
      });
    });
  });
}

function finish(result) {
  if (!session) return;
  const { overlays, resolve } = session;
  session = null;
  for (const { win } of overlays.values()) win.destroy();
  resolve(result);
}

async function captureDisplays(displays) {
  const largest = displays.reduce(
    (max, d) => ({
      width: Math.max(max.width, Math.round(d.bounds.width * d.scaleFactor)),
      height: Math.max(max.height, Math.round(d.bounds.height * d.scaleFactor)),
    }),
    { width: 0, height: 0 },
  );
  const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: largest });
  // Match by display id; fall back to order when Windows doesn't report ids.
  return displays.map((d, i) => (sources.find((s) => s.display_id === String(d.id)) ?? sources[i]).thumbnail);
}

function createOverlay(display) {
  const win = new BrowserWindow({
    ...display.bounds,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    fullscreenable: false,
    enableLargerThanScreen: true,
    backgroundColor: "#000000",
    show: false,
    webPreferences: { preload: path.join(APP_DIR, "preload.cjs") },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  // Set again after creation: on mixed-scaling setups the first size can come out wrong.
  win.setBounds(display.bounds);
  win.loadFile(path.join(APP_DIR, "ui", "overlay.html"));
  return win;
}

// `rect` is in the overlay's CSS pixels; the screenshot may be at a higher resolution.
function crop({ display, shot }, rect) {
  const scale = shot.getSize().width / display.bounds.width;
  const size = shot.getSize();
  const x = Math.max(0, Math.round(rect.x * scale));
  const y = Math.max(0, Math.round(rect.y * scale));
  let image = shot.crop({
    x,
    y,
    width: Math.min(size.width - x, Math.round(rect.width * scale)),
    height: Math.min(size.height - y, Math.round(rect.height * scale)),
  });

  const { width, height } = image.getSize();
  if (Math.max(width, height) > MAX_EDGE) {
    image = image.resize(width >= height ? { width: MAX_EDGE, quality: "best" } : { height: MAX_EDGE, quality: "best" });
  }

  let data = image.toPNG().toString("base64");
  let mediaType = "image/png";
  if (data.length > MAX_BASE64) {
    data = image.toJPEG(85).toString("base64");
    mediaType = "image/jpeg";
  }
  return {
    input: { kind: "image", data, mediaType },
    thumbnail: image.resize({ height: 80, quality: "good" }).toDataURL(),
  };
}

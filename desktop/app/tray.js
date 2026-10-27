// Tray icon (bottom-right of the taskbar). Left-click shows or hides the buddy;
// right-click opens the same menu as right-clicking the mascot.

import { Menu, Tray, nativeImage } from "electron";

let tray;

export function createTray({ onClick, buildMenu }) {
  tray = new Tray(drawIcon());
  tray.setToolTip("Page Helper");
  tray.on("click", onClick);
  tray.on("right-click", () => tray.popUpContextMenu(Menu.buildFromTemplate(buildMenu())));
}

// A purple dot drawn in code, so the app needs no icon file until there is real art.
function drawIcon(size = 32) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = (size - 1) / 2;
  const radius = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const alpha = Math.max(0, Math.min(1, radius - Math.hypot(x - center, y - center) + 0.5));
      const i = (y * size + x) * 4;
      // BGRA, premultiplied by alpha. Color #7C5CFF.
      pixels[i] = Math.round(0xff * alpha);
      pixels[i + 1] = Math.round(0x5c * alpha);
      pixels[i + 2] = Math.round(0x7c * alpha);
      pixels[i + 3] = Math.round(0xff * alpha);
    }
  }
  return nativeImage.createFromBitmap(pixels, { width: size, height: size });
}

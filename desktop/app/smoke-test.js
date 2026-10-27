// `npm run smoke-test`: starts the app with throwaway settings, saves a screenshot of
// each mascot (idle and listening) and of the Settings window, then quits.
// Screenshots go to the folder in SMOKE_OUT, or a temp folder if it isn't set.

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runSmokeTest({ mascotWindow, mascots, chooseMascot, activate, openSettingsWindow }) {
  const out = process.env.SMOKE_OUT || path.join(app.getPath("userData"), "screenshots");
  fs.mkdirSync(out, { recursive: true });
  const save = async (win, name) => fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toPNG());

  app.on("web-contents-created", (_e, contents) => watchConsole(contents));
  watchConsole(mascotWindow.webContents);

  await wait(1500);
  for (const mascot of mascots) {
    chooseMascot(mascot.id);
    await wait(500);
    await save(mascotWindow, `mascot-${mascot.id}.png`);
    activate();
    await wait(350);
    await save(mascotWindow, `mascot-${mascot.id}-listening.png`);
    await wait(1200);
  }

  const settingsWindow = openSettingsWindow();
  await wait(1500);
  await save(settingsWindow, "settings.png");

  console.log(`Smoke test screenshots saved to ${out}`);
  app.quit();
}

function watchConsole(contents) {
  contents.on("console-message", (event) => console.log(`[page] ${event.message}`));
  contents.on("preload-error", (_e, file, err) => console.log(`[preload error] ${file}: ${err.message}`));
}

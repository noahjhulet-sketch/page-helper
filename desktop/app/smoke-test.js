// `npm run smoke-test`: starts the app with throwaway settings and walks through it,
// saving screenshots: each mascot, the snip overlay (on a fake worksheet instead of
// your real screen), the answer bubble, and Settings. Then it quits.
// Screenshots go to the folder in SMOKE_OUT, or a temp folder if it isn't set.

import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const FAKE_SCREEN = `<body style="margin:0;font:22px Georgia,serif;background:#fafaf7;color:#222">
  <div style="margin:80px 120px;max-width:640px">
    <h2>Worksheet 3: The Water Cycle</h2>
    <p>1. Water turning into vapor because of heat is called ________.</p>
    <p>2. Clouds form when water vapor cools and goes through ________.</p>
    <p>3. Rain, snow and hail are all kinds of ________.</p>
  </div></body>`;

const SAMPLE_ANSWER = `**1.** Water turning into vapor because of heat is called ____.

→ **evaporation** · high confidence

Heat gives water molecules enough energy to escape into the air as vapor.

---

**2.** Clouds form when water vapor cools and goes through ____.

→ **condensation** · high confidence

Cooling vapor turns back into tiny droplets, which gather into clouds. See [the USGS water cycle page](https://www.usgs.gov/special-topics/water-science-school).`;

export async function runSmokeTest({ mascotWindow, mascots, chooseMascot, activate, openSettingsWindow, openAnswer, useFakeScreen }) {
  const out = process.env.SMOKE_OUT || path.join(app.getPath("userData"), "screenshots");
  fs.mkdirSync(out, { recursive: true });
  const save = async (win, name) => fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toPNG());
  const findWindow = (page) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().endsWith(page));
  const inPage = (win, js) => win.webContents.executeJavaScript(js);

  app.on("web-contents-created", (_e, contents) => watchConsole(contents));
  watchConsole(mascotWindow.webContents);
  await wait(1500);

  for (const mascot of mascots) {
    chooseMascot(mascot.id);
    await wait(500);
    await save(mascotWindow, `mascot-${mascot.id}.png`);
  }
  chooseMascot("normal");

  // Snip a fake worksheet: drag a box, check the menu, pick Explain. With no API key
  // saved, the bubble should show the "add your key" message.
  useFakeScreen(fakeScreen);
  activate();
  await wait(2000);
  const overlay = findWindow("overlay.html");
  await save(overlay, "snip-start.png");
  await inPage(overlay, `
    const fire = (type, x, y) => document.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true }));
    fire("pointerdown", 100, 60); fire("pointermove", 400, 200); fire("pointermove", 820, 330); fire("pointerup", 820, 330);`);
  await wait(400);
  await save(overlay, "snip-menu.png");
  await inPage(overlay, `[...document.querySelectorAll(".actions button")].find((b) => b.textContent.includes("Explain")).click()`);
  await wait(1500);
  await save(findWindow("answer.html"), "answer-no-key.png");

  // A finished answer with Markdown, to check how answers look.
  const bubble = openAnswer({ title: "Blanks", thumbnail: "", near: mascotWindow.getBounds(), onClose() {} });
  bubble.update(SAMPLE_ANSWER, "done");
  await wait(1200);
  await save(bubble.window, "answer-sample.png");

  const settingsWindow = openSettingsWindow();
  await wait(1500);
  await save(settingsWindow, "settings.png");

  console.log(`Smoke test screenshots saved to ${out}`);
  app.quit();
}

// Renders FAKE_SCREEN in a hidden window and uses that as every monitor's screenshot.
async function fakeScreen(displays) {
  const win = new BrowserWindow({ width: 1280, height: 720, show: false });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(FAKE_SCREEN)}`);
  const image = await win.webContents.capturePage();
  win.destroy();
  return displays.map((d) => image.resize({ width: Math.round(d.bounds.width * d.scaleFactor), height: Math.round(d.bounds.height * d.scaleFactor) }));
}

function watchConsole(contents) {
  contents.on("console-message", (event) => console.log(`[page] ${event.message}`));
  contents.on("preload-error", (_e, file, err) => console.log(`[preload error] ${file}: ${err.message}`));
}

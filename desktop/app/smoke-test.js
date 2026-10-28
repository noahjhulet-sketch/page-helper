// `npm run smoke-test`: starts the app with throwaway settings and walks through it,
// saving screenshots: each mascot, the snip overlay (on a fake worksheet instead of
// your real screen), bubbles for a snip, the clipboard and a chat, History and
// Settings. It makes no API calls and never reads or changes your real clipboard.
// Screenshots go to the folder in SMOKE_OUT, or a temp folder if it isn't set.

import { app, BrowserWindow, screen } from "electron";
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

const FAKE_COPY =
  "Photosynthesis is the process plants use to turn light, water and carbon dioxide into glucose and oxygen. It happens mostly in the leaves, inside chloroplasts.";

const SAMPLE_FOLLOW_UP =
  "Evaporation goes the other way: liquid water **becomes** vapor. Clouds need vapor to turn back into liquid droplets, which is condensation.";

const FAKE_HISTORY = [
  {
    title: "Blanks",
    thumbnail: "",
    preview: "",
    sources: [{ input: { kind: "text", text: "x" }, thumbnail: "", preview: "" }],
    turns: [{ question: null, actionId: "blanks", label: "Blanks", sources: [0], markdown: "**1.** Water turning into vapor… → **evaporation**" }],
  },
  {
    title: "Make me a study guide",
    thumbnail: "",
    preview: "",
    sources: [],
    turns: [
      { question: "Make me a study guide", actionId: null, label: "Chat", sources: [], markdown: "Sure! What's it on?" },
      { question: "Photosynthesis", actionId: null, label: "Chat", sources: [], markdown: "## Photosynthesis\n- Light + water + CO₂ → glucose + O₂" },
    ],
  },
];

const SAMPLE_ANSWER = `**1.** Water turning into vapor because of heat is called ____.

→ **evaporation** · high confidence

Heat gives water molecules enough energy to escape into the air as vapor.

---

**2.** Clouds form when water vapor cools and goes through ____.

→ **condensation** · high confidence

Cooling vapor turns back into tiny droplets, which gather into clouds. See [the USGS water cycle page](https://www.usgs.gov/special-topics/water-science-school).`;

export async function runSmokeTest({
  mascotWindow, mascots, chooseMascot, setMascotState, snipScreen, useClipboard, newChat, attachTo, showChatBar, openHistoryEntry, openPanel, openBubble, saveEntry, useFakeScreen, useFakeChat, chatAboutFiles, openNotes, openFlashcards,
}) {
  const out = process.env.SMOKE_OUT || path.join(app.getPath("userData"), "screenshots");
  fs.mkdirSync(out, { recursive: true });
  const save = async (win, name) => {
    try {
      fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toPNG());
    } catch (err) {
      console.log(`[smoke] FAIL: couldn't capture ${name}: ${err.message}`);
    }
  };
  // The newest window showing `page`.
  const findWindow = (page) =>
    BrowserWindow.getAllWindows()
      .filter((w) => w.webContents.getURL().endsWith(page))
      .sort((a, b) => b.id - a.id)[0];
  const inPage = (win, js) => win.webContents.executeJavaScript(js);

  app.on("web-contents-created", (_e, contents) => watchConsole(contents));
  watchConsole(mascotWindow.webContents);
  await wait(1500);

  // Every mascot in every state, plus mid-drag, on one contact sheet.
  const STATES = ["idle", "hover", "listening", "selecting", "thinking", "talking", "error", "sleeping", "dragged"];
  const cells = [];
  for (const mascot of mascots) {
    chooseMascot(mascot.id);
    await wait(400);
    for (const state of STATES) {
      setMascotState(state);
      await wait(350);
      const name = `face-${mascot.id}-${state}.png`;
      await save(mascotWindow, name);
      cells.push({ name, label: `${mascot.id} · ${state}` });
    }
    // Pretend he's being dragged quickly to the right, to see the sway.
    setMascotState("dragged");
    await inPage(mascotWindow, "drag = { moving: true }; window.fakeDrag = setInterval(() => onMoved({ dx: 18, dy: 0 }), 16);");
    await wait(450);
    const name = `face-${mascot.id}-swaying.png`;
    await save(mascotWindow, name);
    cells.push({ name, label: `${mascot.id} · swaying` });
    await inPage(mascotWindow, "clearInterval(window.fakeDrag); drag = null;");
  }
  setMascotState("idle");
  chooseMascot("normal");
  await saveSheet(out, cells, "faces.png", STATES.length + 1);

  // Snip a fake worksheet: drag a box, check the menu, pick Explain. With no API key
  // saved, the bubble should show the "add your key" message.
  useFakeScreen(fakeScreen);
  snipScreen();
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
  await save(findWindow("bubble.html"), "bubble-no-key.png");

  // Clipboard text (fake, so your real clipboard is untouched): the bubble offers the tools.
  useClipboard({ input: { kind: "text", text: FAKE_COPY }, thumbnail: "", preview: FAKE_COPY.slice(0, 120) });
  await wait(1500);
  await save(findWindow("bubble.html"), "bubble-clipboard.png");

  useClipboard(null);
  await wait(1200);
  await save(findWindow("bubble.html"), "bubble-empty-clipboard.png");

  // The chat bar under the buddy, then a plain chat with copied text attached.
  showChatBar();
  await wait(300); // before it hides itself: the real pointer isn't near the buddy
  await save(findWindow("chat-bar.html"), "chat-bar.png");
  const chatSession = newChat("Make me a study guide for the water cycle");
  await wait(1200);
  await attachTo(chatSession, "clipboard", { input: { kind: "text", text: FAKE_COPY }, thumbnail: "", preview: FAKE_COPY.slice(0, 120) });
  await wait(800);
  await save(chatSession.bubble.win, "bubble-plain-chat.png");

  // A pinned conversation with a follow-up, to check how chats look.
  const chat = openBubble({
    title: "Blanks",
    preview: "",
    turns: [
      { question: null, label: "Blanks", markdown: SAMPLE_ANSWER },
      { question: "Why isn't #2 evaporation too?", label: "Follow-up", markdown: SAMPLE_FOLLOW_UP },
    ],
    near: mascotWindow.getBounds(),
  });
  chat.togglePin();
  await wait(1200);
  await save(chat.win, "bubble-chat.png");

  // A chat where he asks to do something on the computer. A scripted stand-in for
  // Claude and a harmless pretend ability, so nothing real is opened or written.
  useFakeChat(fakeClaude(), [FAKE_ABILITY]);
  newChat("Put a water cycle study guide in Notepad");
  await wait(1200);
  await save(findWindow("bubble.html"), "action-waiting.png");
  await inPage(findWindow("bubble.html"), `[...document.querySelectorAll(".action-card button")].find((b) => b.textContent === "Always").click()`);
  await wait(1200);
  await save(findWindow("bubble.html"), "action-done.png");
  if (FAKE_ABILITY.runs !== 1) console.log("[smoke] FAIL: the approved action didn't run");

  // "Always" was clicked, so the same kind of action now runs without asking.
  useFakeChat(fakeClaude(), []);
  newChat("Another study guide, please");
  await wait(1200);
  await save(findWindow("bubble.html"), "action-auto.png");
  if (FAKE_ABILITY.runs !== 2) console.log("[smoke] FAIL: the always-allowed action waited for approval");

  // A PDF and a text file dropped into a new chat (a PDF made on the spot).
  const docs = path.join(app.getPath("temp"), "page-helper-smoke-test", "files");
  fs.mkdirSync(docs, { recursive: true });
  const pdf = path.join(docs, "Orbitals reading.pdf");
  fs.writeFileSync(pdf, await makePdf("<h1>Atomic orbitals</h1><p>s, p, d and f orbitals…</p>"));
  fs.writeFileSync(path.join(docs, "notes.txt"), "Hund's rule: fill orbitals singly first.");
  chatAboutFiles([pdf, path.join(docs, "notes.txt"), path.join(docs, "missing.docx")]);
  await wait(1500);
  await save(findWindow("bubble.html"), "files-attached.png");

  // He makes a flashcard deck from a chat, and the Flashcards window opens.
  useFakeChat(scripted([{ text: "Here's a deck on orbitals!", tool: { name: "make_flashcards", input: FAKE_DECK } }, { text: "Done: 4 cards." }]), []);
  newChat("Make flashcards on orbitals");
  await wait(2000);
  const cards = findWindow("flashcards.html");
  await save(cards, "flashcards.png");
  await inPage(cards, `document.getElementById("card").click()`);
  await wait(700);
  await save(cards, "flashcards-flipped.png");

  // He writes a new note (asks first), and the Notes window opens on it.
  useFakeChat(scripted([{ text: "Saving it to your notes.", tool: { name: "save_to_notes", input: FAKE_NOTE } }, { text: "Saved!" }]), []);
  newChat("Start an essay outline on orbitals in my notes");
  await wait(1200);
  await inPage(findWindow("bubble.html"), `[...document.querySelectorAll(".action-card button")].find((b) => b.textContent === "Allow").click()`);
  await wait(1800);
  await save(findWindow("notes.html"), "notes.png");
  await saveLayout(out, "layout-study.png"); // a chat, Flashcards and Notes open together

  // "I'm bored" opens the game without calling the API (no stand-in needed).
  useFakeChat(async () => {
    throw new Error("\"I'm bored\" shouldn't call the API");
  }, []);
  newChat("I'm bored");
  await wait(1500);
  await save(findWindow("bubble.html"), "bored-chat.png");
  const game = findWindow("game.html");
  if (!game) console.log("[smoke] FAIL: \"I'm bored\" didn't open the game");
  await save(game, "game-title.png");
  // Play for a few seconds, steering toward whatever is falling.
  await inPage(game, "startGame(); window.autopilot = setInterval(() => { mode = 'playing'; const next = items.find((i) => !i.type.bad); if (next) player.target = next.x + next.w / 2; }, 50);");
  await wait(3500);
  await save(game, "game-playing.png");
  await inPage(game, "clearInterval(window.autopilot); score = Math.max(score, 180); lives = 1; catchItem({ type: ITEMS.error, x: player.x, y: FLOOR - 40, w: 36, h: 36 }, performance.now());");
  await wait(600);
  await save(game, "game-over.png");

  // History with a couple of saved sessions.
  for (const [i, entry] of FAKE_HISTORY.entries()) {
    saveEntry({ ...entry, id: `smoke-${i}`, createdAt: Date.now() - i * 3_600_000 });
  }
  const history = openPanel("history");
  await wait(1500);
  await save(history, "history.png");
  openHistoryEntry("smoke-1");
  await wait(1200);
  await save(findWindow("bubble.html"), "history-reopened.png");

  const settings = openPanel("settings");
  await wait(1500);
  await save(settings, "settings.png");

  // Several windows are open now: check they landed without covering each other.
  await saveLayout(out, "layout.png");

  console.log(`Smoke test screenshots saved to ${out}`);
  app.quit();
}

// Draws where every visible window is on the main screen, and reports any that overlap.
async function saveLayout(out, name) {
  const { workArea: area } = screen.getPrimaryDisplay();
  const windows = BrowserWindow.getAllWindows()
    .filter((w) => w.isVisible())
    .map((w) => ({ name: path.basename(w.webContents.getURL(), ".html"), ...w.getBounds() }));
  for (const [i, a] of windows.entries()) {
    for (const b of windows.slice(i + 1)) {
      const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (w > 0 && h > 0) console.log(`[smoke] overlap: ${a.name} and ${b.name} (${w}×${h})`);
    }
  }
  const scale = 0.4;
  const boxes = windows
    .map((w) => `<div style="position:absolute;left:${(w.x - area.x) * scale}px;top:${(w.y - area.y) * scale}px;width:${w.width * scale}px;height:${w.height * scale}px;border:2px solid #9b82ff;background:rgba(124,92,255,.15);color:#fff;font:11px Segoe UI;padding:2px;box-sizing:border-box">${w.name}</div>`)
    .join("");
  const win = new BrowserWindow({ width: Math.round(area.width * scale), height: Math.round(area.height * scale), show: false });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<body style="margin:0;background:#15141c;position:relative">${boxes}</body>`)}`);
  fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toPNG());
  win.destroy();
}

const FAKE_ABILITY = {
  name: "pretend_note",
  icon: "📝",
  permission: "pretend notes",
  description: "Smoke test only.",
  runs: 0,
  input_schema: { type: "object", properties: {}, additionalProperties: false },
  describe: () => "Open Notepad with “Water cycle study guide”",
  run() {
    this.runs++;
    return "Saved and opened in Notepad.";
  },
};

// Answers like Claude would: first asks to use the pretend ability, then wraps up.
function fakeClaude() {
  let calls = 0;
  return async (_settings, _body, onText) => {
    calls++;
    const text = calls === 1 ? "Sure! I'll put a study guide in Notepad for you." : "Done! It's open in Notepad and saved in **Documents\\Page Helper Notes**.";
    onText(text);
    const content = [{ type: "text", text }];
    if (calls === 1) content.push({ type: "tool_use", id: "smoke-1", name: "pretend_note", input: {} });
    return { content, stop_reason: calls === 1 ? "tool_use" : "end_turn" };
  };
}

const FAKE_DECK = {
  title: "Atomic orbitals",
  cards: [
    { front: "How many electrons fit in one orbital?", back: "Two, with opposite spins (Pauli exclusion principle)." },
    { front: "Shape of an s orbital", back: "A sphere around the nucleus." },
    { front: "How many p orbitals per energy level (n ≥ 2)?", back: "Three: px, py and pz." },
    { front: "Hund's rule", back: "Electrons fill orbitals of equal energy singly before pairing up." },
  ],
};

const FAKE_NOTE = {
  title: "Orbitals essay outline",
  mode: "new",
  text: "# Orbitals essay\n\n## Intro\n- What an orbital is (probability, not a path)\n\n## Body\n- s, p, d, f shapes\n- Filling order and Hund's rule\n\n## Conclusion\n- Why it matters for bonding",
};

// A stand-in for Claude that follows a script: each step says some text and may
// ask to use one tool.
function scripted(steps) {
  let call = 0;
  return async (_settings, _body, onText) => {
    const step = steps[Math.min(call++, steps.length - 1)];
    onText(step.text);
    const content = [{ type: "text", text: step.text }];
    if (step.tool) content.push({ type: "tool_use", id: `smoke-${call}`, ...step.tool });
    return { content, stop_reason: step.tool ? "tool_use" : "end_turn" };
  };
}

// A real little PDF, printed from HTML.
async function makePdf(html) {
  const win = new BrowserWindow({ show: false });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const data = await win.webContents.printToPDF({});
  win.destroy();
  return data;
}

// Lays screenshots out in a labeled grid and saves that as one image.
async function saveSheet(out, cells, name, columns) {
  const html = `<body style="margin:0;padding:8px;background:#2a2838;font:11px Segoe UI;color:#ddd">
    <div style="display:grid;grid-template-columns:repeat(${columns},140px);gap:6px">
    ${cells.map((c) => `<figure style="margin:0;text-align:center;background:#3a3750"><img src="${c.name}" width="140" height="140"><figcaption>${c.label}</figcaption></figure>`).join("")}
    </div></body>`;
  const file = path.join(out, "sheet.html");
  fs.writeFileSync(file, html);
  const rows = Math.ceil(cells.length / columns);
  const win = new BrowserWindow({ width: columns * 146 + 16, height: rows * 166 + 16, show: false });
  await win.loadFile(file);
  await wait(300);
  fs.writeFileSync(path.join(out, name), (await win.webContents.capturePage()).toPNG());
  win.destroy();
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

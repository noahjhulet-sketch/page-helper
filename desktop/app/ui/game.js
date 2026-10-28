// Pop-Up Panic: app windows rain down on a tiny desktop, and the buddy runs along
// the taskbar catching the good ones (notes, flashcards, gold stars) while dodging
// error pop-ups and bugs. Coffee slows time; a pin blocks one hit. He's drawn with
// your chosen mascot's own faces.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const TASKBAR = 38;
const FLOOR = H - TASKBAR; // he runs along the top of the taskbar
const SIZE = 64; // the buddy, in pixels
const SPEED = 430; // how fast he runs, pixels per second
const POINTS_PER_LEVEL = 250;
const BEST_KEY = "pop-up-panic-best";

// What falls. Windows are drawn as little app windows; the rest as emoji.
const ITEMS = {
  notes: { window: true, title: "Notes", color: "#7c5cff", icon: "📝", label: "notes.md", points: 10, weight: 34 },
  flashcards: { window: true, title: "Flashcards", color: "#2fb47c", icon: "🃏", label: "Bio deck", points: 15, weight: 20 },
  error: { window: true, title: "Error", color: "#e5484d", icon: "⚠️", label: "Not responding", bad: true, weight: 20 },
  bug: { icon: "🐛", bad: true, weight: 8 },
  star: { icon: "⭐", points: 50, weight: 3 },
  coffee: { icon: "☕", power: "slow", weight: 4 },
  pin: { icon: "📌", power: "shield", weight: 3 },
};
const LEVELS = ["Monday Morning", "Pop Quiz", "Group Project", "Midterms", "All-Nighter", "Finals Week", "Summer?? (Not Yet)"];

const QUIPS = {
  start: ["Here they come!", "Catch the notes, not the errors!", "Let's gooo!"],
  hurt: ["Ack! Another pop-up!", "Who keeps opening these?!", "Not responding… me neither.", "Ow, a bug!"],
  star: ["A GOLD STAR!", "Teacher's pet!", "Shiny!!"],
  slow: ["Coffee break ☕", "Ahh. Focus mode."],
  shield: ["Pin shield on!", "Pinned and ready."],
  blocked: ["Pinned it down!", "Nope! Shield!"],
  combo: ["Combo!", "On a roll!", "Study streak!"],
  over: ["zzz… good game", "Need… a nap…", "Ctrl+Z? Please?"],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ---------- State ----------

const faces = {}; // state → Image, from the current mascot
let mode = "title"; // title | playing | paused | over
let score, lives, level, streak, combo, items, particles, spawnIn, slowUntil, shield, hurtUntil, shakeUntil;
let face = { state: "hover", until: 0 };
let quip = { text: "", until: 0 };
let banner = { text: "", until: 0 };
let best = Number(safeGet(BEST_KEY)) || 0;
let newBest = false;

const player = { x: W / 2, lastX: W / 2, tilt: 0, target: null };
const keys = new Set();

function reset() {
  score = 0;
  lives = 3;
  level = 0;
  streak = 0;
  combo = 1;
  items = [];
  particles = [];
  spawnIn = 0.6;
  slowUntil = 0;
  shield = false;
  hurtUntil = 0;
  shakeUntil = 0;
  newBest = false;
  player.x = player.lastX = W / 2;
}

function startGame() {
  reset();
  mode = "playing";
  say(pick(QUIPS.start));
  showFace("listening", 700);
  showBanner(LEVELS[0]);
}

function endGame() {
  mode = "over";
  if (score > best) {
    best = score;
    newBest = true;
    safeSet(BEST_KEY, String(best));
  }
  say(pick(QUIPS.over), 4000);
}

const say = (text, ms = 1600) => (quip = { text, until: performance.now() + ms });
const showFace = (state, ms) => (face = { state, until: performance.now() + ms });
const showBanner = (text) => (banner = { text, until: performance.now() + 1800 });

// ---------- Update ----------

function update(dt, now) {
  updateParticles(dt);
  if (mode !== "playing") return;
  const slow = now < slowUntil ? 0.45 : 1;

  // Move: arrow keys, or follow the mouse.
  const dir = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0);
  if (dir) {
    player.target = null;
    player.x += dir * SPEED * dt;
  } else if (player.target !== null) {
    player.x += (player.target - player.x) * Math.min(1, dt * 12);
  }
  player.x = Math.max(SIZE / 2, Math.min(W - SIZE / 2, player.x));
  // Lean into the run, like when you drag him around the desktop.
  const speed = (player.x - player.lastX) / Math.max(dt, 0.001);
  player.tilt += (Math.max(-18, Math.min(18, speed * 0.035)) - player.tilt) * Math.min(1, dt * 10);
  player.lastX = player.x;

  spawnIn -= dt * slow;
  if (spawnIn <= 0) {
    spawn();
    spawnIn = Math.max(0.3, 0.95 - level * 0.09) * (0.7 + Math.random() * 0.6);
  }

  const catcher = { x: player.x - 26, y: FLOOR - SIZE + 10, w: 52, h: SIZE - 10 };
  for (const item of items) {
    item.y += item.vy * dt * slow;
    item.age += dt;
    if (!item.done && hits(item, catcher)) {
      item.done = true;
      catchItem(item, now);
    } else if (!item.done && item.y > FLOOR + 10) {
      item.done = true;
      if (!item.type.bad && item.type.points) streak = 0; // dropped a good one: streak over
    }
  }
  items = items.filter((i) => !i.done);

  const nextLevel = Math.min(LEVELS.length - 1, Math.floor(score / POINTS_PER_LEVEL));
  if (nextLevel > level) {
    level = nextLevel;
    showBanner(`Level ${level + 1}: ${LEVELS[level]}`);
    say(`Uh oh… ${LEVELS[level]}!`);
    showFace("listening", 900);
  }
}

function spawn() {
  const bias = { error: level * 3, bug: level * 2 }; // more trouble each level
  const entries = Object.entries(ITEMS);
  const total = entries.reduce((sum, [name, t]) => sum + t.weight + (bias[name] ?? 0), 0);
  let roll = Math.random() * total;
  const [, type] = entries.find(([name, t]) => (roll -= t.weight + (bias[name] ?? 0)) < 0) ?? entries[0];
  const w = type.window ? 96 : 36;
  const h = type.window ? 66 : 36;
  items.push({
    type,
    w,
    h,
    x: 10 + Math.random() * (W - w - 20),
    y: -h,
    vy: 105 + level * 24 + Math.random() * 45 + (type.window ? 0 : 30),
    age: 0,
    sway: Math.random() * Math.PI * 2,
  });
}

function catchItem(item, now) {
  const { type } = item;
  const cx = item.x + item.w / 2;
  if (type.bad) {
    if (shield) {
      shield = false;
      burst(cx, item.y, "Blocked!", "#c9bcff");
      say(pick(QUIPS.blocked));
      return;
    }
    if (now < hurtUntil) return;
    lives--;
    hurtUntil = now + 1200;
    shakeUntil = now + 300;
    streak = 0;
    combo = 1;
    showFace("error", 900);
    say(pick(QUIPS.hurt));
    burst(cx, item.y, "−1 ❤️", "#ff7b7b");
    if (lives <= 0) endGame();
    return;
  }
  if (type.power === "slow") {
    slowUntil = now + 5000;
    say(pick(QUIPS.slow));
    burst(cx, item.y, "Slow-mo!", "#7fd3ff");
    return;
  }
  if (type.power === "shield") {
    shield = true;
    say(pick(QUIPS.shield));
    burst(cx, item.y, "Shield!", "#c9bcff");
    return;
  }
  streak++;
  const nextCombo = Math.min(5, 1 + Math.floor(streak / 4));
  if (nextCombo > combo) say(`${pick(QUIPS.combo)} ×${nextCombo}`);
  combo = nextCombo;
  const points = type.points * combo;
  score += points;
  if (type === ITEMS.star) {
    showFace("listening", 800);
    say(pick(QUIPS.star));
    confetti(cx, item.y);
  } else {
    showFace("talking", 350);
  }
  burst(cx, item.y, `+${points}`, type === ITEMS.star ? "#ffd166" : "#ffffff");
}

const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function burst(x, y, text, color) {
  particles.push({ text, color, x, y, vy: -60, life: 1 });
}

function confetti(x, y) {
  const colors = ["#7c5cff", "#ffd166", "#2fb47c", "#ff7b7b", "#7fd3ff"];
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 160;
    particles.push({ dot: true, color: pick(colors), x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, life: 1 });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life -= dt * (p.dot ? 0.9 : 1.2);
    p.x += (p.vx ?? 0) * dt;
    p.y += p.vy * dt;
    if (p.dot) p.vy += 300 * dt;
  }
  particles = particles.filter((p) => p.life > 0);
}

// ---------- Draw ----------

function draw(now) {
  ctx.save();
  if (now < shakeUntil) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  drawDesktop();
  for (const item of items) drawItem(item, now);
  drawBuddy(now);
  drawParticles();
  ctx.restore();
  drawTaskbar();
  if (now < slowUntil && mode === "playing") drawSlowMo();
  if (mode !== "title") drawHud();
  if (now < banner.until && mode === "playing") drawBanner(now);
  if (mode === "title") drawTitle();
  if (mode === "paused") drawCentered(["Paused", "Press P to keep going"]);
  if (mode === "over") drawGameOver();
}

function drawDesktop() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#221b3d");
  sky.addColorStop(1, "#110e1b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // A soft wallpaper glow, and a few desktop icons for decoration.
  const glow = ctx.createRadialGradient(W * 0.7, H * 0.35, 10, W * 0.7, H * 0.35, 260);
  glow.addColorStop(0, "rgba(124, 92, 255, 0.25)");
  glow.addColorStop(1, "rgba(124, 92, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.35;
  ctx.textAlign = "center";
  [["📁", "Homework"], ["🗑️", "Recycle Bin"], ["📄", "essay_FINAL_v3"]].forEach(([icon, name], i) => {
    ctx.font = "22px 'Segoe UI Emoji'";
    ctx.fillText(icon, 30, 70 + i * 62);
    ctx.font = "9px 'Segoe UI'";
    ctx.fillStyle = "#fff";
    ctx.fillText(name, 30, 86 + i * 62);
  });
  ctx.globalAlpha = 1;
}

function drawItem(item, now) {
  const { type } = item;
  const x = item.x + Math.sin(item.age * 3 + item.sway) * 4;
  const y = item.y;
  ctx.save();
  ctx.translate(x + item.w / 2, y + item.h / 2);
  ctx.rotate(Math.sin(item.age * 2 + item.sway) * 0.06);
  ctx.translate(-item.w / 2, -item.h / 2);
  if (type.window) {
    // A tiny app window: shadow, body, colored title bar with buttons.
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    roundRect(0, 0, item.w, item.h, 7, "#262433");
    ctx.shadowColor = "transparent";
    roundRect(0, 0, item.w, 16, [7, 7, 0, 0], type.color);
    ctx.fillStyle = "#fff";
    ctx.font = "600 9px 'Segoe UI'";
    ctx.textAlign = "left";
    ctx.fillText(type.title, 6, 11.5);
    ctx.textAlign = "right";
    ctx.fillText("–  □  ✕", item.w - 5, 11.5);
    ctx.textAlign = "center";
    ctx.font = "20px 'Segoe UI Emoji'";
    ctx.fillText(type.icon, item.w / 2, 40);
    ctx.font = "9px 'Segoe UI'";
    ctx.fillStyle = type.bad ? "#ffb3b3" : "#c9c6dc";
    ctx.fillText(type.label, item.w / 2, 58);
  } else {
    if (type === ITEMS.star || type.power) {
      ctx.shadowColor = type === ITEMS.star ? "#ffd166" : "#7fd3ff";
      ctx.shadowBlur = 14 + Math.sin(now / 150) * 4;
    }
    ctx.textAlign = "center";
    ctx.font = "30px 'Segoe UI Emoji'";
    ctx.fillText(type.icon, item.w / 2, item.h - 6);
  }
  ctx.restore();
}

function drawBuddy(now) {
  const state = now < face.until ? face.state : mode === "over" ? "sleeping" : mode === "title" ? "hover" : "idle";
  const img = faces[state] ?? faces.idle;
  if (now < hurtUntil && Math.floor(now / 100) % 2) return; // blink while recovering
  const bob = mode === "playing" ? Math.abs(Math.sin(now / 110)) * Math.min(4, Math.abs(player.tilt) / 3) : 0;
  ctx.save();
  ctx.translate(player.x, FLOOR - bob);
  ctx.rotate((player.tilt * Math.PI) / 180);
  if (shield) {
    ctx.strokeStyle = `rgba(201, 188, 255, ${0.6 + Math.sin(now / 120) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -SIZE / 2, SIZE / 2 + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (img?.complete && img.naturalWidth) ctx.drawImage(img, -SIZE / 2, -SIZE, SIZE, SIZE);
  ctx.restore();

  if (now < quip.until && quip.text) drawQuip(quip.text);
}

function drawQuip(text) {
  ctx.font = "600 12px 'Segoe UI'";
  const w = Math.min(220, ctx.measureText(text).width + 20);
  const x = Math.max(6, Math.min(W - w - 6, player.x - w / 2));
  const y = FLOOR - SIZE - 40;
  roundRect(x, y, w, 26, 10, "#ffffff");
  ctx.beginPath(); // tail toward his head
  ctx.moveTo(player.x - 6, y + 26);
  ctx.lineTo(player.x, y + 34);
  ctx.lineTo(player.x + 6, y + 26);
  ctx.fill();
  ctx.fillStyle = "#1d1b26";
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + 17, w - 12);
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    if (p.dot) {
      ctx.fillRect(p.x, p.y, 5, 5);
    } else {
      ctx.font = "700 15px 'Segoe UI'";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}

function drawTaskbar() {
  ctx.fillStyle = "rgba(14, 12, 22, 0.95)";
  ctx.fillRect(0, FLOOR, W, TASKBAR);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(0, FLOOR, W, 1);
  ctx.font = "16px 'Segoe UI Emoji'";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff"; // emoji take the fill's transparency, so start from solid
  ["🟣", "📁", "🌐", "📝", "🃏"].forEach((icon, i) => ctx.fillText(icon, W / 2 - 80 + i * 40, FLOOR + 25));
  const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  ctx.font = "11px 'Segoe UI'";
  ctx.fillStyle = "#c9c6dc";
  ctx.textAlign = "right";
  ctx.fillText(`🔊  ${time}`, W - 10, FLOOR + 24);
}

function drawHud() {
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "700 20px 'Segoe UI'";
  ctx.fillText(String(score), 14, 30);
  ctx.font = "11px 'Segoe UI'";
  ctx.fillStyle = "#a9a6bd";
  ctx.fillText(`Level ${level + 1}: ${LEVELS[level]}${combo > 1 ? `  ·  ×${combo} combo` : ""}`, 14, 47);
  ctx.textAlign = "right";
  ctx.font = "16px 'Segoe UI Emoji'";
  ctx.fillText("❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, 3 - lives)), W - 12, 30);
  if (shield) {
    ctx.font = "11px 'Segoe UI'";
    ctx.fillStyle = "#c9bcff";
    ctx.fillText("📌 shield", W - 12, 47);
  }
}

function drawSlowMo() {
  ctx.fillStyle = "rgba(127, 211, 255, 0.07)";
  ctx.fillRect(0, 0, W, FLOOR);
  ctx.font = "600 11px 'Segoe UI'";
  ctx.fillStyle = "#7fd3ff";
  ctx.textAlign = "center";
  ctx.fillText("☕ slow-mo", W / 2, 22);
}

function drawBanner(now) {
  const t = (banner.until - now) / 1800;
  ctx.globalAlpha = Math.min(1, t * 3);
  ctx.font = "800 26px 'Segoe UI'";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText(banner.text, W / 2, H / 2 - 60);
  ctx.globalAlpha = 1;
}

function drawTitle() {
  dim();
  ctx.textAlign = "center";
  const title = ctx.createLinearGradient(W / 2 - 140, 0, W / 2 + 140, 0);
  title.addColorStop(0, "#9b82ff");
  title.addColorStop(1, "#ffd166");
  ctx.fillStyle = title;
  ctx.font = "900 40px 'Segoe UI'";
  ctx.fillText("Pop-Up Panic", W / 2, 110);
  ctx.fillStyle = "#c9c6dc";
  ctx.font = "14px 'Segoe UI'";
  ctx.fillText("Catch your study stuff. Dodge the pop-ups.", W / 2, 138);
  const rows = [["📝", "Notes", "+10"], ["🃏", "Flashcards", "+15"], ["⭐", "Gold star", "+50"], ["⚠️ 🐛", "Errors & bugs", "ouch"], ["☕", "Coffee", "slow-mo"], ["📌", "Pin", "blocks a hit"]];
  rows.forEach(([icon, name, what], i) => {
    const y = 190 + i * 30;
    ctx.font = "17px 'Segoe UI Emoji'";
    ctx.textAlign = "right";
    ctx.fillText(icon, W / 2 - 60, y);
    ctx.font = "13px 'Segoe UI'";
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.fillText(name, W / 2 - 48, y);
    ctx.fillStyle = "#a9a6bd";
    ctx.fillText(what, W / 2 + 60, y);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "700 15px 'Segoe UI'";
  ctx.fillText(Math.floor(performance.now() / 600) % 2 ? "Press Space or click to start" : "", W / 2, 400);
  if (best) {
    ctx.font = "12px 'Segoe UI'";
    ctx.fillStyle = "#a9a6bd";
    ctx.fillText(`Best: ${best}`, W / 2, 424);
  }
}

function drawGameOver() {
  drawCentered([
    "Game over",
    `Score: ${score}`,
    newBest ? "🏆 New best!" : `Best: ${best}`,
    `You made it to ${LEVELS[level]}`,
    "Space or click to play again",
  ]);
}

function drawCentered(lines) {
  dim();
  ctx.textAlign = "center";
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? "#fff" : "#c9c6dc";
    ctx.font = i === 0 ? "800 32px 'Segoe UI'" : "15px 'Segoe UI Emoji', 'Segoe UI'";
    ctx.fillText(line, W / 2, H / 2 - 90 + (i === 0 ? 0 : 20 + i * 28));
  });
}

function dim() {
  ctx.fillStyle = "rgba(10, 8, 18, 0.62)";
  ctx.fillRect(0, 0, W, FLOOR);
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

// localStorage can be unavailable; the game still works, it just won't remember your best.
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// ---------- Input and loop ----------

const KEYS = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };

document.addEventListener("keydown", (e) => {
  if (KEYS[e.key]) {
    keys.add(KEYS[e.key]);
    e.preventDefault();
  } else if (e.key === " ") {
    e.preventDefault();
    if (mode === "title" || mode === "over") startGame();
    else if (mode === "paused") mode = "playing";
  } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
    if (mode === "playing") mode = "paused";
    else if (mode === "paused") mode = "playing";
  }
});
document.addEventListener("keyup", (e) => keys.delete(KEYS[e.key]));
canvas.addEventListener("mousemove", (e) => (player.target = (e.offsetX / canvas.clientWidth) * W));
canvas.addEventListener("click", () => {
  if (mode === "title" || mode === "over") startGame();
  else if (mode === "paused") mode = "playing";
});
// Pause if you click away.
window.addEventListener("blur", () => {
  keys.clear();
  if (mode === "playing") mode = "paused";
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(frame);
}

reset();
buddy.currentMascot().then((mascot) => {
  for (const [state, src] of Object.entries(mascot.images)) {
    faces[state] = Object.assign(new Image(), { src });
  }
});
requestAnimationFrame(frame);

// The mascot window's page: shows the current mascot and handles hover, click,
// drag and right-click. Moving the window itself happens in the main process,
// which reports each step so he can sway with the motion.

const el = document.getElementById("mascot");
const tilt = document.getElementById("tilt");
const img = document.getElementById("mascot-img");
const DRAG_THRESHOLD = 4; // pixels the pointer must move before a click becomes a drag
const SLEEP_AFTER = 3 * 60_000; // idle this long and he dozes off
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let mascot = null;
let state = "idle";
let drag = null;
let sleepTimer = null;

function show(next) {
  mascot = next;
  el.style.setProperty("--size", `${mascot.size}px`);
  el.dataset.motion = mascot.motion;
  // Load every state's image now, so switching faces never flickers.
  for (const src of Object.values(mascot.images)) new Image().src = src;
  setState(state);
}

// States without their own image use the idle one.
function setState(next) {
  state = next;
  el.dataset.state = next;
  if (mascot) img.src = mascot.images[next] ?? mascot.images.idle;
  clearTimeout(sleepTimer);
  if (next === "idle") sleepTimer = setTimeout(() => setState("sleeping"), SLEEP_AFTER);
}

// ---------- Swaying while dragged ----------
// A small spring: dragging pushes him toward a tilt that matches how fast you're
// moving him; let go and he swings back, wobbles, and settles.

const swing = { angle: 0, spin: 0, speed: 0, running: false };

function onMoved({ dx }) {
  if (reducedMotion) return;
  swing.speed += (dx - swing.speed) * 0.35; // smooth out jittery steps
  startSwing();
}

function startSwing() {
  if (swing.running) return;
  swing.running = true;
  requestAnimationFrame(stepSwing);
}

function stepSwing() {
  // Moving right makes his bottom trail to the left: a clockwise (positive) tilt.
  // Capped so even the biggest mascot stays inside his window.
  const target = drag?.moving ? Math.max(-20, Math.min(20, swing.speed * 1.4)) : 0;
  swing.spin += (target - swing.angle) * 0.12 - swing.spin * 0.16;
  swing.angle += swing.spin;
  swing.speed *= 0.85; // no new movement means he's slowing down
  tilt.style.transform = `rotate(${swing.angle.toFixed(2)}deg)`;

  const settled = !drag?.moving && Math.abs(swing.angle) < 0.05 && Math.abs(swing.spin) < 0.05;
  if (settled) {
    swing.running = false;
    tilt.style.transform = "";
  } else {
    requestAnimationFrame(stepSwing);
  }
}

function land() {
  el.classList.remove("landing");
  void el.offsetWidth; // restart the animation
  el.classList.add("landing");
}
el.addEventListener("animationend", (e) => {
  if (e.animationName === "land") el.classList.remove("landing");
});

// ---------- Pointer ----------

// The window lets clicks through to whatever is behind it, except over the mascot.
el.addEventListener("mouseenter", () => {
  buddy.ignoreMouse(false);
  if (!drag) buddy.hoverMascot(); // shows the chat bar
  if (state === "idle" || state === "sleeping") setState("hover");
});
el.addEventListener("mouseleave", () => {
  if (!drag) buddy.ignoreMouse(true);
  if (state === "hover") setState("idle");
});

el.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  el.setPointerCapture(e.pointerId);
  drag = { startX: e.screenX, startY: e.screenY, offsetX: e.clientX, offsetY: e.clientY, moving: false };
});
el.addEventListener("pointermove", (e) => {
  if (!drag || drag.moving) return;
  if (Math.hypot(e.screenX - drag.startX, e.screenY - drag.startY) < DRAG_THRESHOLD) return;
  drag.moving = true;
  setState("dragged");
  buddy.dragStart({ offsetX: drag.offsetX, offsetY: drag.offsetY });
});
el.addEventListener("pointerup", () => {
  if (!drag) return;
  const { moving } = drag;
  drag = null;
  if (moving) {
    buddy.dragEnd();
    setState("hover");
    land();
    startSwing();
  } else {
    buddy.activate();
  }
});

el.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  buddy.openMenu();
});

buddy.onMascot(show);
buddy.onState(setState);
buddy.onMoved(onMoved);
buddy.currentMascot().then(show);

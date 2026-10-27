// The mascot window's page: shows the current mascot and handles hover, click,
// drag and right-click. Moving the window itself happens in the main process.

const el = document.getElementById("mascot");
const img = document.getElementById("mascot-img");
const DRAG_THRESHOLD = 4; // pixels the pointer must move before a click becomes a drag

let mascot = null;
let state = "idle";
let drag = null;

function show(next) {
  mascot = next;
  el.style.setProperty("--size", `${mascot.size}px`);
  el.dataset.motion = mascot.motion;
  setState(state);
}

// States without their own image use the idle one.
function setState(next) {
  state = next;
  el.dataset.state = next;
  if (mascot) img.src = mascot.images[next] ?? mascot.images.idle;
}

// The window lets clicks through to whatever is behind it, except over the mascot.
el.addEventListener("mouseenter", () => {
  buddy.ignoreMouse(false);
  if (!drag) buddy.hoverMascot(); // shows the chat bar
  if (state === "idle") setState("hover");
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
buddy.currentMascot().then(show);

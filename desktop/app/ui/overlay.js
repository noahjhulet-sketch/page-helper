// Snip overlay: shows a frozen screenshot of this monitor. Drag a box, then pick a
// tool from the menu that appears next to it. Esc cancels.

const $ = (id) => document.getElementById(id);
const MIN_SIZE = 8; // smaller boxes are treated as a stray click
const GAP = 8;

let start = null;
let rect = null;
let menu = null;

function draw(r) {
  Object.assign($("box").style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
}

function clearBox() {
  rect = null;
  $("box").hidden = true;
  $("menu").hidden = true;
  document.body.classList.remove("has-box");
}

// Below the box if it fits, else above, else inside its bottom edge.
function placeMenu() {
  const el = $("menu");
  el.hidden = false;
  const { width, height } = el.getBoundingClientRect();
  const left = Math.min(Math.max(GAP, rect.x + rect.width / 2 - width / 2), innerWidth - width - GAP);
  let top = rect.y + rect.height + GAP;
  if (top + height > innerHeight - GAP) top = rect.y - height - GAP;
  if (top < GAP) top = rect.y + rect.height - height - GAP;
  Object.assign(el.style, { left: `${left}px`, top: `${Math.max(GAP, top)}px` });
}

document.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || $("menu").contains(e.target)) return;
  start = { x: e.clientX, y: e.clientY };
  clearBox();
  buddy.snipSelecting();
  document.body.classList.add("has-box");
  $("box").hidden = false;
  draw({ x: start.x, y: start.y, width: 0, height: 0 });
});

document.addEventListener("pointermove", (e) => {
  if (!start) return;
  rect = {
    x: Math.min(start.x, e.clientX),
    y: Math.min(start.y, e.clientY),
    width: Math.abs(e.clientX - start.x),
    height: Math.abs(e.clientY - start.y),
  };
  draw(rect);
});

document.addEventListener("pointerup", () => {
  if (!start) return;
  start = null;
  if (!rect || rect.width < MIN_SIZE || rect.height < MIN_SIZE) return clearBox();
  placeMenu();
  menu.focus();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") buddy.snipCancel();
});

buddy.onSnipClear(clearBox);

buddy.snipInit().then((init) => {
  if (!init) return buddy.snipCancel();
  $("screenshot").src = init.screenshot;
  menu = buildToolMenu($("menu"), init.actions, (actionId, question) => buddy.snipDone({ rect, actionId, question }));
});

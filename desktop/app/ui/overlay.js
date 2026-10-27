// Snip overlay: shows a frozen screenshot of this monitor. Drag a box, then pick a
// tool from the menu that appears next to it. Esc cancels.

const $ = (id) => document.getElementById(id);
const MIN_SIZE = 8; // smaller boxes are treated as a stray click
const GAP = 8;

let start = null;
let rect = null;
let needsQuestion = new Set();

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
  const menu = $("menu");
  menu.hidden = false;
  const { width, height } = menu.getBoundingClientRect();
  const left = Math.min(Math.max(GAP, rect.x + rect.width / 2 - width / 2), innerWidth - width - GAP);
  let top = rect.y + rect.height + GAP;
  if (top + height > innerHeight - GAP) top = rect.y - height - GAP;
  if (top < GAP) top = rect.y + rect.height - height - GAP;
  Object.assign(menu.style, { left: `${left}px`, top: `${Math.max(GAP, top)}px` });
}

function choose(actionId) {
  const question = $("question").value.trim();
  if (needsQuestion.has(actionId) && !question) {
    $("question").focus();
    return;
  }
  buddy.snipDone({ rect, actionId, question });
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
  $("menu").querySelector("button").focus();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") buddy.snipCancel();
});

$("ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  choose([...needsQuestion][0]);
});

buddy.onSnipClear(clearBox);

buddy.snipInit().then((init) => {
  if (!init) return buddy.snipCancel();
  $("screenshot").src = init.screenshot;
  needsQuestion = new Set(init.actions.filter((a) => a.needsQuestion).map((a) => a.id));
  $("ask-form").hidden = needsQuestion.size === 0;
  for (const action of init.actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.title = action.description;
    const icon = Object.assign(document.createElement("span"), { className: "icon", textContent: action.icon });
    const label = Object.assign(document.createElement("span"), { textContent: action.label });
    button.append(icon, label);
    button.addEventListener("click", () => choose(action.id));
    $("actions").append(button);
  }
});

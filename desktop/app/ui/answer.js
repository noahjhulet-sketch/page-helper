// Answer bubble page. The main process sends the whole state on every update;
// answer HTML arrives already rendered and escaped by core/markdown.js.

const $ = (id) => document.getElementById(id);
const STATUS = { thinking: "Thinking…", streaming: "Writing…", done: "", error: "" };
let lastHeight = 0;

buddy.onAnswer((state) => {
  $("title").textContent = state.title;
  $("title").title = state.title;
  $("thumb").src = state.thumbnail;
  $("thumb").hidden = !state.thumbnail;
  $("status").textContent = STATUS[state.status];
  $("copy").disabled = state.status !== "done";

  const body = $("body");
  if (state.status === "error") {
    body.className = "error";
    body.textContent = state.error;
  } else {
    body.className = "";
    body.innerHTML = state.html;
  }
  requestAnimationFrame(reportHeight);
});

// Ask the main process to fit the window to the content (it caps the height,
// and the answer scrolls beyond that).
function reportHeight() {
  const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pad"));
  const header = document.querySelector("header").offsetHeight;
  const height = header + $("body").scrollHeight + 2 + pad * 2;
  if (Math.abs(height - lastHeight) < 2) return;
  lastHeight = height;
  buddy.resizeAnswer(height);
}

$("copy").addEventListener("click", () => {
  buddy.copyAnswer();
  $("copy").textContent = "Copied";
  setTimeout(() => ($("copy").textContent = "Copy"), 1500);
});
$("close").addEventListener("click", () => buddy.closeAnswer());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") buddy.closeAnswer();
});

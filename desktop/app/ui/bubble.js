// Bubble page. The main process sends the whole state on every update; answer
// HTML arrives already rendered and escaped by core/markdown.js.

const $ = (id) => document.getElementById(id);
const STATUS = { thinking: "Thinking…", streaming: "Writing…" };
let lastHeight = 0;
let menuShown = false;
let refocus = false;

buddy.onBubble((state) => {
  $("title").textContent = state.title;
  $("title").title = state.title;
  $("preview").textContent = state.preview;
  $("thumb").src = state.thumbnail;
  $("thumb").hidden = !state.thumbnail;
  $("thumb-icon").hidden = Boolean(state.thumbnail);
  $("pin").setAttribute("aria-pressed", String(state.pinned));
  $("card").classList.toggle("pinned", state.pinned);

  // Tool menu: shown before anything has run (clipboard content).
  $("menu").hidden = !state.menu;
  if (state.menu && !menuShown) {
    buildToolMenu($("menu"), state.menu, (actionId, question) => buddy.chooseTool({ actionId, question })).focus();
  }
  menuShown = Boolean(state.menu);

  renderChat(state.turns);

  $("follow-up").hidden = state.turns.length === 0;
  $("question").disabled = state.busy;
  $("follow-up").querySelector("button").disabled = state.busy;
  // Disabling the box while Claude answers drops focus; give it back afterward.
  if (!state.busy && refocus) {
    refocus = false;
    $("question").focus();
  }

  requestAnimationFrame(reportHeight);
});

function renderChat(turns) {
  const chat = $("chat");
  const atBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 24;

  chat.replaceChildren(
    ...turns.flatMap((turn, i) => {
      const parts = [];
      if (turn.question) parts.push(Object.assign(document.createElement("div"), { className: "question", textContent: turn.question }));

      const answer = document.createElement("div");
      answer.className = "answer";
      if (turn.status === "error") {
        answer.append(Object.assign(document.createElement("div"), { className: "error", textContent: turn.error }));
      } else {
        const body = document.createElement("div");
        body.className = "md";
        body.innerHTML = turn.html;
        answer.append(body);
        if (STATUS[turn.status]) answer.append(Object.assign(document.createElement("div"), { className: "status", textContent: STATUS[turn.status] }));
        if (turn.status === "done") answer.append(copyButton(i));
      }
      parts.push(answer);
      return parts;
    }),
  );

  if (atBottom) chat.scrollTop = chat.scrollHeight;
}

function copyButton(index) {
  const row = Object.assign(document.createElement("div"), { className: "answer-tools" });
  const button = Object.assign(document.createElement("button"), { type: "button", className: "ghost", textContent: "Copy" });
  button.addEventListener("click", () => {
    buddy.copyAnswer(index);
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = "Copy"), 1500);
  });
  row.append(button);
  return row;
}

// Ask the main process to fit the window to the content (it caps the height,
// and the chat scrolls beyond that).
function reportHeight() {
  const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pad"));
  const visible = (el) => (el.hidden ? 0 : el.offsetHeight);
  const height =
    document.querySelector("header").offsetHeight + visible($("menu")) + $("chat").scrollHeight + visible($("follow-up")) + 2 + pad * 2;
  if (Math.abs(height - lastHeight) < 2) return;
  lastHeight = height;
  buddy.resizeBubble(height);
}

$("follow-up").addEventListener("submit", (e) => {
  e.preventDefault();
  const question = $("question").value.trim();
  if (!question) return;
  $("question").value = "";
  refocus = true;
  buddy.askFollowUp(question);
});

$("pin").addEventListener("click", () => buddy.pinBubble());
$("close").addEventListener("click", () => buddy.closeBubble());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") buddy.closeBubble();
});

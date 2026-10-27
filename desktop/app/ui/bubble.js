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
  $("thumb-icon").textContent = state.preview ? "📋" : "💬"; // copied text, or a plain chat
  $("pin").setAttribute("aria-pressed", String(state.pinned));
  $("card").classList.toggle("pinned", state.pinned);

  // Tool menu: shown before anything has run (clipboard content).
  $("menu").hidden = !state.menu;
  if (state.menu && !menuShown) {
    buildToolMenu($("menu"), state.menu, (actionId, question) => buddy.chooseTool({ actionId, question })).focus();
  }
  menuShown = Boolean(state.menu);

  renderChat(state.turns);

  $("footer").hidden = state.turns.length === 0;
  $("notice").textContent = state.notice;
  renderPending(state.pending);
  $("question").disabled = state.busy;
  $("follow-up").querySelector("button[type=submit]").disabled = state.busy;
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
      if (turn.attachments.length) parts.push(chips(turn.attachments, "pending sent"));
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
        if (turn.actions.length) answer.append(actionCards(turn.actions, i));
        if (STATUS[turn.status]) answer.append(Object.assign(document.createElement("div"), { className: "status", textContent: STATUS[turn.status] }));
        if (turn.status === "done") answer.append(copyButton(i));
      }
      parts.push(answer);
      return parts;
    }),
  );

  if (atBottom) chat.scrollTop = chat.scrollHeight;
}

// Attachments waiting to be sent, each with a remove button.
function renderPending(pending) {
  const list = chips(pending, "pending");
  list.querySelectorAll(".chip").forEach((chip, i) => {
    const remove = Object.assign(document.createElement("button"), { type: "button", className: "ghost", textContent: "✕", title: "Remove" });
    remove.addEventListener("click", () => buddy.removePending(i));
    chip.append(remove);
  });
  $("pending").replaceWith(Object.assign(list, { id: "pending" }));
}

// A row of small chips, one per attachment: thumbnail (or 📋) and a short preview.
function chips(attachments, className) {
  const row = Object.assign(document.createElement("div"), { className });
  for (const a of attachments) {
    const chip = Object.assign(document.createElement("div"), { className: "chip", title: a.preview });
    chip.append(
      a.thumbnail
        ? Object.assign(document.createElement("img"), { src: a.thumbnail, alt: "" })
        : Object.assign(document.createElement("span"), { className: "chip-icon", textContent: "📋" }),
      Object.assign(document.createElement("span"), { textContent: a.thumbnail ? "Snip" : a.preview }),
    );
    row.append(chip);
  }
  return row;
}

// One card per thing he wants to do on the computer. While it's waiting, Allow and
// Skip buttons; after that, how it went.
const ACTION_STATUS = { running: "Working…", done: "Done", skipped: "Skipped", failed: "Didn't work" };

function actionCards(actions, turnIndex) {
  const list = Object.assign(document.createElement("div"), { className: "actions-list" });
  actions.forEach((action, actionIndex) => {
    const card = Object.assign(document.createElement("div"), { className: `action-card ${action.status}` });
    const text = Object.assign(document.createElement("div"), { className: "action-text" });
    text.append(Object.assign(document.createElement("div"), { className: "action-label", textContent: action.label }));
    if (action.status === "failed" && action.detail) {
      text.append(Object.assign(document.createElement("div"), { className: "action-detail", textContent: action.detail }));
    }
    card.append(Object.assign(document.createElement("span"), { className: "action-icon", textContent: action.icon }), text);

    if (action.status === "waiting") {
      const allow = Object.assign(document.createElement("button"), { type: "button", className: "primary", textContent: "Allow" });
      const skip = Object.assign(document.createElement("button"), { type: "button", textContent: "Skip" });
      allow.addEventListener("click", () => buddy.decide(turnIndex, actionIndex, true));
      skip.addEventListener("click", () => buddy.decide(turnIndex, actionIndex, false));
      card.append(allow, skip);
      requestAnimationFrame(() => allow.focus());
    } else {
      card.append(Object.assign(document.createElement("span"), { className: "action-status", textContent: ACTION_STATUS[action.status] }));
    }
    list.append(card);
  });
  return list;
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
    document.querySelector("header").offsetHeight + visible($("menu")) + $("chat").scrollHeight + visible($("footer")) + 2 + pad * 2;
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

$("attach-snip").addEventListener("click", () => buddy.attach("snip"));
$("attach-clipboard").addEventListener("click", () => buddy.attach("clipboard"));
$("pin").addEventListener("click", () => buddy.pinBubble());
$("close").addEventListener("click", () => buddy.closeBubble());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") buddy.closeBubble();
});

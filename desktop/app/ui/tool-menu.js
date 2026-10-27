// Builds the tool menu (a button per tool plus an "Ask about this…" box) inside
// `container`. Calls onChoose(actionId, question) when one is picked. Shared by the
// snip overlay and the bubble.

function buildToolMenu(container, actions, onChoose) {
  container.classList.add("tool-menu");
  const row = Object.assign(document.createElement("div"), { className: "actions" });
  const form = Object.assign(document.createElement("form"), { className: "ask" });
  const input = Object.assign(document.createElement("input"), {
    type: "text",
    placeholder: "Ask about this…",
    autocomplete: "off",
  });
  const send = Object.assign(document.createElement("button"), { type: "submit", textContent: "↵", title: "Ask" });
  form.append(input, send);

  const askAction = actions.find((a) => a.needsQuestion);
  const choose = (action) => {
    const question = input.value.trim();
    if (action.needsQuestion && !question) return input.focus();
    onChoose(action.id, question);
  };

  for (const action of actions) {
    const button = Object.assign(document.createElement("button"), { type: "button", title: action.description });
    button.append(
      Object.assign(document.createElement("span"), { className: "icon", textContent: action.icon }),
      Object.assign(document.createElement("span"), { textContent: action.label }),
    );
    button.addEventListener("click", () => choose(action));
    row.append(button);
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (askAction) choose(askAction);
  });
  form.hidden = !askAction;

  container.replaceChildren(row, form);
  return { focus: () => row.querySelector("button")?.focus() };
}

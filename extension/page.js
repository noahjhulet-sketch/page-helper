// Functions injected into the web page with chrome.scripting.executeScript.
// Each must be self-contained: they run in the page, not in the extension.

export function extractPage() {
  const main = document.querySelector("article, main, [role=main]");
  const source = main && main.innerText.trim().length > 500 ? main : document.body;
  return {
    title: document.title,
    url: location.href,
    text: (source?.innerText || "").replace(/\n{3,}/g, "\n\n").trim(),
    selection: String(window.getSelection() || "").trim(),
  };
}

// Finds empty, visible text fields and tags each with an id so answers can be written back.
// For each one, returns the surrounding text with the field shown as "____".
export function collectBlankFields() {
  const ATTR = "data-page-helper-id";
  document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.removeAttribute(ATTR));

  const selector =
    'input:not([type]), input[type=text], input[type=search], input[type=number], textarea, [contenteditable=""], [contenteditable=true]';
  const fields = [];
  let n = 0;

  for (const el of document.querySelectorAll(selector)) {
    if (el.disabled || el.readOnly) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const value = el.isContentEditable ? el.innerText : el.value;
    if (value && value.trim()) continue;

    const id = `f${++n}`;
    el.setAttribute(ATTR, id);

    // Copy the nearest block of text and swap the field for a visible blank.
    const block = el.closest("p, li, td, th, label, fieldset, section, div") || el.parentElement;
    const clone = block.cloneNode(true);
    const twin = clone.querySelector(`[${ATTR}="${id}"]`);
    if (twin) twin.replaceWith(document.createTextNode(" ____ "));
    let context = (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
    if (context.length > 400) context = context.slice(0, 400) + "…";

    const label =
      [...(el.labels || [])].map((l) => l.innerText).join(" ") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      "";

    fields.push({ id, label: label.trim(), context });
    if (n >= 100) break;
  }
  return fields;
}

export function fillBlankFields(answers) {
  let filled = 0;
  for (const { id, answer } of answers) {
    const el = document.querySelector(`[data-page-helper-id="${id}"]`);
    if (!el) continue;
    if (el.isContentEditable) {
      el.innerText = answer;
    } else {
      // Use the native setter so frameworks like React notice the change.
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, answer);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.style.outline = "2px solid #7c5cff";
    filled++;
  }
  return filled;
}

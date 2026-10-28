// Settings page. Everything applies as soon as it changes, except the API key,
// which has its own Save button. The key is write-only here: the page learns
// whether one is saved, never the key itself.

const $ = (id) => document.getElementById(id);
const formatKey = (hotkey) => hotkey.replace("Control", "Ctrl").replaceAll("+", " + ");

async function load() {
  const s = await buddy.getSettings();

  $("mascots").replaceChildren(...s.mascots.map((m) => mascotOption(m, m.id === s.mascot)));
  $("model").replaceChildren(...s.models.map((m) => new Option(m.label, m.id, false, m.id === s.model)));
  $("api-key").placeholder = s.hasApiKey ? "Saved. Paste a new key to replace it." : "sk-ant-…";
  $("remove-key").hidden = !s.hasApiKey;
  $("hotkey").textContent = formatKey(s.hotkey);
  $("clipboard-hotkey").textContent = formatKey(s.clipboardHotkey);
  $("hotkey-error").textContent = s.hotkeyError;
  $("hotkey-error").hidden = !s.hotkeyError;
  $("save-history").checked = s.saveHistory;
  $("allow-actions").checked = s.allowActions;
  $("auto-allow").replaceChildren(...s.abilities.map((a) => autoAllowOption(a, s.autoAllow)));
}

// "Don't ask before opening apps", one per ability.
function autoAllowOption(ability, autoAllow) {
  const label = Object.assign(document.createElement("label"), { className: "check" });
  const input = Object.assign(document.createElement("input"), { type: "checkbox", checked: autoAllow.includes(ability.name) });
  input.addEventListener("change", () => {
    const boxes = [...$("auto-allow").querySelectorAll("input")];
    buddy.saveSettings({ autoAllow: boxes.flatMap((box, i) => (box.checked ? [box.dataset.name] : [])) });
  });
  input.dataset.name = ability.name;
  label.append(input, `${ability.icon} Don't ask before ${ability.permission}`);
  return label;
}

function mascotOption(mascot, checked) {
  const label = document.createElement("label");
  label.className = "mascot-option";
  const input = Object.assign(document.createElement("input"), { type: "radio", name: "mascot", value: mascot.id, checked });
  const img = Object.assign(document.createElement("img"), { src: mascot.image, alt: "" });
  const name = Object.assign(document.createElement("span"), { textContent: mascot.name });
  const desc = Object.assign(document.createElement("span"), { className: "desc", textContent: mascot.description });
  input.addEventListener("change", () => buddy.saveSettings({ mascot: mascot.id }));
  label.append(input, img, name, desc);
  return label;
}

function showStatus(el, text, isError = false) {
  el.textContent = text;
  el.className = isError ? "error" : "hint";
  if (!isError) setTimeout(() => (el.textContent = ""), 2000);
}

$("key-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const key = $("api-key").value.trim();
  if (!key) return $("api-key").focus();
  const result = await buddy.saveSettings({ apiKey: key });
  if (!result.ok) return showStatus($("status"), result.error, true);
  $("api-key").value = "";
  await load();
  showStatus($("status"), "Key saved.");
});

$("remove-key").addEventListener("click", async () => {
  await buddy.saveSettings({ apiKey: "" });
  await load();
  showStatus($("status"), "Key removed.");
});

$("model").addEventListener("change", () => buddy.saveSettings({ model: $("model").value }));
$("save-history").addEventListener("change", () => buddy.saveSettings({ saveHistory: $("save-history").checked }));
$("allow-actions").addEventListener("change", () => buddy.saveSettings({ allowActions: $("allow-actions").checked }));

$("clear-history").addEventListener("click", async () => {
  if (!confirm("Delete every saved snip and answer? This can't be undone.")) return;
  await buddy.clearHistory();
  showStatus($("history-status"), "History cleared.");
});

// The mascot and model can also be changed from the right-click menu while this window is open.
buddy.onSettingsChanged(load);

load();

// Settings page. The API key is write-only here: the page learns whether one is
// saved, never the key itself.

const $ = (id) => document.getElementById(id);

async function load() {
  const s = await buddy.getSettings();

  $("mascots").replaceChildren(...s.mascots.map((m) => mascotOption(m, m.id === s.mascot)));
  $("model").replaceChildren(...s.models.map((m) => new Option(m.label, m.id, false, m.id === s.model)));
  $("api-key").placeholder = s.hasApiKey ? "Saved. Paste a new key to replace it." : "sk-ant-…";
  $("remove-key").hidden = !s.hasApiKey;
  $("hotkey").textContent = s.hotkey.replace("Control", "Ctrl").replaceAll("+", " + ");
  $("hotkey-error").textContent = s.hotkeyError;
  $("hotkey-error").hidden = !s.hotkeyError;
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

function showStatus(text, isError = false) {
  $("status").textContent = text;
  $("status").className = isError ? "error" : "";
  if (!isError) setTimeout(() => ($("status").textContent = ""), 2000);
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const changes = { model: $("model").value };
  const key = $("api-key").value.trim();
  if (key) changes.apiKey = key;

  const result = await buddy.saveSettings(changes);
  if (!result.ok) return showStatus(result.error, true);
  $("api-key").value = "";
  await load();
  showStatus("Saved.");
});

$("remove-key").addEventListener("click", async () => {
  await buddy.saveSettings({ apiKey: "" });
  await load();
  showStatus("Key removed.");
});

// The mascot can also be changed from the tray menu while this window is open.
buddy.onSettingsChanged(load);

load();

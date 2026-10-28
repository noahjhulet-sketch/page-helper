// First-run setup: welcome, connect an API key (checked before it's saved), pick a
// mascot and model, then a few tips.

const $ = (id) => document.getElementById(id);
const steps = [...document.querySelectorAll(".step")];
const formatKey = (hotkey) => hotkey.replace("Control", "Ctrl").replaceAll("+", " + ");
let step = 0;
let keyReady = false;

function show(next) {
  step = Math.max(0, Math.min(steps.length - 1, next));
  steps.forEach((s, i) => (s.hidden = i !== step));
  document.querySelectorAll(".dots li").forEach((dot, i) => dot.classList.toggle("on", i === step));
  if (step === 1) $("key").focus();
}

async function load() {
  const s = await buddy.getSettings();
  const mascot = s.mascots.find((m) => m.id === s.mascot) ?? s.mascots[0];
  $("hello-buddy").src = $("done-buddy").src = mascot?.image ?? "";
  $("snip-key").textContent = formatKey(s.hotkey);
  $("clip-key").textContent = formatKey(s.clipboardHotkey);

  // Someone who already has a key (opened from the menu) can go straight through.
  keyReady = s.hasApiKey;
  $("key-next").disabled = !keyReady;
  if (keyReady) status("You already have a key saved. Paste a new one to replace it, or click Next.", "ok");

  $("mascots").replaceChildren(
    ...s.mascots.map((m) =>
      choice("mascot", m.id, m.id === s.mascot, m.name, m.description, m.image, () => {
        buddy.saveSettings({ mascot: m.id });
        $("hello-buddy").src = $("done-buddy").src = m.image;
      }),
    ),
  );
  $("models").replaceChildren(
    ...s.models.map((m) => {
      const [name, desc] = m.label.split(" — ");
      return choice("model", m.id, m.id === s.model, name, desc, null, () => buddy.saveSettings({ model: m.id }));
    }),
  );
}

function choice(group, value, checked, name, desc, image, onPick) {
  const label = Object.assign(document.createElement("label"), { className: "choice" });
  const input = Object.assign(document.createElement("input"), { type: "radio", name: group, value, checked });
  input.addEventListener("change", onPick);
  label.append(input);
  if (image) label.append(Object.assign(document.createElement("img"), { src: image, alt: "" }));
  const text = document.createElement("div");
  text.append(
    Object.assign(document.createElement("div"), { className: "name", textContent: name }),
    Object.assign(document.createElement("div"), { className: "desc", textContent: desc ?? "" }),
  );
  label.append(text);
  return label;
}

function status(text, kind = "") {
  $("key-status").textContent = text;
  $("key-status").className = `status ${kind}`;
}

$("key-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const key = $("key").value.trim();
  if (!key) return $("key").focus();
  $("check").disabled = true;
  status("Checking…");
  const result = await buddy.checkApiKey(key);
  $("check").disabled = false;
  if (!result.ok) {
    status(result.error, "bad");
    return;
  }
  const saved = await buddy.saveSettings({ apiKey: key });
  if (!saved.ok) return status(saved.error, "bad");
  $("key").value = "";
  keyReady = true;
  $("key-next").disabled = false;
  status("It works! Your key is saved. ✓", "ok");
});

$("get-key").addEventListener("click", () => buddy.openKeyPage());
document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => show(step + 1)));
document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => show(step - 1)));
$("finish").addEventListener("click", () => buddy.finishSetup());

load().then(() => show(0));

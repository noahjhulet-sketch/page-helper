// Notes window: a list of notes on the left, the open note on the right. Typing
// saves automatically. "Ask about it" starts a chat with the note attached.

const $ = (id) => document.getElementById(id);
const SAVE_AFTER = 600; // ms after you stop typing

let notes = [];
let current = null; // { id, title, text }
let saveTimer = null;
let dirty = false;

async function refreshList() {
  notes = await buddy.listNotes();
  const query = $("search").value.trim().toLowerCase();
  const shown = notes.filter((n) => !query || `${n.title} ${n.preview}`.toLowerCase().includes(query));
  $("list").replaceChildren(
    ...shown.map((n) => {
      const li = document.createElement("li");
      li.classList.toggle("selected", n.id === current?.id);
      li.append(
        Object.assign(document.createElement("div"), { className: "note-title", textContent: n.title }),
        Object.assign(document.createElement("div"), { className: "note-preview", textContent: n.preview || "Empty note" }),
      );
      li.addEventListener("click", () => open(n.id));
      return li;
    }),
  );
  $("empty").hidden = notes.length > 0;
  $("editor").hidden = !current;
}

async function open(id) {
  await saveNow();
  current = id ? await buddy.readNote(id) : null;
  if (current) {
    $("title").value = current.title;
    $("text").value = current.text;
    document.title = `Notes: ${current.title}`;
    updateWords();
    if (!$("preview").hidden) renderPreview();
  }
  refreshList();
}

function updateWords() {
  const words = ($("text").value.match(/\S+/g) ?? []).length;
  $("words").textContent = `${words} word${words === 1 ? "" : "s"}`;
}

function scheduleSave() {
  dirty = true;
  $("saved").textContent = "";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_AFTER);
}

async function saveNow() {
  clearTimeout(saveTimer);
  if (!current || !dirty) return;
  dirty = false;
  current.text = $("text").value;
  await buddy.saveNote(current.id, current.text);
  $("saved").textContent = "Saved";
}

async function renderPreview() {
  $("preview").innerHTML = await buddy.renderMarkdown($("text").value); // escaped by core/markdown.js
}

$("text").addEventListener("input", () => {
  updateWords();
  scheduleSave();
});
$("title").addEventListener("change", async () => {
  const id = await buddy.renameNote(current.id, $("title").value);
  current.id = id;
  refreshList();
});
$("title").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("text").focus();
});
$("new").addEventListener("click", async () => {
  await saveNow();
  const id = await buddy.createNote("Untitled");
  await open(id);
  $("title").select();
});
$("delete").addEventListener("click", async () => {
  if (!confirm(`Move “${current.title}” to the Recycle Bin?`)) return;
  await buddy.deleteNote(current.id);
  current = null;
  dirty = false;
  await refreshList();
  if (notes[0]) open(notes[0].id);
});
$("ask").addEventListener("click", async () => {
  await saveNow();
  buddy.askAboutNote(current.id);
});
$("preview-toggle").addEventListener("click", async () => {
  const showPreview = $("preview").hidden;
  if (showPreview) await renderPreview();
  $("preview").hidden = !showPreview;
  $("text").hidden = showPreview;
  $("preview-toggle").textContent = showPreview ? "✏️ Edit" : "👁 Preview";
});
$("search").addEventListener("input", refreshList);
$("folder").addEventListener("click", () => buddy.showNotesFolder());

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "n") {
    e.preventDefault();
    $("new").click();
  } else if (e.ctrlKey && e.key === "e") {
    e.preventDefault();
    $("preview-toggle").click();
  } else if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    saveNow();
  }
});
window.addEventListener("beforeunload", saveNow);

// The buddy wrote in a note, or asked to show one: reload, unless you're mid-edit.
buddy.onNotesChanged(async () => {
  const id = await buddy.currentNote();
  if (dirty) return refreshList();
  open(id ?? current?.id);
});

buddy.currentNote().then(open);

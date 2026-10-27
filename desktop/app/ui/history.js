// History page: lists saved sessions, newest first. Click one to reopen it.

const $ = (id) => document.getElementById(id);
let entries = [];

const when = (time) =>
  new Date(time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

async function load() {
  entries = await buddy.listHistory();
  render();
}

function render() {
  const query = $("search").value.trim().toLowerCase();
  const shown = entries.filter((e) => !query || `${e.title} ${e.preview} ${e.snippet}`.toLowerCase().includes(query));

  $("list").replaceChildren(...shown.map(row));
  $("empty").hidden = shown.length > 0;
  $("empty").textContent = entries.length ? "Nothing matches that search." : "Nothing here yet. Snip something and it'll show up here.";
  $("clear").disabled = entries.length === 0;
}

function row(entry) {
  const li = Object.assign(document.createElement("li"), { className: "entry", tabIndex: 0 });

  const thumb = Object.assign(document.createElement("div"), { className: "thumb" });
  if (entry.thumbnail) thumb.append(Object.assign(document.createElement("img"), { src: entry.thumbnail, alt: "" }));
  else thumb.textContent = "📋";

  const text = Object.assign(document.createElement("div"), { className: "text" });
  const answers = entry.answers === 1 ? "1 answer" : `${entry.answers} answers`;
  text.append(
    Object.assign(document.createElement("div"), { className: "title", textContent: entry.title }),
    Object.assign(document.createElement("div"), { className: "snippet", textContent: entry.snippet }),
    Object.assign(document.createElement("div"), { className: "meta", textContent: `${when(entry.createdAt)} · ${answers}` }),
  );

  const del = Object.assign(document.createElement("button"), {
    type: "button",
    className: "ghost delete",
    textContent: "Delete",
    title: "Delete this one",
  });
  del.addEventListener("click", async (e) => {
    e.stopPropagation();
    await buddy.deleteHistoryEntry(entry.id);
    load();
  });

  const open = () => buddy.openHistoryEntry(entry.id);
  li.addEventListener("click", open);
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter") open();
  });
  li.append(thumb, text, del);
  return li;
}

$("search").addEventListener("input", render);
$("clear").addEventListener("click", async () => {
  if (!confirm("Delete every saved snip and answer? This can't be undone.")) return;
  await buddy.clearHistory();
  load();
});
buddy.onHistoryChanged(load);

load();

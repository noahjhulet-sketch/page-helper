// Flashcards window: study one deck. Flip with a click or Space; mark each card
// Got it or Again; at the end, review just the ones you missed. Which cards you
// knew is saved with the deck.

const $ = (id) => document.getElementById(id);

let deck = null;
let order = []; // card indexes in study order
let position = 0;

async function load(id) {
  const decks = await buddy.listDecks();
  deck = await buddy.getDeck(id);
  $("deck").replaceChildren(...decks.map((d) => new Option(`${d.title} (${d.known}/${d.count})`, d.id, false, d.id === deck?.id)));
  $("empty").hidden = Boolean(deck);
  $("study").hidden = !deck;
  $("done").hidden = true;
  for (const b of ["shuffle", "delete", "deck"]) $(b).disabled = !deck;
  if (!deck) return;
  document.title = `Flashcards: ${deck.title}`;
  $("from").textContent = deck.from ? `From your chat “${deck.from}”` : "";
  start(deck.cards.map((_, i) => i));
}

function start(indexes) {
  order = indexes;
  position = 0;
  $("study").hidden = false;
  $("done").hidden = true;
  show();
}

function show() {
  const card = deck.cards[order[position]];
  $("card").classList.remove("flipped");
  $("card").classList.toggle("known", card.known);
  $("front").textContent = card.front;
  // Wait for the flip back before swapping in the new answer, so it isn't seen early.
  setTimeout(() => ($("back").textContent = card.back), 150);
  $("counter").textContent = `Card ${position + 1} of ${order.length}`;
  const known = deck.cards.filter((c) => c.known).length;
  $("known").textContent = `${known} of ${deck.cards.length} known`;
  $("progress-bar").style.width = `${(known / deck.cards.length) * 100}%`;
  $("prev").disabled = position === 0;
}

const flip = () => $("card").classList.toggle("flipped");

function move(by) {
  const next = position + by;
  if (next < 0) return;
  if (next >= order.length) return finish();
  position = next;
  show();
}

async function mark(known) {
  const index = order[position];
  deck.cards[index].known = known;
  await buddy.markCard(deck.id, index, known);
  move(1);
}

function finish() {
  const missed = deck.cards.map((c, i) => (c.known ? -1 : i)).filter((i) => i >= 0);
  const known = deck.cards.length - missed.length;
  $("study").hidden = true;
  $("done").hidden = false;
  $("done-title").textContent = missed.length ? `${known} of ${deck.cards.length} known` : "You know them all! 🎉";
  $("done-text").textContent = missed.length ? `${missed.length} to go. Want another pass at those?` : "Nice work.";
  $("review").hidden = missed.length === 0;
  $("review").onclick = () => start(missed);
}

function shuffle() {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  position = 0;
  show();
}

$("card").addEventListener("click", flip);
$("prev").addEventListener("click", () => move(-1));
$("next").addEventListener("click", () => move(1));
$("again").addEventListener("click", () => mark(false));
$("got").addEventListener("click", () => mark(true));
$("shuffle").addEventListener("click", shuffle);
$("restart").addEventListener("click", () => start(deck.cards.map((_, i) => i)));
$("deck").addEventListener("change", () => load($("deck").value));
$("delete").addEventListener("click", async () => {
  if (!confirm(`Delete the deck “${deck.title}”? This can't be undone.`)) return;
  await buddy.deleteDeck(deck.id);
  load();
});

document.addEventListener("keydown", (e) => {
  if (!deck || $("study").hidden || e.target.tagName === "SELECT") return;
  const keys = { " ": flip, ArrowLeft: () => move(-1), ArrowRight: () => move(1), 1: () => mark(false), 2: () => mark(true), s: shuffle };
  if (keys[e.key]) {
    e.preventDefault();
    keys[e.key]();
  }
});

// He made a new deck, or another one was picked from a chat.
buddy.onDecksChanged(() => load());

load();

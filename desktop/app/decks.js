// Flashcard decks, saved in the app's data folder as decks/<id>.json:
//   { id, title, from, createdAt, cards: [{ front, back, known }] }
// `from` is the title of the chat the deck was made in. The Flashcards window
// shows one deck at a time and records which cards you got right.

import { app, ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openPanel, sendToPanel } from "./panels.js";

const VALID_ID = /^[\w-]+$/;
const folder = () => path.join(app.getPath("userData"), "decks");
const fileOf = (id) => {
  if (!VALID_ID.test(id)) throw new Error("Invalid deck id");
  return path.join(folder(), `${id}.json`);
};

let showing = null; // the deck the Flashcards window should show

ipcMain.handle("decks:list", () => listDecks());
// The deck asked for, else the one last opened, else the newest (or null if there are none).
ipcMain.handle("decks:get", (_e, id) => loadDeck(id ?? showing) ?? loadDeck());
ipcMain.handle("decks:mark", (_e, id, index, known) => markCard(id, index, known));
ipcMain.handle("decks:delete", (_e, id) => fs.rmSync(fileOf(id), { force: true }));

export function createDeck({ title, from, cards }) {
  const deck = {
    id: randomUUID(),
    title,
    from,
    createdAt: Date.now(),
    cards: cards.map(({ front, back }) => ({ front, back, known: false })),
  };
  fs.mkdirSync(folder(), { recursive: true });
  fs.writeFileSync(fileOf(deck.id), JSON.stringify(deck, null, 2));
  return deck;
}

// Opens the Flashcards window on a deck (or brings it forward and switches to it).
export function openFlashcards(id) {
  if (id) showing = id;
  openPanel("flashcards");
  sendToPanel("flashcards", "decks:changed");
}

// Newest first: { id, title, from, createdAt, count, known }.
export function listDecks() {
  if (!fs.existsSync(folder())) return [];
  const decks = [];
  for (const file of fs.readdirSync(folder())) {
    try {
      const { id, title, from, createdAt, cards } = JSON.parse(fs.readFileSync(path.join(folder(), file), "utf8"));
      decks.push({ id, title, from, createdAt, count: cards.length, known: cards.filter((c) => c.known).length });
    } catch {
      // A damaged deck file; skip it.
    }
  }
  return decks.sort((a, b) => b.createdAt - a.createdAt);
}

export function loadDeck(id) {
  if (!id) return listDecks()[0] ? loadDeck(listDecks()[0].id) : null;
  try {
    return JSON.parse(fs.readFileSync(fileOf(id), "utf8"));
  } catch {
    return null;
  }
}

function markCard(id, index, known) {
  const deck = loadDeck(id);
  if (!deck?.cards[index]) return;
  deck.cards[index].known = known;
  fs.writeFileSync(fileOf(id), JSON.stringify(deck, null, 2));
}

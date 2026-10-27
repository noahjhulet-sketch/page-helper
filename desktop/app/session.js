// A session is one conversation with the buddy: it can start from a snip, the
// clipboard, or just a typed question, and you can attach more snips or copied
// text along the way. It drives one bubble and is saved to history after each
// finished answer.

import { randomUUID } from "node:crypto";
import { isCancelled, streamMessage } from "../../core/claude.js";
import { sourceBlock } from "../actions/_shared.js";
import { menuItems } from "./actions.js";
import { openBubble } from "./bubbles.js";

const CHAT_SYSTEM =
  "You're a friendly study buddy. Answer clearly and concisely, in Markdown. " +
  "The user may attach screen snips (images of part of their screen) or copied text (inside <clipboard> tags). " +
  "When they have, base your answers on those first and say when you add outside knowledge. " +
  "If an image is too small or blurry to read, say so instead of guessing.";

// "Explain", or a question typed into Ask or the chat.
function titleFor({ question, actionId, label }) {
  if (!question) return label;
  return actionId && actionId !== "ask" ? `${label}: ${question}` : question;
}

export class Session {
  // `app` provides: actions, settings(), near(), setMascotState(state, ms), save(session).
  // A source is { input, thumbnail, preview } (see actions/_shared.js for input).
  // A turn is a finished answer: { question, actionId, label, markdown, sources }, where
  // `sources` lists the indexes of the sources sent with that question.
  constructor(app, { id = randomUUID(), createdAt = Date.now(), input, thumbnail = "", preview = "", sources, turns = [] }) {
    Object.assign(this, { app, id, createdAt, turns });
    this.sources = sources ?? (input ? [{ input, thumbnail, preview }] : []);
    this.pending = []; // sources attached since the last question
    this.bubble = null;
    this.controller = null;
  }

  get title() {
    return this.turns[0] ? titleFor(this.turns[0]) : this.sources[0]?.preview || "Chat";
  }

  // Opens the bubble.
  //   actionId: run that tool on the first source right away
  //   question: ask it right away (a plain chat started from the chat bar)
  // With a source but neither of those, the bubble offers the tool menu.
  open({ actionId, question, title = "", focus = false } = {}) {
    const first = this.sources[0];
    this.bubble = openBubble({
      title: title || (this.turns.length ? this.title : ""),
      thumbnail: first?.thumbnail ?? "",
      preview: first?.preview ?? "",
      menu: first && !actionId && !question && !this.turns.length ? menuItems(this.app.actions) : null,
      turns: this.turns.map((t) => ({ ...t, attachments: this.#chipsFor(t) })),
      near: this.app.near(),
      focus,
      onChoose: (id, q) => this.runTool(id, q),
      onAsk: (q) => this.ask(q),
      onAttach: (how) => this.app.attach(this, how),
      onRemovePending: (i) => this.removePending(i),
      onClose: () => this.controller?.abort(),
    });
    if (actionId) this.runTool(actionId, question);
    else if (question) this.ask(question);
  }

  // Runs a tool on the first source (the snip or clipboard the session started from).
  runTool(actionId, question) {
    const action = this.app.actions.find((a) => a.id === actionId);
    if (!action || !this.sources[0]) return;
    this.#run({ question: question || null, actionId, label: action.label, sources: [0] }, (options) =>
      action.run({ input: this.sources[0].input, question, ...options }),
    );
  }

  ask(question) {
    if (this.controller) return; // one answer at a time
    const sources = this.pending;
    this.pending = [];
    this.#showPending();
    this.#run({ question, actionId: null, label: "Chat", sources }, ({ settings, onText, signal }) =>
      streamMessage(
        settings,
        { max_tokens: 16000, output_config: { effort: "medium" }, system: CHAT_SYSTEM, messages: this.#conversation(question, sources) },
        onText,
        signal,
      ),
    );
  }

  // Adds a snip or clipboard source to send with the next question.
  attach(source) {
    this.sources.push(source);
    this.pending.push(this.sources.length - 1);
    this.#showPending();
  }

  removePending(position) {
    this.pending.splice(position, 1);
    this.#showPending();
  }

  toEntry() {
    return {
      id: this.id,
      createdAt: this.createdAt,
      title: this.title,
      thumbnail: this.sources[0]?.thumbnail ?? "",
      preview: this.sources[0]?.preview ?? "",
      sources: this.sources,
      turns: this.turns,
    };
  }

  #showPending() {
    this.bubble?.setPending(this.#chips(this.pending));
  }

  #chips(indexes) {
    return indexes.map((i) => ({ thumbnail: this.sources[i].thumbnail, preview: this.sources[i].preview }));
  }

  // A tool's source is already shown in the bubble's header, so only chat questions
  // show what was attached to them.
  #chipsFor(turn) {
    return turn.actionId ? [] : this.#chips(turn.sources);
  }

  async #run(turn, call) {
    if (this.controller) return; // one answer at a time
    const { bubble } = this;
    const { setMascotState } = this.app;
    const controller = (this.controller = new AbortController());
    const index = bubble.addTurn({ ...turn, attachments: this.#chipsFor(turn) });
    if (!this.turns.length) bubble.setTitle(titleFor(turn));
    setMascotState("thinking");

    try {
      const markdown = await call({
        settings: this.app.settings(),
        signal: controller.signal,
        onText: (text) => {
          setMascotState("talking");
          bubble.updateTurn(index, text, "streaming");
        },
      });
      bubble.updateTurn(index, markdown, "done");
      this.turns.push({ ...turn, markdown });
      this.app.save(this);
      setMascotState("talking", 1500);
    } catch (err) {
      // Attachments that didn't get an answer go back to waiting for the next question.
      if (!turn.actionId && turn.sources.length) {
        this.pending.unshift(...turn.sources);
        this.#showPending();
      }
      if (controller.signal.aborted || isCancelled(err)) return setMascotState("idle");
      console.error(err);
      bubble.failTurn(index, err.message);
      setMascotState("error", 1600);
    } finally {
      this.controller = null;
    }
  }

  // Every earlier question (with the sources sent with it) and answer, then the new question.
  #conversation(question, newSources) {
    const user = (sources, text) => ({
      role: "user",
      content: [...sources.map((i) => sourceBlock(this.sources[i].input)), { type: "text", text }],
    });
    const messages = [];
    for (const t of this.turns) {
      const action = this.app.actions.find((a) => a.id === t.actionId);
      messages.push(user(t.sources, t.question || `${t.label}: ${action?.description ?? ""}`));
      messages.push({ role: "assistant", content: t.markdown });
    }
    messages.push(user(newSources, question));
    return messages;
  }
}

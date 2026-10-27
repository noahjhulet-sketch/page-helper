// A session is one snip or clipboard grab plus everything asked about it: the
// first tool's answer and any follow-up questions. It drives one bubble and is
// saved to history after each finished answer.

import { randomUUID } from "node:crypto";
import { isCancelled, streamMessage } from "../../core/claude.js";
import { sourceNote, userContent } from "../actions/_shared.js";
import { menuItems } from "./actions.js";
import { openBubble } from "./bubbles.js";

// "Explain", "Summarize: focus on dates", or a question typed into Ask.
function titleFor({ question, actionId, label }) {
  if (!question) return label;
  return actionId && actionId !== "ask" ? `${label}: ${question}` : question;
}

export class Session {
  // `app` provides: actions, settings(), near(), setMascotState(state, ms), save(session).
  // `turns` are finished answers: { question, actionId, label, markdown }.
  constructor(app, { id = randomUUID(), createdAt = Date.now(), input, thumbnail = "", preview = "", turns = [] }) {
    Object.assign(this, { app, id, createdAt, input, thumbnail, preview, turns });
    this.bubble = null;
    this.controller = null;
  }

  get title() {
    return this.turns[0] ? titleFor(this.turns[0]) : this.preview || "Untitled";
  }

  // Opens the bubble. With an actionId, runs that tool right away; with neither an
  // actionId nor earlier answers, the bubble offers the tool menu.
  open({ actionId, question, title = "", focus = false } = {}) {
    this.bubble = openBubble({
      title: title || (this.turns.length ? this.title : ""),
      thumbnail: this.thumbnail,
      preview: this.preview,
      menu: actionId || this.turns.length ? null : menuItems(this.app.actions),
      turns: this.turns,
      near: this.app.near(),
      focus,
      onChoose: (id, q) => this.runTool(id, q),
      onAsk: (q) => this.ask(q),
      onClose: () => this.controller?.abort(),
    });
    if (actionId) this.runTool(actionId, question);
  }

  runTool(actionId, question) {
    const action = this.app.actions.find((a) => a.id === actionId);
    if (!action) return;
    this.#run({ question: question || null, actionId, label: action.label }, (options) =>
      action.run({ input: this.input, question, ...options }),
    );
  }

  ask(question) {
    this.#run({ question, actionId: null, label: "Follow-up" }, ({ settings, onText, signal }) =>
      streamMessage(
        settings,
        {
          max_tokens: 16000,
          output_config: { effort: "medium" },
          system: `You're helping someone understand what they're reading. ${sourceNote(this.input)} Answer their follow-up questions concisely, in Markdown. If you add outside knowledge, say so.`,
          messages: this.#conversation(question),
        },
        onText,
        signal,
      ),
    );
  }

  toEntry() {
    const { kind, text, mediaType } = this.input;
    return {
      id: this.id,
      createdAt: this.createdAt,
      title: this.title,
      thumbnail: this.thumbnail,
      preview: this.preview,
      input: { kind, text, mediaType },
      turns: this.turns,
    };
  }

  async #run(turn, call) {
    if (this.controller) return; // one answer at a time
    const { bubble } = this;
    const { setMascotState } = this.app;
    const controller = (this.controller = new AbortController());
    const index = bubble.addTurn(turn);
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
      if (controller.signal.aborted || isCancelled(err)) return setMascotState("idle");
      console.error(err);
      bubble.failTurn(index, err.message);
      setMascotState("error", 1600);
    } finally {
      this.controller = null;
    }
  }

  // The messages for a follow-up: the original input and the first tool's answer,
  // then each later question and answer, then the new question.
  #conversation(question) {
    const [first, ...rest] = this.turns;
    if (!first) return [{ role: "user", content: userContent(this.input, question) }];

    const action = this.app.actions.find((a) => a.id === first.actionId);
    const opener = first.question || `${first.label}: ${action?.description ?? ""}`;
    const messages = [
      { role: "user", content: userContent(this.input, opener) },
      { role: "assistant", content: first.markdown },
    ];
    for (const t of rest) messages.push({ role: "user", content: t.question }, { role: "assistant", content: t.markdown });
    messages.push({ role: "user", content: question });
    return messages;
  }
}

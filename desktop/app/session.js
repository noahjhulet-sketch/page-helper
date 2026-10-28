// A session is one conversation with the buddy: it can start from a snip, the
// clipboard, or just a typed question, and you can attach more snips or copied
// text along the way. It drives one bubble and is saved to history after each
// finished answer.

import { randomUUID } from "node:crypto";
import { isCancelled, streamFullMessage, textOf } from "../../core/claude.js";
import { sourceBlock } from "../actions/_shared.js";
import { toolDefinitions } from "./abilities.js";
import { menuItems } from "./actions.js";
import { openBubble } from "./bubbles.js";

const CHAT_SYSTEM =
  "You're a friendly study buddy. Answer clearly and concisely, in Markdown. " +
  "The user may attach screen snips (images of part of their screen) or copied text (inside <clipboard> tags). " +
  "When they have, base your answers on those first and say when you add outside knowledge. " +
  "If an image is too small or blurry to read, say so instead of guessing.";

const WEB_NOTE =
  " You can search the web and read pages. When the user wants a source, an article or a file, find a specific, " +
  "reputable page yourself (not a page of search results), check that it covers what they need, and give them its direct link. ";

const ABILITIES_NOTE =
  " You can also do a few things on the user's computer with your tools: open an app, open a website or a search, " +
  "put text into Notepad, or copy text to the clipboard. Only use them when the user asks you to do something like that. " +
  "To open a source or file you found, use open_website with its exact link; the browser handles downloads like PDFs. " +
  "The user sees each action and approves or skips it; if they skip one, don't try it again unless they ask. " +
  "You can't click or type inside other apps.";

const MAX_STEPS = 6; // tool uses in one answer, so a confused reply can't loop forever

const join = (a, b) => (a && b ? `${a}\n\n${b}` : a || b);

// "Explain", or a question typed into Ask or the chat.
function titleFor({ question, actionId, label }) {
  if (!question) return label;
  return actionId && actionId !== "ask" ? `${label}: ${question}` : question;
}

export class Session {
  // `app` provides: actions, abilities, abilitiesOn(), settings(), near(),
  // setMascotState(state, ms), save(session), attach(session, how), and optionally
  // stream (a stand-in for the API call, used by the smoke test).
  // A source is { input, thumbnail, preview } (see actions/_shared.js for input).
  // A turn is a finished answer: { question, actionId, label, markdown, sources, actions }, where
  // `sources` lists the indexes of the sources sent with that question and `actions`
  // the things done on the computer: { icon, label, status, detail }.
  constructor(app, { id = randomUUID(), createdAt = Date.now(), input, thumbnail = "", preview = "", sources, turns = [] }) {
    Object.assign(this, { app, id, createdAt, turns });
    this.sources = sources ?? (input ? [{ input, thumbnail, preview }] : []);
    this.pending = []; // sources attached since the last question
    this.bubble = null;
    this.controller = null;
    this.decisions = new Map(); // "turn:action" → resolve(approved), for actions awaiting approval
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
      onDecide: (turn, action, choice) => this.decisions.get(`${turn}:${action}`)?.(choice),
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
    this.#run({ question, actionId: null, label: "Chat", sources }, (options) => this.#chat(question, sources, options));
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

  // One chat answer. If abilities are on, Claude may ask to do things on the computer:
  // each request is shown for approval, run (or skipped), and the result sent back
  // so Claude can carry on.
  async #chat(question, sources, { settings, onText, signal, index }) {
    const abilities = this.app.abilitiesOn() ? this.app.abilities : [];
    const messages = this.#conversation(question, sources);
    const actions = [];
    let markdown = "";

    for (let step = 0; step <= MAX_STEPS; step++) {
      const message = await (this.app.stream ?? streamFullMessage)(
        settings,
        {
          max_tokens: 16000,
          output_config: { effort: "medium" },
          system: CHAT_SYSTEM + WEB_NOTE + (abilities.length ? ABILITIES_NOTE : ""),
          tools: [...webTools(settings.model), ...toolDefinitions(abilities)],
          messages,
        },
        (text) => onText(join(markdown, text)),
        signal,
      );
      markdown = join(markdown, textOf(message));
      // A long web search can pause partway; send it back to carry on.
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      if (message.stop_reason !== "tool_use") {
        if (message.stop_reason === "max_tokens") markdown += "\n\n*(Response was cut off at the length limit.)*";
        return { markdown, actions };
      }
      if (step === MAX_STEPS) break;

      messages.push({ role: "assistant", content: message.content });
      const results = [];
      // Only our own tools come back as "tool_use"; web search and reading run on the server.
      for (const use of message.content.filter((b) => b.type === "tool_use")) {
        const { text, isError } = await this.#act(use, abilities, actions, index, signal);
        results.push({ type: "tool_result", tool_use_id: use.id, content: text, is_error: isError });
      }
      messages.push({ role: "user", content: results });
      onText(markdown);
    }
    return { markdown: join(markdown, "*(Stopped: that took too many steps.)*"), actions };
  }

  // Shows one requested action and runs it once allowed. Kinds of action marked
  // "Always allow" run straight away; the rest wait for Allow, Always allow or Skip.
  async #act(use, abilities, actions, turnIndex, signal) {
    const ability = abilities.find((a) => a.name === use.name);
    if (!ability) return { text: `There's no tool called ${use.name}.`, isError: true };

    const auto = this.app.isAutoAllowed(ability.name);
    const entry = {
      icon: ability.icon,
      label: ability.describe(use.input),
      permission: ability.permission ?? ability.name,
      status: auto ? "running" : "waiting",
      detail: "",
    };
    actions.push(entry);
    const show = () => this.bubble.setActions(turnIndex, actions);
    show();

    let approved = true;
    if (!auto) {
      this.app.setMascotState("listening");
      const choice = await this.#decision(turnIndex, actions.length - 1, signal);
      if (choice === "always") this.app.autoAllow(ability.name);
      approved = choice !== "skip";
    }
    if (!approved) {
      entry.status = "skipped";
      show();
      return { text: "The user chose to skip this.", isError: false };
    }
    entry.status = "running";
    show();
    try {
      entry.detail = (await ability.run(use.input)) || "Done.";
      entry.status = "done";
      return { text: entry.detail, isError: false };
    } catch (err) {
      entry.status = "failed";
      entry.detail = err.message;
      return { text: `It didn't work: ${err.message}`, isError: true };
    } finally {
      show();
      this.app.setMascotState("thinking");
    }
  }

  // Resolves "allow", "always" or "skip"; rejects if the bubble is closed meanwhile.
  #decision(turnIndex, actionIndex, signal) {
    const key = `${turnIndex}:${actionIndex}`;
    return new Promise((resolve, reject) => {
      const stop = () => {
        this.decisions.delete(key);
        reject(signal.reason);
      };
      if (signal.aborted) return stop();
      signal.addEventListener("abort", stop, { once: true });
      this.decisions.set(key, (choice) => {
        this.decisions.delete(key);
        signal.removeEventListener("abort", stop);
        resolve(choice);
      });
    });
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
      // Tools return Markdown; chats return { markdown, actions }.
      const result = await call({
        settings: this.app.settings(),
        signal: controller.signal,
        index,
        onText: (text) => {
          setMascotState("talking");
          bubble.updateTurn(index, text, "streaming");
        },
      });
      const { markdown, actions = [] } = typeof result === "string" ? { markdown: result } : result;
      bubble.updateTurn(index, markdown, "done");
      this.turns.push({ ...turn, markdown, actions });
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
      messages.push({ role: "assistant", content: join(t.markdown, actionsNote(t.actions)) || "(no reply)" });
    }
    messages.push(user(newSources, question));
    return messages;
  }
}

// Earlier answers are replayed as text, so note what was done on the computer.
function actionsNote(actions = []) {
  if (!actions.length) return "";
  const lines = actions.map((a) => `- ${a.label}: ${a.status === "done" ? a.detail : a.status}`);
  return `[Actions on the user's computer during this answer]\n${lines.join("\n")}`;
}

// Web search and page reading, run by Anthropic's servers. Haiku gets the basic
// search tool; the newer ones (which filter results better) need Opus or Sonnet.
function webTools(model) {
  if (model.startsWith("claude-haiku")) return [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
  return [
    { type: "web_search_20260209", name: "web_search", max_uses: 5 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 },
  ];
}

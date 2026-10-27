import { getSettings, createMessage, streamMessage } from "./api.js";
import { extractPage, collectBlankFields, fillBlankFields } from "./page.js";
import { renderMarkdown } from "./core/markdown.js";
import {
  SUMMARY_SYSTEM, SUMMARY_STYLES, BLANKS_SYSTEM, BLANKS_SCHEMA,
  SOURCE_KINDS, SOURCES_FORMAT, ASK_SYSTEM,
} from "./core/prompts.js";

const MAX_PAGE_CHARS = 200_000;
const $ = (id) => document.getElementById(id);

let currentUrl = "";
let chatHistory = [];
let chatPageUrl = "";
let blankAnswers = [];
let blankTabId = null;

// ---------- Helpers ----------

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function runInTab(tabId, func, args = []) {
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
    return res?.result;
  } catch {
    throw new Error("Page Helper can't read this page. Browser pages (chrome://), the Web Store, and some PDFs are off-limits.");
  }
}

async function readPage() {
  const tab = await activeTab();
  const page = await runInTab(tab.id, extractPage);
  if (!page?.text) throw new Error("This page has no readable text.");
  page.truncated = page.text.length > MAX_PAGE_CHARS;
  if (page.truncated) page.text = page.text.slice(0, MAX_PAGE_CHARS);
  page.tabId = tab.id;
  return page;
}

function pageBlock(page) {
  return `<page title="${page.title}" url="${page.url}">\n${page.text}\n</page>`;
}

function truncationNote(page) {
  return page.truncated
    ? `<div class="note">This page is very long, so only the first ${MAX_PAGE_CHARS.toLocaleString()} characters were read.</div>`
    : "";
}

function setStatus(text) {
  const el = $("status");
  el.hidden = !text;
  el.innerHTML = text ? `<span class="dots">${text}</span>` : "";
}

function showError(el, err) {
  el.className = "output error";
  el.textContent = err.message || String(err);
}

async function busy(button, label, work) {
  button.disabled = true;
  setStatus(label);
  try {
    await work();
  } finally {
    button.disabled = false;
    setStatus("");
  }
}

// ---------- Header and tabs ----------

async function refreshHeader() {
  const tab = await activeTab();
  if (!tab) return;
  $("page-title").textContent = tab.title || "Untitled page";
  $("page-url").textContent = tab.url || "";
  if (tab.url !== currentUrl) {
    currentUrl = tab.url;
    blankAnswers = [];
    $("blanks-fill").hidden = true;
  }
}

function selectTab(name) {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== `tab-${name}`));
}

async function refreshKeyWarning() {
  const { apiKey } = await getSettings();
  $("key-warning").hidden = Boolean(apiKey);
}

// ---------- Summary ----------

async function runSummary() {
  const out = $("summary-out");
  await busy($("summary-run"), "Reading the page", async () => {
    try {
      const page = await readPage();
      const settings = await getSettings();
      const style = SUMMARY_STYLES[$("summary-style").value];
      const target = page.selection
        ? `Summarize only this highlighted passage from the page:\n<selection>\n${page.selection}\n</selection>`
        : "Summarize the page.";

      setStatus("Summarizing");
      out.className = "output";
      out.textContent = "";
      const text = await streamMessage(
        settings,
        {
          max_tokens: 8000,
          output_config: { effort: "medium" },
          system: SUMMARY_SYSTEM,
          messages: [{ role: "user", content: `${pageBlock(page)}\n\n${target} ${style}` }],
        },
        (t) => (out.innerHTML = renderMarkdown(t))
      );
      out.innerHTML = renderMarkdown(text) + truncationNote(page);
    } catch (err) {
      showError(out, err);
    }
  });
}

// ---------- Fill in the blanks ----------

async function runBlanks() {
  const out = $("blanks-out");
  $("blanks-fill").hidden = true;
  await busy($("blanks-run"), "Looking for blanks", async () => {
    try {
      const page = await readPage();
      const fields = await runInTab(page.tabId, collectBlankFields);
      const settings = await getSettings();

      const fieldList = fields.length
        ? fields.map((f) => `- ${f.id}${f.label ? ` (label: ${f.label})` : ""}: ${f.context}`).join("\n")
        : "(none)";

      setStatus("Working out answers");
      const msg = await createMessage(settings, {
        max_tokens: 16000,
        output_config: { effort: "high", format: { type: "json_schema", schema: BLANKS_SCHEMA } },
        system: BLANKS_SYSTEM,
        messages: [
          {
            role: "user",
            content:
              `${pageBlock(page)}\n\nEmpty input fields on the page (id: surrounding text, with the field shown as ____):\n${fieldList}\n\n` +
              "Answer each input field that is part of a question, using its id. Also find any blanks written into the page text itself (runs of underscores, [blank], or similar) and answer those with ids t1, t2, and so on. Return an empty list if there are no blanks.",
          },
        ],
      });

      const textBlock = msg.content.find((b) => b.type === "text");
      blankAnswers = JSON.parse(textBlock?.text || '{"answers":[]}').answers;
      blankTabId = page.tabId;
      renderBlanks(out, page);
    } catch (err) {
      showError(out, err);
    }
  });
}

function renderBlanks(out, page) {
  out.className = "output";
  out.innerHTML = "";
  if (!blankAnswers.length) {
    out.className = "output empty";
    out.textContent = "No fill-in-the-blank questions found on this page.";
    return;
  }
  for (const a of blankAnswers) {
    const item = document.createElement("div");
    item.className = "blank";
    const kind = a.id.startsWith("f") ? "Field" : "Text";
    item.innerHTML = `
      <div class="blank-q"><span class="tag">${kind}</span><span class="tag">${a.confidence} confidence</span></div>
      <div class="blank-q"></div>
      <div class="blank-a"></div>
      <div class="blank-why"></div>`;
    item.children[1].textContent = a.question;
    item.children[2].textContent = a.answer;
    item.children[3].textContent = a.explanation;
    out.appendChild(item);
  }
  out.insertAdjacentHTML("beforeend", truncationNote(page));
  $("blanks-fill").hidden = !blankAnswers.some((a) => a.id.startsWith("f"));
}

async function fillBlanks() {
  const fields = blankAnswers.filter((a) => a.id.startsWith("f"));
  try {
    const count = await runInTab(blankTabId, fillBlankFields, [fields]);
    setStatus("");
    $("blanks-fill").textContent = `Filled ${count} field${count === 1 ? "" : "s"}`;
    setTimeout(() => ($("blanks-fill").textContent = "Fill answers into page"), 2500);
  } catch (err) {
    showError($("blanks-out"), err);
  }
}

// ---------- Similar sources ----------

async function runSources() {
  const out = $("sources-out");
  const links = $("sources-links");
  links.innerHTML = "";
  await busy($("sources-run"), "Reading the page", async () => {
    try {
      const page = await readPage();
      const settings = await getSettings();
      // The topic is clear from the opening of the page; no need to send all of it.
      const excerpt = { ...page, text: page.text.slice(0, 8000) };

      const messages = [
        {
          role: "user",
          content: `${pageBlock(excerpt)}\n\n${SOURCE_KINDS[$("sources-kind").value]}\n\n${SOURCES_FORMAT}`,
        },
      ];

      setStatus("Searching the web");
      let msg;
      // Web search runs on the server; a long search can pause and needs to be continued.
      for (let i = 0; i < 4; i++) {
        msg = await createMessage(settings, {
          max_tokens: 16000,
          output_config: { effort: "medium" },
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
          messages,
        });
        if (msg.stop_reason !== "pause_turn") break;
        messages.push({ role: "assistant", content: msg.content });
      }

      const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      out.className = "output";
      out.innerHTML = renderMarkdown(text || "No sources found.");
      renderSourceLinks(links, msg.content);
    } catch (err) {
      showError(out, err);
    }
  });
}

function renderSourceLinks(list, content) {
  const seen = new Map();
  for (const block of content) {
    for (const c of block.citations || []) {
      if (c.url && !seen.has(c.url)) seen.set(c.url, c.title || c.url);
    }
  }
  for (const [url, title] of seen) {
    let host = "";
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = title;
    const span = document.createElement("span");
    span.className = "host";
    span.textContent = host;
    a.appendChild(span);
    li.appendChild(a);
    list.appendChild(li);
  }
}

// ---------- Ask ----------

function resetChat() {
  chatHistory = [];
  chatPageUrl = "";
  $("chat").innerHTML = '<div class="output empty">Ask anything about this page. Highlighted text is included automatically.</div>';
}

async function ask(question) {
  question = question.trim();
  if (!question) return;
  const chat = $("chat");
  const sendBtn = $("ask-form").querySelector("button[type=submit]");

  await busy(sendBtn, "Reading the page", async () => {
    let answerEl;
    try {
      const page = await readPage();
      if (page.url !== chatPageUrl) resetChat();
      chat.querySelector(".empty")?.remove();

      const userEl = document.createElement("div");
      userEl.className = "msg-user";
      userEl.textContent = question;
      chat.appendChild(userEl);
      answerEl = document.createElement("div");
      answerEl.className = "output";
      chat.appendChild(answerEl);

      let content = question;
      if (page.selection) content = `Highlighted text:\n<selection>\n${page.selection}\n</selection>\n\n${question}`;
      // The page goes into the first message only; later turns refer back to it.
      if (!chatHistory.length) {
        content = `${pageBlock(page)}\n\n${content}`;
        chatPageUrl = page.url;
      }
      chatHistory.push({ role: "user", content });

      setStatus("Thinking");
      const settings = await getSettings();
      const text = await streamMessage(
        settings,
        {
          max_tokens: 16000,
          output_config: { effort: "medium" },
          system: ASK_SYSTEM,
          messages: chatHistory,
        },
        (t) => {
          answerEl.innerHTML = renderMarkdown(t);
          chat.scrollTop = chat.scrollHeight;
        }
      );
      answerEl.innerHTML = renderMarkdown(text);
      chatHistory.push({ role: "assistant", content: text });
    } catch (err) {
      // Drop the unanswered question so the conversation stays valid.
      if (chatHistory.at(-1)?.role === "user") chatHistory.pop();
      if (answerEl) showError(answerEl, err);
      else showError(chat.appendChild(document.createElement("div")), err);
    }
  });
}

// ---------- Requests from the right-click menu ----------

async function handlePending() {
  const { pending } = await chrome.storage.session.get("pending");
  if (!pending || Date.now() - pending.at > 30_000) return;
  await chrome.storage.session.remove("pending");
  await refreshHeader();
  if (pending.mode === "summary") {
    selectTab("summary");
    runSummary();
  } else {
    selectTab("ask");
    ask(pending.text);
  }
}

// ---------- Wiring ----------

document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => selectTab(b.dataset.tab)));
$("open-settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("key-warning-btn").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("summary-run").addEventListener("click", runSummary);
$("blanks-run").addEventListener("click", runBlanks);
$("blanks-fill").addEventListener("click", fillBlanks);
$("sources-run").addEventListener("click", runSources);
$("ask-clear").addEventListener("click", resetChat);
$("ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("ask-input");
  const q = input.value;
  input.value = "";
  ask(q);
});
$("ask-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("ask-form").requestSubmit();
  }
});

chrome.tabs.onActivated.addListener(refreshHeader);
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (tab.active && (change.status === "complete" || change.title)) refreshHeader();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.pending?.newValue) handlePending();
  if (area === "local" && changes.apiKey) refreshKeyWarning();
});

refreshHeader();
refreshKeyWarning();
handlePending();

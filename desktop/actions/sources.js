import { createMessage, textOf } from "../../core/claude.js";
import { SCREEN_CONTEXT, imageBlock } from "./_shared.js";

export default {
  id: "sources",
  label: "Sources",
  icon: "🔎",
  description: "Search the web for related sources",
  order: 4,

  async run({ image, settings, onText, signal }) {
    onText("*Searching the web…*");
    const messages = [
      {
        role: "user",
        content: [
          imageBlock(image),
          {
            type: "text",
            text:
              "Find 5–8 high-quality sources on the topic shown here: original reporting, official documents or academic work where possible. " +
              "Write a Markdown list. For each, give a linked title, the site name, and one sentence on what it adds. " +
              "Finish with one line on whether the sources agree with what's on screen.",
          },
        ],
      },
    ];

    // Web search runs on the server; a long search can pause and needs to be continued.
    let message;
    for (let i = 0; i < 4; i++) {
      message = await createMessage(
        settings,
        {
          max_tokens: 16000,
          output_config: { effort: "medium" },
          system: `You find sources for what someone is reading. ${SCREEN_CONTEXT}`,
          tools: [{ type: searchTool(settings.model), name: "web_search", max_uses: 6 }],
          messages,
        },
        signal,
      );
      if (message.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: message.content });
    }

    return (textOf(message) || "No sources found.") + citedLinks(message);
  },
};

// The newer search tool filters results better but needs Opus or Sonnet.
function searchTool(model) {
  return model.startsWith("claude-haiku") ? "web_search_20250305" : "web_search_20260209";
}

// Every page the answer cites, as a list at the end.
function citedLinks(message) {
  const seen = new Map();
  for (const block of message.content) {
    for (const c of block.citations ?? []) {
      if (c.url && !seen.has(c.url)) seen.set(c.url, c.title || c.url);
    }
  }
  if (!seen.size) return "";
  const lines = [...seen].map(([url, title]) => `- [${title.replace(/[[\]]/g, "")}](${url})`);
  return `\n\n#### Cited pages\n${lines.join("\n")}`;
}

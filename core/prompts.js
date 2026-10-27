// Prompts and output formats for the tools, shared by the Chrome extension and the
// desktop app. Each app adds its own content (page text, screenshot) around these.

// ---------- Summary ----------

export const SUMMARY_SYSTEM =
  "You help people understand web pages. Base your summary only on the page content provided. Skip navigation, ads, and boilerplate. Use Markdown.";

export const SUMMARY_STYLES = {
  brief: "Write a brief summary of 3–5 sentences.",
  points: "Summarize as 5–8 bullet points covering the key ideas, facts, and conclusions. Start with a one-sentence overview.",
  detailed: "Write a detailed summary organized by the page's main sections, using a short heading for each.",
  simple: "Explain what this page says in plain, simple language a 12-year-old could follow. Define any jargon.",
};

// ---------- Fill in the blanks ----------

export const BLANKS_SYSTEM =
  "You help people complete fill-in-the-blank exercises and forms on web pages. Use the page content as context and your own knowledge. Give the single best answer for each blank, sized to fit the blank (usually a word or short phrase), and a short explanation so the reader learns why. If a field is clearly not a question (a search box, a login, a comment box), skip it.";

export const BLANKS_SCHEMA = {
  type: "object",
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "The field id (f1, f2…) or t1, t2… for blanks written in the text" },
          question: { type: "string", description: "The sentence or question containing the blank, with the blank shown as ____" },
          answer: { type: "string" },
          explanation: { type: "string", description: "One or two sentences on why this is the answer" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["id", "question", "answer", "explanation", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["answers"],
  additionalProperties: false,
};

// ---------- Similar sources ----------

export const SOURCE_KINDS = {
  similar: "Find 5–8 high-quality articles or pages that cover the same topic, from different sites than this one.",
  primary: "Find 5–8 primary sources, official documents, studies, or academic papers that the claims on this page rely on or relate to.",
  opposing: "Find 5–8 credible sources that offer different perspectives or disagree with this page's main points.",
  factcheck: "Pick the 3–5 most important factual claims on this page and search for sources that confirm or contradict each one.",
};

export const SOURCES_FORMAT =
  "Write the result as a Markdown list. For each source give a linked title, the site name, and one sentence on what it adds. Prefer reputable, original sources over aggregators. End with a one-line note on how this page compares to what you found.";

// ---------- Ask ----------

export const ASK_SYSTEM =
  "You help people understand the web page they are reading. Answer using the page content first; if you add outside knowledge, say so. Be concise and use Markdown.";

import { shell } from "electron";

const SITES = {
  web: { label: "the web", url: "https://www.google.com/search?q=" },
  youtube: { label: "YouTube", url: "https://www.youtube.com/results?search_query=" },
  scholar: { label: "Google Scholar", url: "https://scholar.google.com/scholar?q=" },
  wikipedia: { label: "Wikipedia", url: "https://en.wikipedia.org/w/index.php?search=" },
  images: { label: "images", url: "https://www.google.com/search?tbm=isch&q=" },
};

export default {
  name: "search",
  icon: "🔎",
  permission: "opening searches",
  description:
    "Open a page of search results in the user's browser, for them to browse themselves. " +
    "Only use this when they ask for search results (for example \"show me YouTube videos about…\"). " +
    "When they want a specific source, page or file, find it yourself with web search and open its exact link with open_website instead.",
  input_schema: {
    type: "object",
    properties: {
      site: { type: "string", enum: Object.keys(SITES), description: "Where to search" },
      query: { type: "string", description: "What to search for" },
    },
    required: ["site", "query"],
    additionalProperties: false,
  },

  describe: ({ site, query }) => `Search ${SITES[site]?.label ?? site} for “${query}”`,

  async run({ site, query }) {
    const target = SITES[site];
    if (!target) throw new Error(`Unknown search site "${site}".`);
    await shell.openExternal(target.url + encodeURIComponent(query));
    return `Opened a ${target.label} search for "${query}" in the browser.`;
  },
};

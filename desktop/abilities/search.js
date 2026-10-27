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
  description:
    "Open a search in the user's browser, for example to find videos on YouTube or papers on Google Scholar. " +
    "Only use this when they ask you to find or look something up for them to browse.",
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

import { shell } from "electron";

export default {
  name: "open_website",
  icon: "🌐",
  permission: "opening websites and links",
  description:
    "Open a web page or file link (such as a PDF) in the user's browser. Use the exact address of the page you found, " +
    "not a search results page. Only use this when they ask you to open something, or agree to it.",
  input_schema: {
    type: "object",
    properties: { url: { type: "string", description: "The full address, starting with https://" } },
    required: ["url"],
    additionalProperties: false,
  },

  describe: ({ url }) => `Open ${hostOf(url)} in your browser`,

  async run({ url }) {
    if (!/^https?:\/\//i.test(url)) throw new Error("Only http and https links can be opened.");
    await shell.openExternal(url);
    return `Opened ${url} in the browser.`;
  },
};

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

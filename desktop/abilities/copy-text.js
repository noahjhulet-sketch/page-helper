import { clipboard } from "electron";

export default {
  name: "copy_text",
  icon: "📋",
  permission: "copying text to your clipboard",
  description:
    "Copy text to the user's clipboard so they can paste it anywhere with Ctrl+V. " +
    "Use this when they ask you to copy something, or to get text ready to paste into another app.",
  input_schema: {
    type: "object",
    properties: { text: { type: "string", description: "The exact text to copy" } },
    required: ["text"],
    additionalProperties: false,
  },

  describe: ({ text }) => `Copy “${text.length > 40 ? `${text.slice(0, 40).trim()}…` : text}” to your clipboard`,

  run({ text }) {
    clipboard.writeText(text);
    return "Copied to the clipboard. The user can paste it with Ctrl+V.";
  },
};

import { APPS, launch } from "./_apps.js";

export default {
  name: "open_app",
  icon: "🗂️",
  description:
    "Open an app on the user's computer. Only use this when they ask you to open an app. " +
    "To open Notepad with text in it, use write_note instead.",
  input_schema: {
    type: "object",
    properties: { app: { type: "string", enum: Object.keys(APPS), description: "Which app to open" } },
    required: ["app"],
    additionalProperties: false,
  },

  describe: ({ app }) => `Open ${APPS[app]?.label ?? app}`,

  run({ app }) {
    return `Opened ${launch(app)}.`;
  },
};

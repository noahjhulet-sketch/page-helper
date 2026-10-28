import { openPanel } from "../app/panels.js";

export default {
  name: "play_game",
  icon: "🎮",
  askFirst: false, // it only opens a window in this app
  description:
    "Open Pop-Up Panic, a quick mini game (the buddy catches falling notes and dodges error pop-ups). " +
    "Use this when the user says they're bored, wants a break, or wants to play a game.",
  input_schema: { type: "object", properties: {}, additionalProperties: false },

  describe: () => "Open Pop-Up Panic",

  run() {
    openPanel("game");
    return "Opened the Pop-Up Panic game window.";
  },
};

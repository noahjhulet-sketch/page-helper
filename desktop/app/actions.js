// Loads the tools in desktop/actions/. Each file default-exports
// { id, label, icon, description, order, needsQuestion?, run }.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ACTIONS_DIR = path.join(import.meta.dirname, "..", "actions");

export async function loadActions() {
  const actions = [];
  for (const file of fs.readdirSync(ACTIONS_DIR)) {
    if (!file.endsWith(".js") || file.startsWith("_")) continue;
    try {
      const { default: action } = await import(pathToFileURL(path.join(ACTIONS_DIR, file)).href);
      if (!action?.id || !action.label || typeof action.run !== "function") throw new Error("missing id, label or run()");
      actions.push({ icon: "•", description: "", order: 99, ...action });
    } catch (err) {
      console.warn(`Skipping action "${file}": ${err.message}`);
    }
  }
  return actions.sort((a, b) => a.order - b.order);
}

// What the snip menu needs to show; the run() functions stay in the main process.
export function menuItems(actions) {
  return actions.map(({ id, label, icon, description, needsQuestion = false }) => ({ id, label, icon, description, needsQuestion }));
}

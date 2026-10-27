// Loads the things the buddy can do on the computer, from desktop/abilities/. Each
// file default-exports { name, icon, description, input_schema, describe(input), run(input) }.
// Claude can ask to use them in a chat; the person approves each use first.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ABILITIES_DIR = path.join(import.meta.dirname, "..", "abilities");

export async function loadAbilities() {
  const abilities = [];
  for (const file of fs.readdirSync(ABILITIES_DIR)) {
    if (!file.endsWith(".js") || file.startsWith("_")) continue;
    try {
      const { default: ability } = await import(pathToFileURL(path.join(ABILITIES_DIR, file)).href);
      if (!ability?.name || typeof ability.run !== "function" || typeof ability.describe !== "function") {
        throw new Error("missing name, describe() or run()");
      }
      abilities.push({ icon: "⚙️", ...ability });
    } catch (err) {
      console.warn(`Skipping ability "${file}": ${err.message}`);
    }
  }
  return abilities;
}

// The tool definitions sent to Claude.
export function toolDefinitions(abilities) {
  return abilities.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
}

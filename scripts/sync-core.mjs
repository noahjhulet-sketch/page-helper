// Copies core/ into extension/core/. Chrome only loads files inside the extension's
// own folder, so the extension gets a copy of the shared code instead of a link.
// Run after editing anything in core/:  npm run sync-core

import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const from = join(root, "core");
const to = join(root, "extension", "core");

rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });

// Mark each copy so nobody edits it by mistake.
for (const name of readdirSync(to)) {
  if (!name.endsWith(".js")) continue;
  const file = join(to, name);
  writeFileSync(file, `// COPY of core/${name} — edit core/${name} and run "npm run sync-core".\n\n` + readFileSync(file, "utf8"));
}
console.log(`Copied core/ into extension/core/`);

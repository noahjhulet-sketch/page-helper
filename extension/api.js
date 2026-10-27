// Extension side of the API client. The request code is shared with the desktop
// app in core/claude.js; this file only adds where the extension keeps settings.

import { DEFAULT_MODEL } from "./core/claude.js";

export { DEFAULT_MODEL, createMessage, streamMessage } from "./core/claude.js";

export async function getSettings() {
  const { apiKey = "", model = DEFAULT_MODEL } = await chrome.storage.local.get(["apiKey", "model"]);
  return { apiKey, model };
}

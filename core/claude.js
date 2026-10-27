// Calls the Claude Messages API with fetch. Shared by the Chrome extension and the
// desktop app; the extension has no build step, so this uses raw HTTP rather than
// the @anthropic-ai/sdk package. Callers pass settings ({ apiKey, model }) in, and
// each app decides where to store them.

const API_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_MODEL = "claude-opus-5-5";

function buildRequest({ apiKey, model }, body) {
  const headers = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2026-10-21",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  const payload = { model, ...body };

  // If a safety check declines a request, let the API re-run it on a fallback model.
  // Haiku has no server-side fallback, so skip it there.
  if (!model.startsWith("claude-haiku")) {
    headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
    payload.fallbacks = "default";
  }
  return { method: "POST", headers, body: JSON.stringify(payload) };
}

async function raiseForStatus(res) {
  if (res.ok) return;
  let message = `${res.status} ${res.statusText}`;
  try {
    const err = await res.json();
    if (err?.error?.message) message = err.error.message;
  } catch {}
  if (res.status === 401) message = "Your API key was rejected. Check it in Settings.";
  if (res.status === 429) message = "Rate limited by the API. Wait a moment and try again.";
  if (res.status === 529 || res.status >= 500) message = `The API is having trouble (${res.status}). Try again shortly.`;
  throw new Error(message);
}

function checkStop(stopReason) {
  if (stopReason === "refusal") throw new Error("Claude declined this request.");
}

// Non-streaming call. Returns the full message JSON.
export async function createMessage(settings, body) {
  if (!settings.apiKey) throw new Error("Add your Anthropic API key in Settings first.");
  const res = await fetch(API_URL, buildRequest(settings, body));
  await raiseForStatus(res);
  const msg = await res.json();
  checkStop(msg.stop_reason);
  return msg;
}

// Streaming call. Calls onText(fullTextSoFar) as text arrives and returns the final text.
export async function streamMessage(settings, body, onText, signal) {
  if (!settings.apiKey) throw new Error("Add your Anthropic API key in Settings first.");
  const res = await fetch(API_URL, { ...buildRequest(settings, { ...body, stream: true }), signal });
  await raiseForStatus(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let stopReason = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let split;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const event = JSON.parse(dataLine.slice(5));

      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        text += event.delta.text;
        onText(text);
      } else if (event.type === "message_delta") {
        stopReason = event.delta.stop_reason ?? stopReason;
      } else if (event.type === "error") {
        throw new Error(event.error?.message || "The stream ended with an error.");
      }
    }
  }
  checkStop(stopReason);
  if (stopReason === "max_tokens") text += "\n\n*(Response was cut off at the length limit.)*";
  return text;
}

// Calls the Claude API through the official Anthropic SDK. Runs in the app's main
// process only, so the API key never reaches a window. Callers pass settings
// ({ apiKey, model }) in.

import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-opus-5-5";

export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 — best quality (default)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — faster, cheaper" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 — fastest, cheapest" },
];

function client(apiKey) {
  if (!apiKey) throw new Error("Add your Anthropic API key in Settings first.");
  return new Anthropic({ apiKey });
}

// If a safety check declines a request, let the API re-run it on a fallback model.
// Haiku has no server-side fallback, so skip it there.
function withFallback(model, body) {
  if (model.startsWith("claude-haiku")) return { model, ...body };
  return { model, ...body, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

// Turns SDK errors into messages a person can act on. Cancellation passes through
// unchanged so callers can recognize it.
function friendlyError(err) {
  if (err instanceof Anthropic.APIUserAbortError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new Error("Your API key was rejected. Check it in Settings.");
  if (err instanceof Anthropic.PermissionDeniedError) return new Error("Your API key doesn't have access to this model.");
  if (err instanceof Anthropic.RateLimitError) return new Error("Rate limited by the API. Wait a moment and try again.");
  if (err instanceof Anthropic.InternalServerError) return new Error(`The API is having trouble (${err.status}). Try again shortly.`);
  if (err instanceof Anthropic.APIConnectionError) return new Error("Couldn't reach the API. Check your internet connection.");
  if (err instanceof Anthropic.APIError) return new Error(err.error?.error?.message || err.message);
  return err;
}

export function isCancelled(err) {
  return err instanceof Anthropic.APIUserAbortError;
}

function checkStop(message) {
  if (message.stop_reason === "refusal") throw new Error("Claude declined this request.");
}

export function textOf(message) {
  return message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

// Non-streaming call. Returns the full message.
export async function createMessage({ apiKey, model }, body, signal) {
  try {
    const message = await client(apiKey).beta.messages.create(withFallback(model, body), { signal });
    checkStop(message);
    return message;
  } catch (err) {
    throw friendlyError(err);
  }
}

// Streaming call. Calls onText(fullTextSoFar) as text arrives and returns the full
// message (use this when the reply may ask to use tools).
export async function streamFullMessage({ apiKey, model }, body, onText, signal) {
  try {
    const stream = client(apiKey).beta.messages.stream(withFallback(model, body), { signal });
    let text = "";
    stream.on("text", (delta) => onText((text += delta)));
    const message = await stream.finalMessage();
    checkStop(message);
    return message;
  } catch (err) {
    throw friendlyError(err);
  }
}

// Streaming call. Calls onText(fullTextSoFar) as text arrives and returns the final text.
export async function streamMessage(settings, body, onText, signal) {
  const message = await streamFullMessage(settings, body, onText, signal);
  // Read the final text from the message: if a fallback model took over
  // mid-answer, the streamed text includes the declined model's partial output.
  let final = textOf(message);
  if (message.stop_reason === "max_tokens") final += "\n\n*(Response was cut off at the length limit.)*";
  return final;
}

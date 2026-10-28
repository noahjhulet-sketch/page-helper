// Helpers shared by the action files. Files starting with "_" aren't loaded as tools.
//
// Every tool gets an `input`, one of:
//   { kind: "image", data, mediaType }         a screen snip, copied image or image file (base64)
//   { kind: "text", text, name? }              copied text, or a text file or note (with its name)
//   { kind: "document", data, mediaType, name } a PDF file (base64); chats only

// One sentence for the system prompt saying what the input is.
export function sourceNote(input) {
  return input.kind === "text"
    ? "The user copied the text inside <clipboard> tags. Work only from that text."
    : "The image is a region of the user's screen they selected, or an image they copied. Work only from what's visible. If text is too small or blurry to read, say so instead of guessing.";
}

// The input as a message content block.
export function sourceBlock(input) {
  if (input.kind === "document") {
    return { type: "document", source: { type: "base64", media_type: input.mediaType, data: input.data }, title: input.name };
  }
  if (input.kind === "text") {
    return input.name
      ? { type: "text", text: `<file name="${input.name.replace(/"/g, "'")}">\n${input.text}\n</file>` }
      : { type: "text", text: `<clipboard>\n${input.text}\n</clipboard>` };
  }
  return { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.data } };
}

// The user message content: the input, then the instruction.
export function userContent(input, instruction) {
  return [sourceBlock(input), { type: "text", text: instruction }];
}

// Helpers shared by the action files. Files starting with "_" aren't loaded as tools.

export const SCREEN_CONTEXT =
  "The image is a region of the user's screen that they selected. Work only from what's visible. If text is too small or blurry to read, say so instead of guessing.";

export function imageBlock(image) {
  return { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } };
}

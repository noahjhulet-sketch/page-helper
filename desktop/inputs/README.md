# Inputs

Where the buddy gets content from. Each source is one file and produces an `input` for the tools (the shape is described in `desktop/actions/_shared.js`):

| File | Source | Gives |
|---|---|---|
| `snip.js` | A box you drag on a frozen screenshot | `{ kind: "image", data, mediaType }` |
| `clipboard.js` | Whatever you last copied | an image, or `{ kind: "text", text }` |

A new source (a dropped file, say) means adding a file here and calling it from `desktop/app/main.js`.

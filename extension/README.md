# Page Helper

A Chrome extension that opens in a side panel next to any web page. It uses Claude to:

- **Summary**: summarize the page, or only the text you highlight. Choose brief, key points, detailed, or explain simply.
- **Blanks**: find empty fields and `____` gaps on the page, suggest an answer for each with an explanation, and (only when you click) fill them in.
- **Sources**: search the web for similar articles, primary/academic sources, other viewpoints, or fact-checks of the page's claims.
- **Ask**: chat about the page. Highlighted text is included with your question.

Right-click highlighted text and choose **Explain with Page Helper**, or right-click a page and choose **Summarize this page**.

## Install

1. In the project folder, run `npm run sync-core` once. This copies the shared code from `core/` into `extension/core/`.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this `extension` folder.
4. The settings page opens. Paste your Anthropic API key (from console.anthropic.com) and save.
5. Click the Page Helper icon in the toolbar (pin it from the puzzle-piece menu), or press **Alt+Shift+P**.

After you edit any file, click the reload icon on the extension's card in `chrome://extensions`. If you edited something in `core/`, run `npm run sync-core` first.

## Files

| File | What it does |
|---|---|
| `manifest.json` | Extension config and permissions |
| `background.js` | Opens the side panel, right-click menu items |
| `sidepanel.html/js` | The four tools |
| `page.js` | Code that runs inside the web page (reads text, finds and fills blanks) |
| `api.js` | Reads settings from Chrome storage; the API calls themselves are in `core/claude.js` |
| `options.html/js` | API key and model settings |
| `core/` | Copy of the shared code (API client, prompts, Markdown renderer). Don't edit it here: edit the top-level `core/` and run `npm run sync-core` |

## Notes

- API usage is billed to your Anthropic account. Opus 5.5 gives the best answers; switch to Sonnet 5.5 or Haiku 5.5 in settings to spend less.
- Chrome blocks extensions from reading `chrome://` pages and the Web Store.
- Your API key is stored in this browser's extension storage. Anyone with access to this Chrome profile could read it, so don't use it on a shared profile.

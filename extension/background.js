// Clicking the toolbar icon opens the side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  chrome.contextMenus.create({
    id: "page-helper-explain",
    title: "Explain with Page Helper",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "page-helper-summarize",
    title: "Summarize this page",
    contexts: ["page"],
  });

  // First install: send the user to the settings page to add an API key.
  if (reason === "install") chrome.runtime.openOptionsPage();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // sidePanel.open must run inside the user gesture, so call it before any await.
  const opening = chrome.sidePanel.open({ tabId: tab.id });

  const pending =
    info.menuItemId === "page-helper-explain"
      ? { mode: "ask", text: `Explain this: "${info.selectionText}"`, at: Date.now() }
      : { mode: "summary", at: Date.now() };

  // The panel picks this up on load, or through storage.onChanged if already open.
  await chrome.storage.session.set({ pending });
  await opening;
});

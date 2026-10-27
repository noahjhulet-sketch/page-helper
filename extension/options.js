import { getSettings } from "./api.js";

const keyInput = document.getElementById("api-key");
const modelSelect = document.getElementById("model");
const saved = document.getElementById("saved");

const { apiKey, model } = await getSettings();
keyInput.value = apiKey;
modelSelect.value = model;

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await chrome.storage.local.set({ apiKey: keyInput.value.trim(), model: modelSelect.value });
  saved.textContent = "Saved.";
  setTimeout(() => (saved.textContent = ""), 2000);
});

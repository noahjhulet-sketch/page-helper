// Chat bar page: type a question and press Enter to start a chat, or use the
// buttons to snip the screen or use the clipboard. Esc hides it.

const $ = (id) => document.getElementById(id);

$("bar").addEventListener("submit", (e) => {
  e.preventDefault();
  const question = $("question").value.trim();
  if (question) buddy.barAsk(question);
});
$("snip").addEventListener("click", () => buddy.barSnip());
$("clipboard").addEventListener("click", () => buddy.barClipboard());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") buddy.barClose();
});

buddy.onBarShown(() => {
  $("bar").classList.remove("appear");
  void $("bar").offsetWidth; // restart the animation
  $("bar").classList.add("appear");
});
buddy.onBarClear(() => ($("question").value = ""));
// Clicking into the bar, or "New chat" from the menu, puts the cursor in the box.
window.addEventListener("focus", () => $("question").focus());

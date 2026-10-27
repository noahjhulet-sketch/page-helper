// The apps the buddy may open. Only these, never an arbitrary program: Claude picks
// a name from this list and the app launches the matching fixed command.
// Apps after the built-in four are offered only if Windows says they're installed.

import { execFileSync, spawn } from "node:child_process";

const BUILT_IN = {
  notepad: { label: "Notepad", exe: "notepad.exe" },
  calculator: { label: "Calculator", exe: "calc.exe" },
  paint: { label: "Paint", exe: "mspaint.exe" },
  "file explorer": { label: "File Explorer", exe: "explorer.exe" },
};

// Found through Windows' "App Paths" list, launched with `start`.
const IF_INSTALLED = {
  word: { label: "Microsoft Word", exe: "winword.exe" },
  excel: { label: "Microsoft Excel", exe: "excel.exe" },
  powerpoint: { label: "Microsoft PowerPoint", exe: "powerpnt.exe" },
  onenote: { label: "OneNote", exe: "onenote.exe" },
  chrome: { label: "Google Chrome", exe: "chrome.exe" },
  edge: { label: "Microsoft Edge", exe: "msedge.exe" },
  firefox: { label: "Firefox", exe: "firefox.exe" },
  spotify: { label: "Spotify", exe: "spotify.exe" },
};

export const APPS = { ...BUILT_IN, ...installed() };

export function launch(name, args = []) {
  const app = APPS[name];
  if (!app) throw new Error(`"${name}" isn't one of the apps I can open.`);
  // `start "" app.exe` looks the app up in Windows' App Paths list. The command is
  // built only from the fixed names above, never from anything Claude wrote.
  const child = BUILT_IN[name]
    ? spawn(app.exe, args, { detached: true, stdio: "ignore" })
    : spawn("cmd.exe", ["/d", "/c", `start "" ${app.exe}`], { detached: true, stdio: "ignore", windowsHide: true, windowsVerbatimArguments: true });
  child.unref();
  return app.label;
}

function installed() {
  const registered = new Set();
  for (const hive of ["HKLM", "HKCU"]) {
    try {
      const out = execFileSync("reg", ["query", `${hive}\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths`], {
        encoding: "utf8",
        windowsHide: true,
      });
      for (const line of out.split(/\r?\n/)) registered.add(line.split("\\").pop().trim().toLowerCase());
    } catch {
      // That hive has no App Paths list; nothing to add.
    }
  }
  return Object.fromEntries(Object.entries(IF_INSTALLED).filter(([, app]) => registered.has(app.exe)));
}

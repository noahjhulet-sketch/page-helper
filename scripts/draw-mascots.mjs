// Draws the built-in mascots' state images (desktop/mascots/<id>/<state>.svg): the
// same body for every state, with a different face. Run after changing anything here:
//   node scripts/draw-mascots.mjs
// Custom art doesn't need this: drop your own images into a mascot folder instead.

import fs from "node:fs";
import path from "node:path";

const OUT = path.join(import.meta.dirname, "..", "desktop", "mascots");

// Each mascot: its body, where its eyes and mouth sit, and how its eyes are drawn.
// "pupils" eyes are white circles with dark pupils; "dots" eyes are small dark marks.
const MASCOTS = {
  quiet: {
    body: `<circle cx="50" cy="52" r="42" fill="#8FA3BF"/>
  <ellipse cx="36" cy="30" rx="13" ry="7" fill="#FFFFFF" opacity="0.25"/>`,
    eyes: "dots",
    eyeY: 54,
    eyeX: [38, 62],
    mouthY: 68,
    mouthWidth: 10,
    ink: "#2B3445",
    mouthFill: "#2B3445",
  },
  normal: {
    body: `<rect x="10" y="12" width="80" height="80" rx="22" fill="#7C5CFF"/>
  <rect x="18" y="18" width="30" height="12" rx="6" fill="#FFFFFF" opacity="0.2"/>`,
    eyes: "pupils",
    eyeY: 48,
    eyeX: [37, 63],
    eyeSize: 9,
    pupilSize: 4.5,
    mouthY: 66,
    mouthWidth: 16,
    ink: "#1F1640",
    mouthFill: "#1F1640",
  },
  playful: {
    body: `<path d="M50 8 L66.5 31.3 L93.7 39.8 L76.6 62.7 L77 91.2 L50 82 L23 91.2 L23.4 62.7 L6.3 39.8 L33.5 31.3 Z"
        fill="#FFB020" stroke="#FFB020" stroke-width="8" stroke-linejoin="round"/>
  <circle cx="31" cy="61" r="4" fill="#FF7A59" opacity="0.6"/>
  <circle cx="69" cy="61" r="4" fill="#FF7A59" opacity="0.6"/>`,
    eyes: "pupils",
    eyeY: 50,
    eyeX: [40, 60],
    eyeSize: 7.5,
    pupilSize: 4,
    mouthY: 62,
    mouthWidth: 14,
    ink: "#3A2200",
    mouthFill: "#5A2A00",
  },
};

// Each state's face: eyes, mouth, and any extras.
const FACES = {
  idle: { eyes: "open", mouth: "smile", blink: true },
  hover: { eyes: "happy", mouth: "grin" },
  listening: { eyes: "wide", mouth: "smile" },
  selecting: { eyes: "down", mouth: "flat" },
  thinking: { eyes: "up", mouth: "hmm" },
  talking: { eyes: "open", mouth: "talk", blink: true },
  error: { eyes: "open", mouth: "wavy", brows: "worried", sweat: true },
  sleeping: { eyes: "closed", mouth: "small" },
  dragged: { eyes: "wide", mouth: "o" },
};

// The quiet mascot's resting face is closed, content eyes rather than open ones.
const QUIET_OVERRIDES = { idle: { eyes: "content", mouth: "none" }, talking: { eyes: "content", mouth: "talk" } };

for (const [id, m] of Object.entries(MASCOTS)) {
  for (const [state, face] of Object.entries(FACES)) {
    const f = id === "quiet" ? { ...face, ...QUIET_OVERRIDES[state] } : face;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- ${id} mascot, ${state}. Drawn by scripts/draw-mascots.mjs -->
  ${m.body}
  ${eyes(m, f)}
  ${f.brows ? brows(m) : ""}
  ${mouth(m, f.mouth)}
  ${f.sweat ? `<path d="M84 26 q-5 8 0 11 q5 -3 0 -11 Z" fill="#7FD3FF" stroke="#4BA3D9" stroke-width="1"/>` : ""}
</svg>
`.replace(/\n\s*\n/g, "\n");
    fs.writeFileSync(path.join(OUT, id, `${state}.svg`), svg);
  }
}
console.log("Drew", Object.keys(MASCOTS).length * Object.keys(FACES).length, "mascot images.");

function eyes(m, { eyes: kind, blink }) {
  return m.eyeX.map((x) => eye(m, kind, x, m.eyeY, blink)).join("\n  ");
}

function eye(m, kind, x, y, blink) {
  const line = (d) => `<path d="${d}" stroke="${m.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (kind === "happy") return line(`M${x - 6} ${y + 3} q6 -8 12 0`); // ^
  if (kind === "content") return line(`M${x - 6} ${y} q6 6 12 0`); // ‿
  if (kind === "closed") return line(`M${x - 6} ${y + 1} q6 4 12 0`);

  // Where the pupil looks.
  const [dx, dy] = { up: [2, -3], down: [-2, 3] }[kind] ?? [1.5, 1.5];
  // A quick blink every few seconds: squash the eye shut and open it again.
  const blinkAnim = (ry) =>
    blink ? `<animate attributeName="ry" values="${ry};${ry};0.6;${ry}" keyTimes="0;0.93;0.96;1" dur="4.5s" repeatCount="indefinite"/>` : "";

  if (m.eyes === "dots") {
    if (kind === "wide") return `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${m.ink}" stroke-width="3"/>`;
    return `<ellipse cx="${x + dx}" cy="${y + dy}" rx="3.5" ry="3.5" fill="${m.ink}">${blinkAnim(3.5)}</ellipse>`;
  }
  const white = m.eyeSize + (kind === "wide" ? 2 : 0);
  const pupil = m.pupilSize - (kind === "wide" ? 1.5 : 0);
  const [px, py] = kind === "wide" ? [0, 0] : [dx, dy];
  return `<ellipse cx="${x}" cy="${y}" rx="${white}" ry="${white}" fill="#FFFFFF">${blinkAnim(white)}</ellipse>
  <ellipse cx="${x + px}" cy="${y + py}" rx="${pupil}" ry="${pupil}" fill="${m.ink}">${blinkAnim(pupil)}</ellipse>`;
}

// Worried brows: inner ends raised.
function brows(m) {
  const y = m.eyeY - (m.eyeSize ?? 4) - 6;
  const [l, r] = m.eyeX;
  return `<path d="M${l - 7} ${y + 2} L${l + 6} ${y - 2} M${r + 7} ${y + 2} L${r - 6} ${y - 2}" stroke="${m.ink}" stroke-width="3" stroke-linecap="round"/>`;
}

function mouth(m, kind) {
  const x = 50;
  const y = m.mouthY;
  const w = m.mouthWidth;
  const stroke = `stroke="${m.ink}" stroke-width="4" fill="none" stroke-linecap="round"`;
  switch (kind) {
    case "smile":
      return `<path d="M${x - w / 2} ${y} q${w / 2} ${w * 0.45} ${w} 0" ${stroke}/>`;
    case "grin":
      return `<path d="M${x - w / 2 - 1} ${y - 1} q${w / 2 + 1} ${w * 0.8} ${w + 2} 0 Z" fill="${m.mouthFill}" stroke="${m.mouthFill}" stroke-width="2" stroke-linejoin="round"/>`;
    case "flat":
      return `<path d="M${x - w / 3} ${y + 2} h${(w * 2) / 3}" ${stroke}/>`;
    case "hmm": // a little off to one side, like he's pondering
      return `<path d="M${x - 1} ${y + 2} q${w / 4} -2 ${w / 2} 0" ${stroke}/>`;
    case "wavy":
      return `<path d="M${x - w / 2} ${y + 3} q${w / 4} -4 ${w / 2} 0 q${w / 4} 4 ${w / 2} 0" ${stroke}/>`;
    case "o":
      return `<ellipse cx="${x}" cy="${y + 3}" rx="${w / 5}" ry="${w / 4}" fill="${m.mouthFill}"/>`;
    case "small":
      return `<ellipse cx="${x}" cy="${y + 3}" rx="${w / 8}" ry="${w / 10}" fill="${m.mouthFill}"/>`;
    case "talk": // opens and closes as he talks
      return `<ellipse cx="${x}" cy="${y + 3}" rx="${w / 4}" ry="${w / 6}" fill="${m.mouthFill}">
    <animate attributeName="ry" values="${w / 12};${w / 4};${w / 10};${w / 5};${w / 12}" dur="0.7s" repeatCount="indefinite"/>
  </ellipse>`;
    default:
      return "";
  }
}

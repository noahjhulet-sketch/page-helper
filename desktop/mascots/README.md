# Mascots

Each folder here is one mascot. The app finds new folders automatically (restart it after adding one).

```
my-mascot/
├── mascot.json
├── idle.svg        ← required
├── thinking.png    ← optional: any state below
└── …
```

## mascot.json

```json
{
  "name": "Normal",
  "description": "A short line before each answer. Sways gently.",
  "chattiness": "normal",
  "motion": "gentle",
  "size": 72,
  "order": 2
}
```

| Field | Meaning |
|---|---|
| `name`, `description` | Shown in Settings and the tray menu |
| `chattiness` | `quiet`, `normal` or `playful`: how much the buddy says (used from Phase 4) |
| `motion` | Idle animation: `calm` (slow breathing), `gentle` (sway) or `bouncy` |
| `size` | Width and height on screen, in pixels (up to about 100) |
| `order` | Position in lists, lowest first |

## The built-in mascots

Their faces are drawn by `scripts/draw-mascots.mjs`: one body per mascot and a different face per state. To tweak a face, edit that script and run `node scripts/draw-mascots.mjs`. Your own mascots don't need it: just add image files.

The "…" thought bubble (thinking) and the floating Zzz (sleeping) are added by the app on top of any mascot, so custom art gets them too.

## State images

Name each image after its state: `.svg`, `.png`, `.gif` or `.webp`. Any missing state uses `idle`, so you can draw them one at a time. Square images with transparent backgrounds work best.

| State | When |
|---|---|
| `idle` | Doing nothing |
| `hover` | Pointer is over it |
| `listening` | Hotkey pressed or clicked |
| `selecting` | You're dragging a box on screen (Phase 2) |
| `thinking` | Waiting for Claude |
| `talking` | Showing an answer |
| `error` | Something went wrong |
| `sleeping` | Idle for a long time (Phase 4) |
| `dragged` | Being moved |

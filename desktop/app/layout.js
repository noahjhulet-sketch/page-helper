// Picks where a new window goes so it doesn't cover the app's other windows: the
// free spot nearest to where it would ideally open. If the screen is too full for
// any free spot, the one that covers the least.

import { BrowserWindow, screen } from "electron";

const GAP = 10;

// `size`: { width, height }. `prefer`: { x, y } where it would ideally go.
// `minSize`: if given, the window may open smaller (down to this) to find a free
// spot. Returns { x, y, width, height }.
export function findSpot(size, prefer, minSize = null) {
  const steps = minSize ? [1, 0.9, 0.8, 0.7, 0.6, 0.5] : [1];
  let best = null;
  for (const scale of steps) {
    const tried = {
      width: Math.round(Math.max(minSize?.width ?? 0, size.width * scale)),
      height: Math.round(Math.max(minSize?.height ?? 0, size.height * scale)),
    };
    const spot = { ...bestSpot(tried, prefer), ...tried };
    if (spot.overlap === 0) return strip(spot);
    best ??= spot; // nothing free at any size: full size, covering the least
  }
  return strip(best);
}

const strip = ({ x, y, width, height }) => ({ x, y, width, height });

function bestSpot(size, prefer) {
  const { workArea: area } = screen.getDisplayNearestPoint({ x: prefer.x + size.width / 2, y: prefer.y + size.height / 2 });
  const taken = occupied(area);
  const fit = (x, y) => ({
    x: Math.round(Math.min(Math.max(area.x, x), area.x + area.width - size.width)),
    y: Math.round(Math.min(Math.max(area.y, y), area.y + area.height - size.height)),
  });

  // Candidates: the preferred spot, then beside each window already open, then the
  // screen's corners and middle.
  const candidates = [fit(prefer.x, prefer.y)];
  for (const r of taken) {
    candidates.push(
      fit(r.x + r.width + GAP, r.y), // right of it
      fit(r.x - size.width - GAP, r.y), // left of it
      fit(r.x, r.y + r.height + GAP), // below it
      fit(r.x, r.y - size.height - GAP), // above it
      fit(r.x + r.width + GAP, prefer.y),
      fit(r.x - size.width - GAP, prefer.y),
    );
  }
  const right = area.x + area.width - size.width;
  const bottom = area.y + area.height - size.height;
  candidates.push(
    fit(right - GAP, area.y + GAP),
    fit(right - GAP, bottom - GAP),
    fit(area.x + GAP, bottom - GAP),
    fit(area.x + (area.width - size.width) / 2, area.y + (area.height - size.height) / 2),
  );

  // Covering the buddy counts far more than covering anything else.
  const overlap = (c) => taken.reduce((sum, r) => sum + overlapArea({ ...c, ...size }, grow(r, GAP / 2)) * (r.keepClear ? 20 : 1), 0);
  const distance = (c) => Math.hypot(c.x - prefer.x, c.y - prefer.y);
  // Least overlap first (ideally none), then closest to where it wanted to be.
  const best = candidates.sort((a, b) => overlap(a) - overlap(b) || distance(a) - distance(b))[0];
  return { ...best, overlap: overlap(best) };
}

// The bounds of the app's visible windows on this screen, except full-screen ones
// (the snip overlay). Windows marked with keepClear() are flagged.
function occupied(area) {
  return BrowserWindow.getAllWindows()
    .filter((w) => !w.isDestroyed() && w.isVisible())
    .map((w) => ({ ...w.getBounds(), keepClear: clear.has(w) }))
    .filter((r) => r.width < area.width && overlapArea(r, area) > 0);
}

const clear = new WeakSet();

// New windows try hard not to cover this one (the buddy).
export function keepClear(win) {
  clear.add(win);
}

function overlapArea(a, b) {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

const grow = (r, by) => ({ x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 });

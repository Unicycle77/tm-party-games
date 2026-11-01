import { LINE, type Stroke } from "./strokes";

/**
 * Measuring a drawing from its strokes (the median duck's size, the second longest snake's length). Everything works on a
 * small bitmap of the strokes, so it's the same on every screen:
 *
 * 1. **Ink**: each stroke stamped as a round marker line, a little fatter than drawn so a hairline gap in an outline closes.
 * 2. **Silhouette**: the ink plus everything it encloses (an outline counts as filled in; colouring in changes nothing).
 * 3. **Shapes**: the silhouette's separate pieces. Only the biggest duck shape, or the longest snake shape, counts.
 * 4. **Snake length**: the shape thinned to its centre line, the longest path along it, smoothed so pixel steps aren't
 *    over-counted. **Width**: twice the distance from the centre line to the edge.
 *
 * No DOM: it runs anywhere (the host phone, the TV, a test).
 */

/** Surface units per bitmap pixel. A page or a roll is 1000 units across, so 200 pixels. */
const UNIT = 5;
/** How much fatter than drawn the ink is stamped, in surface units on each side: closes small gaps in an outline. */
const GROW = 4;
/** Pieces smaller than this many pixels are specks (a dot, a slip), not shapes. */
const SPECK = 24;

export interface Mask { w: number; h: number; data: Uint8Array }

/** The ink of `strokes` in the box `x0..x1` × `y0..y1` (surface units), one byte per pixel. */
export function inkOf(strokes: Stroke[], x0: number, y0: number, x1: number, y1: number): Mask {
  const w = Math.max(1, Math.ceil((x1 - x0) / UNIT)), h = Math.max(1, Math.ceil((y1 - y0) / UNIT));
  const data = new Uint8Array(w * h);
  const r = (LINE / 2 + GROW) / UNIT;
  const r2 = r * r;
  const stamp = (cx: number, cy: number) => {
    const xa = Math.max(0, Math.floor(cx - r)), xb = Math.min(w - 1, Math.ceil(cx + r));
    const ya = Math.max(0, Math.floor(cy - r)), yb = Math.min(h - 1, Math.ceil(cy + r));
    for (let y = ya; y <= yb; y++) {
      const dy = y + 0.5 - cy;
      for (let x = xa; x <= xb; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2) data[y * w + x] = 1;
      }
    }
  };
  for (const s of strokes) {
    let px = (s.p[0]! - x0) / UNIT, py = (s.p[1]! - y0) / UNIT;
    stamp(px, py);
    for (let i = 2; i < s.p.length; i += 2) {
      const qx = (s.p[i]! - x0) / UNIT, qy = (s.p[i + 1]! - y0) / UNIT;
      const steps = Math.ceil(Math.hypot(qx - px, qy - py) / 0.5);
      for (let k = 1; k <= steps; k++) stamp(px + ((qx - px) * k) / steps, py + ((qy - py) * k) / steps);
      px = qx; py = qy;
    }
  }
  return { w, h, data };
}

/** The ink and everything it encloses: what the outside can't reach from the edges. */
export function silhouetteOf(ink: Mask): Mask {
  const { w, h, data } = ink;
  const outside = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (i: number) => { if (!data[i] && !outside[i]) { outside[i] = 1; queue[tail++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < (h - 1) * w) push(i + w);
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = outside[i] ? 0 : 1;
  return { w, h, data: out };
}

/** The silhouette's separate pieces (touching corners join), biggest first, specks left out. Each is its pixels' indices. */
export function piecesOf(m: Mask): Int32Array[] {
  const { w, h, data } = m;
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const pieces: Int32Array[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!data[start] || seen[start]) continue;
    let head = 0, tail = 0;
    seen[start] = 1; queue[tail++] = start;
    while (head < tail) {
      const i = queue[head++]!;
      const x = i % w, y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (data[j] && !seen[j]) { seen[j] = 1; queue[tail++] = j; }
      }
    }
    if (tail >= SPECK) pieces.push(queue.slice(0, tail));
  }
  return pieces.sort((a, b) => b.length - a.length);
}

/** One piece on its own bitmap, the size of the whole. */
export function maskOfPiece(m: Mask, piece: Int32Array): Mask {
  const data = new Uint8Array(m.w * m.h);
  for (const i of piece) data[i] = 1;
  return { w: m.w, h: m.h, data };
}

// ---- the duck ----

export interface DuckSize {
  /** The biggest shape's silhouette, in square inches, to the whole square inch. 0 for a blank page. */
  sqIn: number;
  /** How many shapes are on the page (only the biggest counts). */
  shapes: number;
  /** The biggest shape's silhouette, for the TV's gold wash; `UNIT` units per pixel from the page's corner. */
  mask?: Mask;
}

/** A duck's size: the area of the biggest shape's silhouette, on a `w` × `h` page `unitsPerInch` to the inch. */
export function measureDuck(strokes: Stroke[], w: number, h: number, unitsPerInch: number): DuckSize {
  if (!strokes.length) return { sqIn: 0, shapes: 0 };
  const sil = silhouetteOf(inkOf(strokes, 0, 0, w, h));
  const pieces = piecesOf(sil);
  if (!pieces.length) return { sqIn: 0, shapes: 0 };
  const px = UNIT / unitsPerInch;
  return { sqIn: Math.round(pieces[0]!.length * px * px), shapes: pieces.length, mask: maskOfPiece(sil, pieces[0]!) };
}

// ---- the snake ----

/** Zhang–Suen thinning: the shape worn down to a centre line one pixel wide. */
function thin(m: Mask): Uint8Array {
  const { w, h } = m;
  const img = m.data.slice();
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]!);
  let changed = true;
  const del: number[] = [];
  // Only pixels on the shape's edge can go, so keep a list of what's left to look at.
  let live: number[] = [];
  for (let i = 0; i < w * h; i++) if (img[i]) live.push(i);
  while (changed) {
    changed = false;
    for (const pass of [0, 1]) {
      del.length = 0;
      for (const i of live) {
        if (!img[i]) continue;
        const x = i % w, y = (i - x) / w;
        const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
        const p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let a = 0;
        for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) a++;
        if (a !== 1) continue;
        if (pass === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
        del.push(i);
      }
      for (const i of del) img[i] = 0;
      if (del.length) changed = true;
    }
    live = live.filter((i) => img[i]);
  }
  return img;
}

/** Distance from each pixel of the shape to the nearest pixel outside it, in pixels (chamfer, close to true distance). */
function distanceIn(m: Mask): Float32Array {
  const { w, h, data } = m;
  const d = new Float32Array(w * h);
  const BIG = 1e9, D = Math.SQRT2;
  for (let i = 0; i < w * h; i++) d[i] = data[i] ? BIG : 0;
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]!);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i]!, get(x - 1, y) + 1, get(x, y - 1) + 1, get(x - 1, y - 1) + D, get(x + 1, y - 1) + D);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i]!, get(x + 1, y) + 1, get(x, y + 1) + 1, get(x + 1, y + 1) + D, get(x - 1, y + 1) + D);
  }
  return d;
}

/** The farthest point from `from` along the centre line (steps of 1, diagonals √2), and the way back to it. */
function farthest(skel: Uint8Array, w: number, h: number, from: number): { end: number; back: Int32Array } {
  const dist = new Float64Array(w * h).fill(Infinity);
  const back = new Int32Array(w * h).fill(-1);
  // A simple bucketed Dijkstra is overkill for a few thousand pixels: a plain queue with re-visits is fine here.
  const queue: number[] = [from];
  dist[from] = 0;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!;
    const x = i % w, y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (!skel[j]) continue;
      const nd = dist[i]! + (dx && dy ? Math.SQRT2 : 1);
      if (nd < dist[j]! - 1e-9) { dist[j] = nd; back[j] = i; queue.push(j); }
    }
  }
  let end = from;
  for (let i = 0; i < w * h; i++) if (skel[i] && dist[i]! < Infinity && dist[i]! > dist[end]!) end = i;
  return { end, back };
}

/** The pixels along the longest path of a centre line, end to end. */
function longestPath(skel: Uint8Array, w: number, h: number): number[] {
  let start = -1;
  for (let i = 0; i < w * h; i++) if (skel[i]) { start = i; break; }
  if (start < 0) return [];
  const a = farthest(skel, w, h, start).end;
  const { end: b, back } = farthest(skel, w, h, a);
  const path: number[] = [];
  for (let i = b; i !== -1; i = back[i]!) path.push(i);
  return path;
}

/** A path's length in pixels, measured through every few pixels so a staircase of pixel steps reads as the line it is. */
function smoothLength(path: number[], w: number): number {
  if (path.length < 2) return 0;
  const STEP = 4;
  const pt = (i: number) => [path[i]! % w, Math.floor(path[i]! / w)] as const;
  let len = 0;
  let [px, py] = pt(0);
  for (let k = STEP; k < path.length + STEP - 1; k += STEP) {
    const [x, y] = pt(Math.min(k, path.length - 1));
    len += Math.hypot(x - px, y - py);
    px = x; py = y;
  }
  return len;
}

export interface SnakeLength {
  /** Along the centre line of the longest shape, to the nearest half inch. */
  inches: number;
  /** The whole sheets that shape touches. */
  sheets: number;
  /** How many shapes are on the roll (only the longest counts). */
  shapes: number;
  /** Spots under the minimum width, where the TV's ring goes: centre in roll units (x across, y along the roll). */
  thin: { x: number; y: number; r: number }[];
  /** Under the minimum width nearly all along: a line, not an outline. */
  thinAll: boolean;
}

/**
 * A snake's length on a roll `w` units wide, `unitsPerInch` to the inch, sheets every `sheet` units, counting only the paper
 * from `from` on (what was torn off doesn't count). `minWidth` is the narrowest the rules allow, in units.
 */
export function measureSnake(strokes: Stroke[], opts: { w: number; unitsPerInch: number; sheet: number; from: number; minWidth: number }): SnakeLength {
  const { w: W, unitsPerInch, sheet, from, minWidth } = opts;
  const none: SnakeLength = { inches: 0, sheets: 0, shapes: 0, thin: [], thinAll: false };
  // Only the kept paper: a stroke cut by the tear keeps its part on the kept side.
  const kept = clipFrom(strokes, from);
  if (!kept.length) return none;
  // The tear edge closes an outline it cut through, as the paper's edge would: crossings joined in pairs along the tear.
  if (from > 0) {
    const cuts = kept.flatMap((s) => [0, s.p.length - 2].filter((i) => s.p[i + 1] === from).map((i) => s.p[i]!)).sort((a, b) => a - b);
    for (let i = 0; i + 1 < cuts.length; i += 2) kept.push({ c: 0, p: [cuts[i]!, from, cuts[i + 1]!, from] });
  }
  let top = Infinity, bottom = -Infinity;
  for (const s of kept) for (let i = 1; i < s.p.length; i += 2) { top = Math.min(top, s.p[i]!); bottom = Math.max(bottom, s.p[i]!); }
  const pad = LINE + GROW * 2 + UNIT * 2;
  const y0 = Math.max(from, top - pad), y1 = bottom + pad;
  const sil = silhouetteOf(inkOf(kept, -pad, y0, W + pad, y1));
  const pieces = piecesOf(sil);
  if (!pieces.length) return none;
  const x0 = -pad;
  let best: { len: number; path: number[]; piece: Int32Array; mask: Mask } | undefined;
  // Only the few biggest pieces can be the longest: a snake is big. Keeps a roll of doodles quick.
  for (const piece of pieces.slice(0, 4)) {
    const mask = maskOfPiece(sil, piece);
    const path = longestPath(thin(mask), sil.w, sil.h);
    const len = smoothLength(path, sil.w);
    if (!best || len > best.len) best = { len, path, piece, mask };
  }
  const { path, piece, mask } = best!;
  // The centre line stops short of the tips by about the body's half width there: add it back at both ends.
  const dist = distanceIn(mask);
  const len = best!.len + (path.length ? dist[path[0]!]! + dist[path[path.length - 1]!]! : 0);
  const toIn = UNIT / unitsPerInch;
  const touched = new Set<number>();
  for (const i of piece) touched.add(Math.floor((y0 + (Math.floor(i / sil.w) + 0.5) * UNIT) / sheet));

  // Width along the centre line, leaving out half an inch at each end (a head and a tail taper to a point).
  const skip = unitsPerInch / 2 / UNIT;
  const thinAt: boolean[] = [];
  let along = 0, thinCount = 0, counted = 0;
  for (let k = 0; k < path.length; k++) {
    if (k) {
      const a = path[k - 1]!, b = path[k]!;
      along += Math.hypot((a % sil.w) - (b % sil.w), Math.floor(a / sil.w) - Math.floor(b / sil.w));
    }
    const inner = along >= skip && len - along >= skip;
    const width = 2 * dist[path[k]!]! * UNIT - 2 * GROW;
    const isThin = inner && width < minWidth;
    thinAt.push(isThin);
    if (inner) { counted++; if (isThin) thinCount++; }
  }
  const thinSpots: SnakeLength["thin"] = [];
  for (let k = 0; k < path.length; k++) {
    if (!thinAt[k]) continue;
    let e = k;
    while (e + 1 < path.length && (thinAt[e + 1] || thinAt[Math.min(path.length - 1, e + 4)])) e++;
    const mid = path[Math.floor((k + e) / 2)]!;
    const span = Math.max(e - k, 4) * UNIT;
    thinSpots.push({ x: x0 + ((mid % sil.w) + 0.5) * UNIT, y: y0 + (Math.floor(mid / sil.w) + 0.5) * UNIT, r: Math.min(400, span / 2 + 60) });
    k = e;
  }
  const thinAll = counted > 0 && thinCount / counted > 0.8;
  return {
    inches: Math.round(len * toIn * 2) / 2,
    sheets: touched.size,
    shapes: pieces.length,
    thin: thinAll ? [] : thinSpots,
    thinAll,
  };
}

/** The strokes on the paper from `from` on (y ≥ from): a stroke crossing the line is cut where it crosses. */
export function clipFrom(strokes: Stroke[], from: number): Stroke[] {
  if (from <= 0) return strokes;
  const out: Stroke[] = [];
  for (const s of strokes) {
    let cur: number[] = [];
    const flush = () => { if (cur.length >= 2) out.push({ c: s.c, p: cur }); cur = []; };
    for (let i = 0; i < s.p.length; i += 2) {
      const x = s.p[i]!, y = s.p[i + 1]!;
      if (y >= from) {
        if (!cur.length && i > 0 && s.p[i - 1]! < from) {
          const px = s.p[i - 2]!, py = s.p[i - 1]!;
          cur.push(px + ((x - px) * (from - py)) / (y - py), from);
        }
        cur.push(x, y);
      } else {
        if (cur.length) {
          const px = s.p[i - 2]!, py = s.p[i - 1]!;
          cur.push(px + ((x - px) * (from - py)) / (y - py), from);
        }
        flush();
      }
    }
    flush();
  }
  return out;
}

/** The strokes before `to` (y < to): the torn-off piece's. */
export function clipBefore(strokes: Stroke[], to: number): Stroke[] {
  return clipFrom(strokes.map((s) => ({ c: s.c, p: s.p.map((v, i) => (i % 2 ? -v : v)) })), -to)
    .map((s) => ({ c: s.c, p: s.p.map((v, i) => (i % 2 ? -v : v)) }));
}

// Sample portraits for the Flipchart shots: a face drawn once across the whole 4 x 4 chart, then cut into the 16 pages the way a
// guest's pen would have, the four pages printed upside down drawn upside down.
import { encodePage, type Stroke } from "../../src/drawing/strokes";
import { PATTERN, UPSIDE_DOWN } from "../../src/games/flipchart/strokes";
import { SHEET_H, SHEET_W } from "../../src/drawing/surfaces/Sheet";

type Pt = [number, number];
const W = 4 * SHEET_W, H = 4 * SHEET_H;

const ellipse = (cx: number, cy: number, rx: number, ry: number, from = 0, to = Math.PI * 2): Pt[] => {
  const n = Math.ceil(((to - from) * Math.max(rx, ry)) / 25);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / n;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as Pt;
  });
};
const line = (...pts: Pt[]): Pt[] => pts.flatMap((p, i) => {
  const q = pts[i + 1];
  if (!q) return [p];
  const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 25));
  return Array.from({ length: n }, (_, k) => [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n] as Pt);
});

/** One face, a little different for each `variant` (head width, mood, tie, hair). Marker colours: 0 black, 1 red, 2 blue, 3 green. */
function face(variant: number): { c: number; pts: Pt[] }[] {
  const wide = 1150 + (variant % 3) * 90;
  const smile = [0.55, 0.3, 0.7, 0.4, 0.6, 0.2][variant % 6]!;
  const tie = [2, 1, 3, 1, 2, 3][variant % 6]!;
  const cx = W / 2;
  const shapes: { c: number; pts: Pt[] }[] = [
    { c: 0, pts: ellipse(cx, 2350, wide, 1650) },
    { c: 0, pts: line([cx - wide - 5, 2300], [cx - wide - 190, 2250], [cx - wide - 190, 2700], [cx - wide + 20, 2800]) },
    { c: 0, pts: line([cx + wide + 5, 2300], [cx + wide + 190, 2250], [cx + wide + 190, 2700], [cx + wide - 20, 2800]) },
    { c: 0, pts: ellipse(cx - 480, 2150, 230, 120) }, { c: 0, pts: ellipse(cx + 480, 2150, 230, 120) },
    { c: tie === 3 ? 3 : 2, pts: ellipse(cx - 480, 2150, 70, 70) }, { c: tie === 3 ? 3 : 2, pts: ellipse(cx + 480, 2150, 70, 70) },
    { c: 0, pts: line([cx - 760, 1850], [cx - 480, 1760], [cx - 200, 1840]) }, { c: 0, pts: line([cx + 200, 1840], [cx + 480, 1760], [cx + 760, 1850]) },
    { c: 0, pts: line([cx, 2200], [cx - 90, 2650], [cx - 230, 2780], [cx + 40, 2830]) },
    { c: 1, pts: [...ellipse(cx, 3050 - 140 * smile, 520, 150 + 260 * smile, 0.15, Math.PI - 0.15)] },
    { c: 0, pts: line([cx - 380, 3820], [cx - 380, 4300], [cx - 1500, 4700], [cx - 2000, 5656]) },
    { c: 0, pts: line([cx + 380, 3820], [cx + 380, 4300], [cx + 1500, 4700], [cx + 2000, 5656]) },
    { c: tie, pts: line([cx - 150, 4300], [cx + 150, 4300], [cx + 260, 5100], [cx, 5400], [cx - 260, 5100], [cx - 150, 4300]) },
    ...(variant % 2 ? [{ c: 0, pts: line([cx - 150, 720], [cx - 250, 420]) }, { c: 0, pts: line([cx, 700], [cx + 20, 380]) }, { c: 0, pts: line([cx + 160, 720], [cx + 280, 430]) }] : []),
  ];
  // a few lines of shading across the cheeks, in the pen's colour
  for (let i = 0; i < 4; i++) shapes.push({ c: 0, pts: line([cx - wide + 300 + i * 40, 2900 + i * 90], [cx - wide + 520 + i * 40, 3000 + i * 90]) });
  return shapes;
}

/**
 * How the guest read the front page, as at a real party: "pattern" followed it and drew the four upside-down pages upside down (a
 * clean face); "upright" followed it but drew every page upright, so those four land upside down; "reading" took the pages to run
 * in reading order (1 to 4 across the top), "columns" took them to run down each column, and "backwards" started at 16 in the top
 * left: each of those lands scrambled in its own way.
 */
export type Reading = "pattern" | "upright" | "reading" | "columns" | "backwards";

/** The page a guest drawing at this spot of their imagined chart is on. */
const pageAt = (col: number, row: number, how: Reading) =>
  how === "reading" ? row * 4 + col + 1 : how === "columns" ? col * 4 + row + 1 : how === "backwards" ? 16 - (row * 4 + col) : PATTERN[row]![col]!;

/** Where a point is on its page, as a pen on that page would draw it: clamped to the page, and turned for the pages printed upside down if the guest turned them. */
const onPage = (x: number, y: number, col: number, row: number, how: Reading): number[] => {
  const lx = Math.round(Math.min(SHEET_W, Math.max(0, x - col * SHEET_W))), ly = Math.round(Math.min(SHEET_H, Math.max(0, y - row * SHEET_H)));
  return how === "pattern" && UPSIDE_DOWN.has(PATTERN[row]![col]!) ? [SHEET_W - lx, SHEET_H - ly] : [lx, ly];
};
const cellOf = (x: number, y: number): [number, number] => [Math.min(3, Math.max(0, Math.floor(x / SHEET_W))), Math.min(3, Math.max(0, Math.floor(y / SHEET_H)))];

/** The 16 pages, `p1`…`p16`, as the strokes a guest's phone would have saved. */
export function portraitPages(variant: number, how: Reading = "pattern"): Record<string, string> {
  const pages: Stroke[][] = Array.from({ length: 16 }, () => []);
  for (const { c, pts } of face(variant)) {
    let run: { page: number; p: number[] } | undefined;
    let prev: Pt | undefined;
    for (const [x, y] of pts) {
      const [col, row] = cellOf(x, y);
      const page = pageAt(col, row, how);
      let carried: Pt | undefined;
      if (run && run.page !== page) {
        // the pen runs off one page and onto the next: each keeps its own end of the line
        const [pc, pr] = cellOf(prev![0], prev![1]);
        run.p.push(...onPage(x, y, pc, pr, how));
        run = undefined;
        carried = prev;
      }
      if (!run) {
        run = { page, p: [] };
        pages[page - 1]!.push({ c, p: run.p });
        if (carried) run.p.push(...onPage(carried[0], carried[1], col, row, how));
      }
      run.p.push(...onPage(x, y, col, row, how));
      prev = [x, y];
    }
  }
  return Object.fromEntries(pages.map((strokes, i) => [`p${i + 1}`, encodePage(strokes.filter((s) => s.p.length >= 4))]).filter(([, v]) => v));
}

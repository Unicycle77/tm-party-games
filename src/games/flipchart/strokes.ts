import type { Session } from "../../types";

/**
 * A Flipchart portrait is 16 pages of strokes, drawn on A1-shaped pages (1 : 1.414) and laid out in the pattern the show
 * printed on the flipchart's front page. Everything that shows a portrait (the guest's page, the big screen, the party
 * download) draws it from the strokes, so there is no picture to keep.
 */
export const PAGE_W = 1000;
export const PAGE_H = 1414;
/** The pattern on the front page, row by row: which page goes where. */
export const PATTERN: readonly (readonly number[])[] = [[12, 2, 6, 5], [14, 7, 16, 13], [4, 11, 1, 15], [10, 9, 8, 3]];
/** The pages printed upside down on the front page, so turned half way round when the portrait is put together. */
export const UPSIDE_DOWN: ReadonlySet<number> = new Set([3, 9, 10, 16]);
export const PAGES = 16;
/** The portrait's shape: four pages across, four down. */
export const PORTRAIT_RATIO = (4 * PAGE_W) / (4 * PAGE_H);

/** The markers, like a flipchart's set. */
export const MARKERS = [
  { name: "Black", colour: "#1b1b1b" },
  { name: "Red", colour: "#b3261e" },
  { name: "Blue", colour: "#1f4fa8" },
  { name: "Green", colour: "#2e7d32" },
] as const;
export const LINE = 9;
export const PAPER = "#fbfaf6";
const EDGE = "#e4e0d6";

/** One stroke of a marker: its colour (an index into `MARKERS`) and its points, x then y, in page units. One point is a dot. */
export interface Stroke { c: number; p: number[] }

/** The least a finger moves before another point is kept, in page units: keeps a page's strokes small without showing. */
export const MIN_STEP = 3;

export const encodePage = (strokes: Stroke[]): string => strokes.map((s) => `${s.c}:${s.p.join(",")}`).join("|");

export function decodePage(text: string | undefined): Stroke[] {
  if (!text) return [];
  const out: Stroke[] = [];
  for (const part of text.split("|")) {
    const [c, pts] = part.split(":");
    const p = (pts ?? "").split(",").map(Number).filter((n) => Number.isFinite(n));
    if (p.length >= 2 && Number(c) >= 0 && Number(c) < MARKERS.length) out.push({ c: Number(c), p: p.length % 2 ? p.slice(0, -1) : p });
  }
  return out;
}

export const pageKey = (n: number) => `p${n}`;

/** A guest's 16 pages (page 1 first), decoded from the session. */
export function pagesOf(session: Session, uid: string): Stroke[][] {
  const pages = session.games?.flipchart?.pages?.[uid];
  return Array.from({ length: PAGES }, (_, i) => decodePage(pages?.[pageKey(i + 1)]));
}

export const isBlank = (page: Stroke[]) => page.length === 0;

/** Draws a page's strokes with the top-left corner of the page at the context's origin, at `scale` pixels per page unit. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], scale: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = LINE * scale;
  for (const s of strokes) {
    ctx.strokeStyle = ctx.fillStyle = MARKERS[s.c]!.colour;
    if (s.p.length === 2) {
      ctx.beginPath();
      ctx.arc(s.p[0]! * scale, s.p[1]! * scale, (LINE * scale) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(s.p[0]! * scale, s.p[1]! * scale);
    for (let i = 2; i < s.p.length; i += 2) ctx.lineTo(s.p[i]! * scale, s.p[i + 1]! * scale);
    ctx.stroke();
  }
}

/** The assembled portrait as a PNG: the pages in the pattern, the upside-down ones turned half way round. */
export async function renderPortrait(pages: Stroke[][], scale = 0.5): Promise<Blob> {
  const w = PAGE_W * scale, h = PAGE_H * scale;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(4 * w);
  canvas.height = Math.round(4 * h);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  PATTERN.forEach((row, r) => row.forEach((n, c) => {
    ctx.save();
    ctx.translate(c * w + w / 2, r * h + h / 2);
    if (UPSIDE_DOWN.has(n)) ctx.rotate(Math.PI);
    ctx.translate(-w / 2, -h / 2);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    drawStrokes(ctx, pages[n - 1] ?? [], scale);
    ctx.restore();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1;
    ctx.strokeRect(c * w + 0.5, r * h + 0.5, w - 1, h - 1);
  }));
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the portrait."))), "image/png"));
}

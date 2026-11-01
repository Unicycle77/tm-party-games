import type { Session } from "../../types";
import { MARKERS } from "../../drawing/palettes";
import { decodePage, drawStrokes, type Stroke } from "../../drawing/strokes";
import { SHEET_H, SHEET_W } from "../../drawing/surfaces/Sheet";

/**
 * A Flipchart portrait is 16 pages of strokes, drawn on A1-shaped pages (1 : 1.414) and laid out in the pattern the show
 * printed on the flipchart's front page. Everything that shows a portrait (the guest's page, the big screen, the party
 * download) draws it from the strokes, so there is no picture to keep.
 */
/** The pattern on the front page, row by row: which page goes where. */
export const PATTERN: readonly (readonly number[])[] = [[12, 2, 6, 5], [14, 7, 16, 13], [4, 11, 1, 15], [10, 9, 8, 3]];
/** The pages printed upside down on the front page, so turned half way round when the portrait is put together. */
export const UPSIDE_DOWN: ReadonlySet<number> = new Set([3, 9, 10, 16]);
export const PAGES = 16;
/** The portrait's shape: four pages across, four down. */
export const PORTRAIT_RATIO = (4 * SHEET_W) / (4 * SHEET_H);

export const PAPER = "#fbfaf6";
const EDGE = "#e4e0d6";

export const pageKey = (n: number) => `p${n}`;

/** A guest's 16 pages (page 1 first), decoded from the session. */
export function pagesOf(session: Session, uid: string): Stroke[][] {
  const pages = session.games?.flipchart?.pages?.[uid];
  return Array.from({ length: PAGES }, (_, i) => decodePage(pages?.[pageKey(i + 1)], MARKERS.length));
}

export const isBlank = (page: Stroke[]) => page.length === 0;

/** The assembled portrait as a PNG: the pages in the pattern, the upside-down ones turned half way round. */
export async function renderPortrait(pages: Stroke[][], scale = 0.5): Promise<Blob> {
  const w = SHEET_W * scale, h = SHEET_H * scale;
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
    drawStrokes(ctx, pages[n - 1] ?? [], scale, MARKERS);
    ctx.restore();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1;
    ctx.strokeRect(c * w + 0.5, r * h + 0.5, w - 1, h - 1);
  }));
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the portrait."))), "image/png"));
}

/**
 * The drawing core every drawn task shares (Flipchart, Acetate, the toilet roll, paper): strokes, how they're saved, and
 * drawing them back. A surface (a flipchart page, an acetate, a roll) only decides its look, its shape and its input rules.
 * A stroke stores an index into the task's palette (see palettes.ts), so the core never owns the colours.
 */

/** One stroke of a marker: its colour (an index into the task's palette) and its points, x then y, in the surface's units. One point is a dot. */
export interface Stroke { c: number; p: number[] }

/** One marker in a task's set. */
export interface Ink { name: string; colour: string }
export type Palette = readonly Ink[];

/** The marker's line width, in surface units (a page is 1000 across). */
export const LINE = 9;

/** The least a finger moves before another point is kept, in surface units: keeps strokes small without showing. */
export const MIN_STEP = 3;

export const encodePage = (strokes: Stroke[]): string => strokes.map((s) => `${s.c}:${s.p.join(",")}`).join("|");

/** A saved page back to strokes. A stroke whose colour isn't in the palette (`inks` long) is dropped. */
export function decodePage(text: string | undefined, inks: number): Stroke[] {
  if (!text) return [];
  const out: Stroke[] = [];
  for (const part of text.split("|")) {
    const [c, pts] = part.split(":");
    const p = (pts ?? "").split(",").map(Number).filter((n) => Number.isFinite(n));
    if (p.length >= 2 && Number(c) >= 0 && Number(c) < inks) out.push({ c: Number(c), p: p.length % 2 ? p.slice(0, -1) : p });
  }
  return out;
}

/** Draws strokes with the surface's origin at the context's origin, at `scale` pixels per surface unit. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], scale: number, palette: Palette) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = LINE * scale;
  for (const s of strokes) {
    ctx.strokeStyle = ctx.fillStyle = palette[s.c]?.colour ?? "#000";
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

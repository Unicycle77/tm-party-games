import { PAGE_H, PAGE_W, drawStrokes, type Stroke } from "../flipchart/strokes";

/** A guest's acetate as a PNG for the party download: as the room saw it on the projector (turned half way round), on plain white. */
export async function renderAcetate(strokes: Stroke[], scale = 1): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAGE_W * scale);
  canvas.height = Math.round(PAGE_H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width, canvas.height);
  ctx.rotate(Math.PI);
  drawStrokes(ctx, strokes, scale);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the acetate."))), "image/png"));
}

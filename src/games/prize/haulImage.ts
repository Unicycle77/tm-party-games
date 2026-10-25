import curtains from "../../assets/curtains.webp";
import frame from "../../assets/frame.png";
import { load, placard } from "../../scoreboard/scoreboardImage";

/*
 * The prize haul for the download-all zip, redrawn on a canvas from the Haul component's CSS (`.stage.haul` in
 * styles.css) as a 1920 by 1080 big screen shows it, every prize hung: the lit curtain, "Prize Haul" across the
 * top, the winner's whole headshot in the big centre frame with "Priya is the winner!", and each prize's ★ photo
 * in the columns either side, filled from the centre outwards, with its "from Sam" placard. Keep it in step with
 * Haul when that changes.
 */

const W = 1920, H = 1080;
const VW = W / 100, VH = H / 100, VMIN = Math.min(VW, VH);
const clamp = (lo: number, v: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** The gold frame as `.haul-frame` draws it: frame.png sliced 100px in, `round`ed along each edge at `bw` wide, around a dark mat. */
function drawFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, bw: number) {
  const iw = img.naturalWidth, ih = img.naturalHeight, s = 100;
  const k = bw / s;
  ctx.fillStyle = "#1a0f08";
  ctx.fillRect(x + bw, y + bw, w - 2 * bw, h - 2 * bw);
  // corners
  for (const [sx, sy, dx, dy] of [[0, 0, x, y], [iw - s, 0, x + w - bw, y], [0, ih - s, x, y + h - bw], [iw - s, ih - s, x + w - bw, y + h - bw]] as const)
    ctx.drawImage(img, sx, sy, s, s, dx, dy, bw, bw);
  // edges, each tile scaled so a whole number of them fits
  const edge = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, len: number, across: boolean) => {
    const tile = (across ? sw : sh) * k;
    const n = Math.max(1, Math.round(len / tile)), step = len / n;
    for (let i = 0; i < n; i++) {
      if (across) ctx.drawImage(img, sx, sy, sw, sh, dx + i * step, dy, step, bw);
      else ctx.drawImage(img, sx, sy, sw, sh, dx, dy + i * step, bw, step);
    }
  };
  edge(s, 0, iw - 2 * s, s, x + bw, y, w - 2 * bw, true);
  edge(s, ih - s, iw - 2 * s, s, x + bw, y + h - bw, w - 2 * bw, true);
  edge(0, s, s, ih - 2 * s, x, y + bw, h - 2 * bw, false);
  edge(iw - s, s, s, ih - 2 * s, x + w - bw, y + bw, h - 2 * bw, false);
}

/** A photo at its own size, shrunk to fit within `maxW` by `maxH` (never enlarged, like `width: auto; max-width`). */
function fit(img: HTMLImageElement, maxW: number, maxH: number) {
  const k = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
  return { w: img.naturalWidth * k, h: img.naturalHeight * k };
}

/** The haul as a PNG. `prizes` in the scoreboard's order, as HaulStage passes them to Haul. */
export async function renderHaul(winner: string, headshot: string | undefined, prizes: { from: string; photo: string }[]): Promise<Blob> {
  const [curtain, frameImg] = await Promise.all([load(curtains), load(frame)]);
  const head = headshot ? await load(headshot).catch(() => undefined) : undefined;
  const photos = await Promise.all(prizes.map((p) => load(p.photo)));
  await document.fonts.load('97px "Typewriter"');

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // body:has(.stage)::before: the curtain, centre / cover, lit, with a vignette
  const k = Math.max(W / curtain!.naturalWidth, H / curtain!.naturalHeight);
  ctx.drawImage(curtain!, (W - curtain!.naturalWidth * k) / 2, (H - curtain!.naturalHeight * k) / 2, curtain!.naturalWidth * k, curtain!.naturalHeight * k);
  const tint = ctx.createLinearGradient(0, 0, 0, H);
  tint.addColorStop(0, "rgba(20, 0, 0, 0.1)");
  tint.addColorStop(1, "rgba(20, 0, 0, 0.25)");
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  // radial-gradient(ellipse at center, …): an ellipse reaching the corners
  ctx.translate(W / 2, H / 2);
  ctx.scale((W / 2) * Math.SQRT2, (H / 2) * Math.SQRT2);
  const vignette = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  vignette.addColorStop(0.45, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  // The grid: --side columns of prizes each side of a 1.5fr centre column, under an auto row for the title.
  const side = Math.max(1, Math.ceil(prizes.length / 4));
  const pad = { top: 3 * VH, x: 4 * VW, bottom: 5 * VH }, gapX = 2.5 * VW, gapY = 2 * VH;
  const titleSize = clamp(40, 9 * VMIN, 112);
  const titleH = titleSize * 1.4 + 8; // line-height 1.4, margin-bottom 0.5rem
  const fr = (W - 2 * pad.x - 2 * side * gapX) / (2 * side + 1.5);
  const colX = (c: number) => pad.x + (c - 1) * (fr + gapX) + (c > side + 1 ? 0.5 * fr : 0); // c from 1
  const colW = (c: number) => (c === side + 1 ? 1.5 * fr : fr);
  const rowH = (H - pad.top - pad.bottom - titleH - 2 * gapY) / 2;
  const rowY = (r: number) => pad.top + titleH + gapY + (r - 2) * (rowH + gapY); // r from 2

  ctx.save();
  ctx.font = `${titleSize}px "Typewriter", sans-serif`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.04 * titleSize}px`;
  ctx.fillStyle = "#f3d37a"; // --gold-bright
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.47)";
  ctx.shadowOffsetY = 2;
  ctx.fillText("Prize Haul", W / 2, pad.top + (titleSize * 1.4) / 2);
  ctx.restore();

  // A figure centred in its grid area: the framed photo, then 1.2vh down, its placard.
  const hang = (img: HTMLImageElement | undefined, text: string, area: { x: number; y: number; w: number; h: number }, bw: number, maxW: number, maxH: number, size: number, padY: number, padX: number) => {
    const { w, h } = img ? fit(img, maxW, maxH) : { w: 0, h: 0 };
    const fw = w + 2 * bw, fh = h + 2 * bw;
    const capH = size * 1.4 + 2 * padY + 4;
    const total = fh + 1.2 * VH + capH;
    const x = area.x + (area.w - fw) / 2, y = area.y + (area.h - total) / 2;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowOffsetY = 12;
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#1a0f08";
    ctx.fillRect(x + bw, y + bw, fw - 2 * bw, fh - 2 * bw);
    ctx.restore();
    drawFrame(ctx, frameImg!, x, y, fw, fh, bw);
    if (img) ctx.drawImage(img, x + bw, y + bw, w, h);
    placard(ctx, text, area.x + area.w / 2, y + fh + 1.2 * VH, size, padY, padX);
  };

  const big = clamp(18, 4 * VMIN, 56), small = clamp(12, 2.4 * VMIN, 32);
  const c = side + 1;
  hang(head, `${winner} is the winner!`, { x: colX(c), y: rowY(2), w: colW(c), h: 2 * rowH + gapY }, big,
    (88 * VW * 1.5) / (2 * side + 1.5) - 2 * big - 2.5 * VW, 52 * VH, clamp(19.2, 3.4 * VMIN, 41.6), 4.8, 22.4);
  prizes.forEach((p, i) => {
    const ring = Math.floor(i / 4), j = i % 4;
    const col = j % 2 === 0 ? side - ring : side + 2 + ring, row = Math.floor(j / 2) + 2;
    hang(photos[i], `from ${p.from}`, { x: colX(col), y: rowY(row), w: colW(col), h: rowH }, small,
      (88 * VW) / (2 * side + 1.5) - 2 * small, 23 * VH, clamp(14.4, 2 * VMIN, 24), 3.2, 14.4);
  });

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the prize haul."))), "image/png"));
}

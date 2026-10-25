import background from "../assets/background.jpg";
import frame from "../assets/frame.png";
import blank from "../assets/scoreboard/blank.jpg";
import seal from "../assets/scoreboard/seal.png";
import type { HeadshotCrop, Scoreboard } from "../types";
import { shownTotals } from "./scoring";

/*
 * The scoreboard for the download-all zip, redrawn on a canvas from ScoreboardStage's own measurements
 * (scoreboard.css): the frames, seals and background as the room last saw them, at the scoreboard's own size
 * (280px a contestant by 1080px) whatever screen does the downloading. Settled, as after the slide; every face
 * sharp, mosaic or not; and when a tie at the top was settled by the tiebreaker, only its winner is enlarged,
 * on the right, with a paper "Tiebreaker" placard under the seal (the prize haul's). Keep it in step with
 * ScoreboardStage when that changes.
 */

const SLOT = 275, LEFT = 30, WIDTH = 205;
const FRAME_H = 250, GAP = 25, INSET = 33;
const ROW_H = 413;

const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("Couldn't load a headshot for the scoreboard."));
  img.src = src;
});

/** The sway's angle at the moment the stage starts, for the contestant `n`th in the list (its animation-delay). */
function sway(n: number) {
  const t = (((n + 1) * 1.25) % 6) / 3; // 3s each way, alternating
  const p = t <= 1 ? t : 2 - t;
  const eased = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
  return ((-4 + 8 * eased) * Math.PI) / 180;
}

/** The headshot in the frame's window, cropped as on the big screen (cropFill): the crop, or centred to cover. */
function drawFace(ctx: CanvasRenderingContext2D, img: HTMLImageElement, crop: HeadshotCrop | undefined, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  let sx: number, sy: number, sw: number, sh: number;
  if (crop) [sx, sy, sw, sh] = [crop.x * iw, crop.y * ih, crop.w * iw, crop.h * ih];
  else {
    const k = Math.max(w / iw, h / ih);
    [sw, sh] = [w / k, h / k];
    [sx, sy] = [(iw - sw) / 2, (ih - sh) / 2];
  }
  ctx.fillStyle = "white";
  ctx.fillRect(x, y, w, h);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** One framed headshot, unrotated, on its own canvas: the face, the window's inset shadow, then the frame. */
function framed(face: HTMLImageElement, crop: HeadshotCrop | undefined, frameImg: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = WIDTH;
  c.height = FRAME_H;
  const ctx = c.getContext("2d")!;
  const w = WIDTH - 2 * INSET, h = FRAME_H - 2 * INSET;
  drawFace(ctx, face, crop, INSET, INSET, w, h);
  // box-shadow: inset -5px 5px 7px rgba(0, 0, 0, 0.5)
  ctx.save();
  ctx.beginPath();
  ctx.rect(INSET, INSET, w, h);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(INSET - 50, INSET - 50, w + 100, h + 100);
  ctx.rect(INSET, INSET, w, h);
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowOffsetX = -5;
  ctx.shadowOffsetY = 5;
  ctx.shadowBlur = 7;
  ctx.fillStyle = "black";
  ctx.fill("evenodd");
  ctx.restore();
  ctx.drawImage(frameImg, 0, 0, WIDTH, (WIDTH * frameImg.naturalHeight) / frameImg.naturalWidth);
  return c;
}

/** The scoreboard as a PNG: the totals of the host's last update, settled, with the tiebreaker's winner marked. */
export async function renderScoreboard(board: Scoreboard | undefined): Promise<Blob> {
  const contestants = Object.entries(board?.contestants ?? {}).sort(([, a], [, b]) => a.order - b.order);
  const totals = shownTotals(board);
  const ids = contestants.map(([id]) => id);
  const top = Math.max(...ids.map((id) => totals[id] ?? 0));
  const leaders = ids.filter((id) => (totals[id] ?? 0) === top);
  const settled = leaders.length > 1 && board?.tiebreaker?.winner && leaders.includes(board.tiebreaker.winner) ? board.tiebreaker.winner : undefined;
  // Lowest first, ties in the list's order as on the big screen; the tiebreaker's winner last of the leaders.
  const order = [...ids].sort((a, b) => (totals[a] ?? 0) - (totals[b] ?? 0) || +(a === settled) - +(b === settled));
  const scale = (id: string) => settled ? (id === settled ? 1.2 : 1) : (totals[id] ?? 0) === top ? (leaders.length > 2 ? 1.1 : 1.2) : 1;

  const [bg, frameImg, sealImg, blankImg] = await Promise.all([background, frame, seal, blank].map(load));
  const faces = await Promise.all(contestants.map(([, c]) => (c.photo ? load(c.photo) : Promise.resolve(blankImg!))));
  await document.fonts.load('84px "Typewriter"');

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(280 * ids.length, 280);
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;
  // background: center / cover
  const k = Math.max(canvas.width / bg!.naturalWidth, canvas.height / bg!.naturalHeight);
  ctx.drawImage(bg!, (canvas.width - bg!.naturalWidth * k) / 2, (canvas.height - bg!.naturalHeight * k) / 2, bg!.naturalWidth * k, bg!.naturalHeight * k);

  const rowTop = (canvas.height - ROW_H) / 2;
  const sealH = (WIDTH * sealImg!.naturalHeight) / sealImg!.naturalWidth;
  // The original adds the last contestant first, so each one overlaps the next to its left.
  for (let n = contestants.length - 1; n >= 0; n--) {
    const [id, c] = contestants[n]!;
    const x = LEFT + SLOT * order.indexOf(id), y = rowTop;

    ctx.save();
    // .sb-frame-scaler: scaled about the frame's bottom centre; then the sway about the frame's centre
    ctx.translate(x + WIDTH / 2, y + FRAME_H);
    ctx.scale(scale(id), scale(id));
    ctx.translate(0, -FRAME_H / 2);
    ctx.rotate(sway(n));
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowOffsetX = 15 * scale(id);
    ctx.shadowOffsetY = 15 * scale(id);
    ctx.shadowBlur = 3;
    ctx.drawImage(framed(faces[n]!, c.photo ? c.crop : undefined, frameImg!), -WIDTH / 2, -FRAME_H / 2);
    ctx.restore();

    const sy = y + FRAME_H + GAP;
    ctx.drawImage(sealImg!, x, sy, WIDTH, sealH);
    ctx.save();
    ctx.font = '84px "Typewriter", sans-serif';
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 3;
    ctx.fillText(String(totals[id] ?? 0), x + WIDTH / 2 + 8, sy + 90);
    ctx.restore();

    if (id === settled) placard(ctx, "Tiebreaker", x + WIDTH / 2, sy + sealH + 14);
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the scoreboard."))), "image/png"));
}

/** The prize haul's paper placard (`.haul figcaption`), centred on `cx` with its top at `y`. */
function placard(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number) {
  ctx.save();
  ctx.font = '26px "Typewriter", sans-serif';
  const w = ctx.measureText(text).width + 52, h = 46;
  ctx.shadowColor = "rgba(0, 0, 0, 0.67)";
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#efe6d2"; // --paper
  ctx.fillRect(cx - w / 2, y, w, h);
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#8a6a1f"; // --gold-dark
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - w / 2 + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = "#2b1d12"; // --ink
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, y + h / 2 + 1);
  ctx.restore();
}

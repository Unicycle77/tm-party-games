import type { CSSProperties } from "react";
import type { HeadshotCrop } from "../types";

/** The scoreboard's window inside its gold frame (frame.png at 250px tall, less 33px of frame each side). */
export const WINDOW = 140 / 184;

/** The crop the scoreboard has always used: the biggest window that fits, centred. `ratio` is the photo's width over its height. */
export function centred(ratio: number): HeadshotCrop {
  const w = Math.min(1, WINDOW / ratio);
  const h = heightOf(w, ratio);
  return { x: (1 - w) / 2, y: (1 - h) / 2, w };
}

/** The crop's height, as a share of the photo's: it keeps the window's shape. */
export function heightOf(w: number, ratio: number) {
  return (w * ratio) / WINDOW;
}

/** Keeps a crop inside the photo, at most as big as fits. */
export function clamp(c: HeadshotCrop, ratio: number): HeadshotCrop {
  const w = Math.min(c.w, centred(ratio).w);
  const h = heightOf(w, ratio);
  return { x: Math.min(Math.max(c.x, 0), 1 - w), y: Math.min(Math.max(c.y, 0), 1 - h), w };
}

/** A box in the window's shape filled with the cropped part of the photo, as a background (no crop: centred, as before). */
export function cropFill(photo: string, crop: HeadshotCrop | undefined, ratio: number | undefined): CSSProperties {
  if (!crop || !ratio) return { backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center" };
  const h = heightOf(crop.w, ratio);
  const at = (p: number, size: number) => (size >= 1 ? 0 : (p / (1 - size)) * 100);
  return {
    backgroundImage: `url(${photo})`,
    backgroundSize: `${100 / crop.w}% ${100 / h}%`,
    backgroundPosition: `${at(crop.x, crop.w)}% ${at(crop.y, h)}%`,
  };
}

import { useEffect, useRef } from "react";
import type { HeadshotCrop } from "../types";
import { centred } from "./crop";

/**
 * A headshot as a mosaic, `cols` by `rows` blocks of the cropped part of the photo (centred if no crop), each the
 * average colour of what it covers. Drawn on a canvas the browser blows up without smoothing, so the blocks stay sharp.
 * The photo itself is never changed.
 */
export function Mosaic({ photo, crop, cols, rows }: { photo: string; crop: HeadshotCrop | undefined; cols: number; rows: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cropKey = crop ? `${crop.x},${crop.y},${crop.w},${crop.h}` : "";
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const out = canvas.current;
      if (!out) return;
      const k = crop ?? centred(img.naturalWidth / img.naturalHeight);
      let src: CanvasImageSource = img;
      let x = k.x * img.naturalWidth, y = k.y * img.naturalHeight, w = k.w * img.naturalWidth, h = k.h * img.naturalHeight;
      // Halve in steps, so every pixel of the crop counts toward its block's colour, not just the few one big step samples.
      while (w / 2 > cols && h / 2 > rows) {
        const half = document.createElement("canvas");
        half.width = Math.round(w / 2); half.height = Math.round(h / 2);
        half.getContext("2d")!.drawImage(src, x, y, w, h, 0, 0, half.width, half.height);
        src = half; x = 0; y = 0; w = half.width; h = half.height;
      }
      out.width = cols; out.height = rows;
      const ctx = out.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, x, y, w, h, 0, 0, cols, rows);
    };
    img.src = photo;
    return () => { img.onload = null; };
  }, [photo, cropKey, cols, rows]);
  return <canvas ref={canvas} className="sb-mosaic" />;
}

import type { SVGProps } from "react";
import { LINE, type Palette, type Stroke } from "./strokes";

/**
 * Strokes as SVG marks, to go inside an `<svg>` (or a `<g>` with its own transform): a polyline per stroke, a dot for a
 * single point. Every surface draws its strokes back with this, on the phone, the TV and in sketches.
 */
export function StrokeMarks({ strokes, draft, palette, width = LINE }: { strokes: Stroke[]; draft?: Stroke; palette: Palette; width?: number }) {
  return (
    <g fill="none" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {(draft ? [...strokes, draft] : strokes).map((s, i) => s.p.length === 2
        ? <circle key={i} cx={s.p[0]} cy={s.p[1]} r={width / 2} fill={palette[s.c]?.colour} stroke="none" />
        : <polyline key={i} points={s.p.join(" ")} stroke={palette[s.c]?.colour} />)}
    </g>
  );
}

/**
 * A whole page of strokes as one SVG, `w` × `h` surface units, filling whatever box it's in (which has the page's shape).
 * `width`: the marker's line, in surface units (the fruit selfie's nose-drawn lines are thicker than a marker's).
 */
export function StrokesSvg({ w, h, strokes, draft, palette, width, ...rest }: { w: number; h: number; strokes: Stroke[]; draft?: Stroke; palette: Palette; width?: number } & Omit<SVGProps<SVGSVGElement>, "viewBox">) {
  return (
    <svg className="fc-svg" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" {...rest}>
      <StrokeMarks strokes={strokes} draft={draft} palette={palette} width={width} />
    </svg>
  );
}

import { useId } from "react";
import { MARKERS } from "../../drawing/palettes";
import type { Stroke } from "../../drawing/strokes";
import { StrokeMarks } from "../../drawing/StrokesSvg";
import { ROLL_W, SHEET } from "./data";

/**
 * The toilet roll, seen from the front: a fat white cylinder the same width as its paper, both ends round, the left end
 * showing its rings and the cardboard core. 300 × 138; the paper hangs from its bottom edge, from the centre of one end to
 * the centre of the other (7.333% in from each side). `empty`: every sheet is off, so only the brown cardboard tube is left.
 */
export function RollSvg({ hint, empty = false, className = "tp-roll", ...rest }: { hint?: boolean; empty?: boolean; className?: string } & React.HTMLAttributes<SVGSVGElement>) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="0 0 300 138" {...rest}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          {empty
            ? <><stop offset="0" stopColor="#c9a777" /><stop offset=".35" stopColor="#b48c5a" /><stop offset=".75" stopColor="#97703f" /><stop offset="1" stopColor="#7a5630" /></>
            : <><stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor="#f7f5ef" /><stop offset=".7" stopColor="#e6e2d8" /><stop offset="1" stopColor="#c9c4b6" /></>}
        </linearGradient>
        <radialGradient id={`${id}r`}><stop offset="0" stopColor="#fbfaf6" /><stop offset="1" stopColor="#ece8de" /></radialGradient>
      </defs>
      {empty ? (
        <>
          {/* the bare tube: the core's size, on the same axis, its open end dark inside */}
          <path d="M22 42 H278 A8.5 27 0 0 1 278 96 H22 Z" fill={`url(#${id}b)`} />
          <ellipse cx="22" cy="69" rx="8.5" ry="27" fill="#a8865a" />
          <ellipse cx="22" cy="69" rx="6" ry="21" fill="#5e3a18" />
        </>
      ) : (
        <>
          <path d="M22 0 H278 A22 69 0 0 1 278 138 H22 Z" fill={`url(#${id}b)`} />
          <ellipse cx="22" cy="69" rx="22" ry="69" fill={`url(#${id}r)`} stroke="#0002" strokeWidth=".8" />
          <g fill="none" stroke="#e2ddd1" strokeWidth=".6">
            <ellipse cx="22" cy="69" rx="19" ry="60" /><ellipse cx="22" cy="69" rx="16" ry="51" /><ellipse cx="22" cy="69" rx="13" ry="42" /><ellipse cx="22" cy="69" rx="10.5" ry="34" />
          </g>
          <ellipse cx="22" cy="69" rx="8.5" ry="27" fill="#a8865a" />
          <ellipse cx="22" cy="69" rx="6" ry="21" fill="#5e3a18" />
          {hint && <text x="155" y="74" textAnchor="middle" fontFamily="Typewriter, Courier New, monospace" fontSize="11" fill="#8b7a63" letterSpacing=".5">↓ pull · ↑ roll up</text>}
        </>
      )}
    </svg>
  );
}

/** The tear's ragged line: small teeth across the roll, the same for every roll, so a torn piece fits back where it came from. */
function teeth(): number[] {
  const out: number[] = [];
  for (let x = 0, i = 0; x <= ROLL_W; x += 25, i++) {
    const r = Math.sin(i * 12.9898) * 43758.5453;
    out.push(x, 6 + (r - Math.floor(r)) * 16);
  }
  return out;
}
const TEETH = teeth();

/**
 * Toilet paper, hanging: the paper from `top` (along the roll, at the top of the view) down to `bottom` (nearer the free
 * end), `height` units of view. Paper coordinates count from the free end, so the view shows y' = top − y. The perforations
 * are rows of short dashes. `torn`: the paper ends at `bottom` in a ragged tear ("below": this is the piece left on the roll;
 * "above": this is the torn-off piece, whose top is the tear).
 */
export function PaperStrip({ strokes, top, bottom, height, torn, draft, marks, className = "tp-strip" }: {
  strokes: Stroke[]; top: number; bottom: number; height: number; torn?: "below" | "above"; draft?: Stroke;
  /** Drawn on top, in paper coordinates (the TV's red rings). */
  marks?: React.ReactNode;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const len = top - bottom;
  // The paper's outline in view coordinates: a straight top, and a ragged or straight end.
  let outline: string;
  if (torn === "below") outline = `M0 0 H${ROLL_W} V${len} ` + TEETH.slice().reverse().reduce((d, _, i, a) => (i % 2 ? d : d + `L${a[i + 1]} ${len - a[i]!} `), "") + "Z";
  else if (torn === "above") outline = TEETH.reduce((d, v, i, a) => (i % 2 ? d : d + `${i ? "L" : "M"}${v} ${-a[i + 1]! + 22} `), "") + `V${len} H0 Z`;
  else outline = `M0 0 H${ROLL_W} V${len} H0 Z`;
  const perfs: number[] = [];
  for (let k = Math.ceil(bottom / SHEET); k * SHEET <= top; k++) if (k * SHEET > bottom + 1 && k * SHEET < top - 1) perfs.push(top - k * SHEET);
  return (
    <svg className={className} viewBox={`0 0 ${ROLL_W} ${height}`} preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs>
        <pattern id={`${id}d`} width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="2.8" fill="#0000000d" /></pattern>
        <clipPath id={`${id}c`}><path d={outline} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width={ROLL_W} height={len} fill="#fdfcf8" />
        <rect width={ROLL_W} height={len} fill={`url(#${id}d)`} />
        {perfs.map((y) => (
          <g key={y} fill="#0003">{Array.from({ length: 34 }, (_, i) => <rect key={i} x={6 + i * 30} y={y - 4} width="16" height="8" />)}</g>
        ))}
        <g transform={`matrix(1 0 0 -1 0 ${top})`}>
          <StrokeMarks strokes={strokes} draft={draft} palette={MARKERS} />
          {marks}
        </g>
      </g>
      <path d={outline} fill="none" stroke="#0002" strokeWidth="3" />
    </svg>
  );
}

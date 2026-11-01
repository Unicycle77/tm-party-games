import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { clipBefore, clipFrom } from "../measure";
import type { Palette, Stroke } from "../strokes";
import { StrokeMarks } from "../StrokesSvg";
import { usePen } from "../usePen";

/**
 * The toilet roll: a strip of toilet paper hanging from a roll at the top of the card. Its look (the cylinder, the quilted
 * paper, dashed perforations, a ragged tear that fits back together), its size (4 inches across, sheets 4.4 inches long,
 * 200 of them), its input rule (swipe the roll to unroll, a flick spins it out, rolling back only moves while the finger
 * drags; the paper itself only ever takes ink), where it would tear right now, and the tear itself. The game decides when,
 * and whether, it tears (`tearing`) and when to show the ✂ (`scissors`); it places the marker row and anything else.
 *
 * Roll units: 1000 across; along the paper they count from the free end, so a roll `out` units unrolled shows y' = out − y.
 */

/** The roll is 1000 units across, about 4 inches. */
export const ROLL_W = 1000;
/** Roll units to the inch, for measuring a drawing on the roll. */
export const ROLL_UNITS_PER_INCH = 250;
/** One sheet, about 4.4 inches long: a sheet's shape is 10 across to 11 down. */
export const ROLL_SHEET = 1100;
/** The most paper a roll has, in units: 200 sheets. */
export const ROLL_MAX = 200 * ROLL_SHEET;
/** A perforation closer to the roll than this (in units) is in the roll, not in view. */
const IN_VIEW = 20;
/** The paper in view on the guest's card: one sheet's height, below the roll. */
const VIEW = ROLL_SHEET;
/** A flick keeps the roll spinning, slowing like a real one: this is how quickly (ms for the speed to fall to about a third). */
const SPIN = 380;

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Where the paper would tear right now, `out` units unrolled: at the perforation nearest the roll that's in view. 0 when
 * none is (only the first sheet hangs): nothing would tear.
 */
export function tearOf(out: number): number {
  const k = Math.ceil((out - IN_VIEW) / ROLL_SHEET) - 1;
  return k >= 1 ? k * ROLL_SHEET : 0;
}

/** A saved length out, back to a number the roll can show: at least the first sheet, at most the whole roll. */
export const outOf = (saved: unknown) => Math.min(ROLL_MAX, Math.max(ROLL_SHEET, Number(saved) || ROLL_SHEET));

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
export function PaperStrip({ strokes, palette, top, bottom, height, torn, draft, marks, className = "tp-strip" }: {
  strokes: Stroke[]; palette: Palette; top: number; bottom: number; height: number; torn?: "below" | "above"; draft?: Stroke;
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
  for (let k = Math.ceil(bottom / ROLL_SHEET); k * ROLL_SHEET <= top; k++) if (k * ROLL_SHEET > bottom + 1 && k * ROLL_SHEET < top - 1) perfs.push(top - k * ROLL_SHEET);
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
          <StrokeMarks strokes={strokes} draft={draft} palette={palette} />
          {marks}
        </g>
      </g>
      <path d={outline} fill="none" stroke="#0002" strokeWidth="3" />
    </svg>
  );
}

/** The width of an element, kept up to date. */
function useWidth<T extends HTMLElement>() {
  const el = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!el.current) return;
    setW(el.current.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width));
    ro.observe(el.current);
    return () => ro.disconnect();
  }, []);
  return [el, w] as const;
}

/**
 * The roll on the guest's card, taking ink: the roll at the top with the paper hanging from it, one sheet in view. Starts
 * `initialOut` units unrolled and calls `onOut` with each new length (the game saves it). `tearing`: the paper tears at the
 * perforation nearest the roll and the piece falls (the game says when). `scissors`: a ✂ in the margin beside the
 * perforation it would tear at, while there is one in view.
 */
export function RollPad({ live, marker, palette, strokes, onStroke, initialOut, onOut, tearing = false, scissors = false }: {
  live: boolean; marker: number; palette: Palette; strokes: Stroke[]; onStroke: (s: Stroke) => void;
  initialOut: number; onOut: (out: number) => void; tearing?: boolean; scissors?: boolean;
}) {
  const [out, setOut] = useState(initialOut);
  const outRef = useRef(out);
  const [pulled, setPulled] = useState(initialOut > ROLL_SHEET);
  const [box, width] = useWidth<HTMLDivElement>();
  const win = useRef<HTMLDivElement>(null);
  // Pixels per roll unit: the paper is 85.333% of the card's width, and 1000 units across.
  const scale = (width * 0.85333) / ROLL_W;

  const moveTo = (next: number) => {
    const v = Math.min(ROLL_MAX, Math.max(ROLL_SHEET, next));
    if (v === outRef.current) return false;
    outRef.current = v;
    setOut(v);
    onOut(v);
    return true;
  };

  // The swipe on the roll: follows the finger; a downward flick spins on and slows; rolling up only moves while dragging.
  const swipe = useRef<{ y: number; t: number; v: number }>();
  const spin = useRef<number>();
  const stopSpin = () => { if (spin.current) cancelAnimationFrame(spin.current); spin.current = undefined; };
  useEffect(() => stopSpin, []);
  useEffect(() => { if (!live) stopSpin(); }, [live]);
  const rollDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!live || !scale) return;
    stopSpin();
    e.currentTarget.setPointerCapture(e.pointerId);
    swipe.current = { y: e.clientY, t: performance.now(), v: 0 };
  };
  const rollMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = swipe.current;
    if (!s) return;
    const now = performance.now();
    const dy = (e.clientY - s.y) / scale;
    const dt = Math.max(1, now - s.t);
    s.v = s.v * 0.6 + (dy / dt) * 1000 * 0.4;
    s.y = e.clientY; s.t = now;
    if (moveTo(outRef.current + dy) && dy > 0) setPulled(true);
  };
  const rollUp = () => {
    const s = swipe.current;
    swipe.current = undefined;
    if (!s || !live || reduced() || s.v < 400 || performance.now() - s.t > 80) return;
    let v = s.v, last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      v *= Math.exp(-dt / SPIN);
      if (v < 60 || !moveTo(outRef.current + (v * dt) / 1000)) { spin.current = undefined; return; }
      spin.current = requestAnimationFrame(step);
    };
    spin.current = requestAnimationFrame(step);
  };

  // Drawing on the paper in view: y' down from the roll, so along the paper it's out − y'.
  const pen = usePen({
    live: live && scale > 0, marker,
    at: (e) => {
      const r = win.current!.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * ROLL_W, y = ((e.clientY - r.top) / r.width) * ROLL_W;
      if (y < 0 || y > VIEW) return undefined;
      return [Math.round(Math.min(ROLL_W, Math.max(0, x))), Math.round(outRef.current - y)];
    },
    onStroke,
  });

  const tear = tearOf(out);
  const rollH = (width * 138) / 300;
  const cut = out - tear;
  return (
    <div className="tp" ref={box}>
      <RollSvg hint={live && !pulled} onPointerDown={rollDown} onPointerMove={rollMove} onPointerUp={rollUp} onPointerCancel={rollUp}
        role="img" aria-label="The roll: swipe down to pull paper, up to roll it up" />
      <div ref={win} className={live ? "tp-win live" : "tp-win"} {...pen.handlers}>
        {tearing && tear > 0
          ? <PaperStrip strokes={clipFrom(strokes, tear)} palette={palette} top={out} bottom={tear} height={VIEW} torn="below" />
          : <PaperStrip strokes={strokes} palette={palette} top={out} bottom={0} height={VIEW} draft={pen.draft} />}
      </div>
      {scissors && tear > 0 && <span className="tp-cut" style={{ top: rollH + cut * scale }} aria-hidden="true">✂</span>}
      {tearing && tear > 0 && cut < VIEW && (
        <div className={reduced() ? "tp-fall fade" : "tp-fall"} style={{ top: rollH + cut * scale, height: (VIEW - cut) * scale } as React.CSSProperties}>
          <PaperStrip strokes={clipBefore(strokes, tear)} palette={palette} top={tear} bottom={Math.max(0, tear - (VIEW - cut))} height={VIEW - cut} torn="above" />
        </div>
      )}
    </div>
  );
}

/** A roll as it was left: what still hangs from the free end or the tear (ragged if it tore), up to one sheet. The receipt. */
export function RollStill({ strokes, palette, out, small = false }: { strokes: Stroke[]; palette: Palette; out: number; small?: boolean }) {
  const tear = tearOf(out);
  return (
    <div className={small ? "tp small" : "tp"}>
      <RollSvg aria-hidden="true" />
      <div className="tp-win">
        <PaperStrip strokes={clipFrom(strokes, tear)} palette={palette} top={out} bottom={tear} height={Math.min(VIEW, out - tear)} torn={tear > 0 ? "below" : undefined} />
      </div>
    </div>
  );
}

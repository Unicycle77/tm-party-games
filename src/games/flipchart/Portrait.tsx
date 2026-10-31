import { useEffect, useState } from "react";
import { MARKERS } from "../../drawing/palettes";
import type { Stroke } from "../../drawing/strokes";
import { StrokesSvg } from "../../drawing/StrokesSvg";
import { PAGES, PAGE_H, PAGE_W, PATTERN, UPSIDE_DOWN } from "./strokes";

/** A page's strokes as one SVG, filling whatever box it's in (which is A1's shape), in the four markers. */
export function PageSvg({ strokes, draft }: { strokes: Stroke[]; draft?: Stroke }) {
  return <StrokesSvg w={PAGE_W} h={PAGE_H} strokes={strokes} draft={draft} palette={MARKERS} />;
}

/** A page's place on the portrait, from its number: row and column of the pattern. */
const SPOT = new Map<number, [number, number]>(PATTERN.flatMap((row, r) => row.map((n, c): [number, [number, number]] => [n, [r, c]])));

/** Pages laid by hand are never quite straight: a few degrees and a little drift, the same every time for the same page. */
const hand = (n: number) => {
  const r = Math.sin(n * 12.9898) * 43758.5453;
  return (r - Math.floor(r)) * 2 - 1;
};
const settledTilt = (n: number) => (n % 4 === 0 ? 0 : hand(n) * 1.1);
const droppedTilt = (n: number) => hand(n + 40) * 7;
const droppedDrift = (n: number): [number, number] => [hand(n + 80) * 6, hand(n + 120) * 6];

const LAND_MS = 500;
const SETTLE_DELAY = 900;

/**
 * A guest's portrait: the 16 pages in the show's pattern, the four printed upside down turned half way round.
 * `landing`: the pages are dropped one at a time, in page order, each a little skewed and off its place, and once the
 * last is down they all slide into their places together. Without it (or with reduced motion) the finished portrait is just there.
 */
export function Portrait({ pages, landing = false }: { pages: Stroke[][]; landing?: boolean }) {
  const still = !landing || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [down, setDown] = useState(still ? PAGES : 0);
  const [settled, setSettled] = useState(still);
  useEffect(() => {
    if (still) return;
    const timer = window.setInterval(() => setDown((d) => Math.min(PAGES, d + 1)), LAND_MS);
    return () => window.clearInterval(timer);
  }, [still]);
  useEffect(() => {
    if (down < PAGES || settled) return;
    const timer = window.setTimeout(() => setSettled(true), SETTLE_DELAY);
    return () => window.clearTimeout(timer);
  }, [down, settled]);

  return (
    <div className={settled ? "fc-portrait settled" : "fc-portrait"}>
      {Array.from({ length: PAGES }, (_, i) => i + 1).map((n) => {
        const [r, c] = SPOT.get(n)!;
        const turn = UPSIDE_DOWN.has(n) ? 180 : 0;
        const [dx, dy] = droppedDrift(n);
        const tilt = settled ? settledTilt(n) : droppedTilt(n);
        const shift = settled ? [0, 0] : [dx, dy];
        const landed = n <= down;
        return (
          <div key={n} className={["fc-page", landed && !settled && n === down && "dropping"].filter(Boolean).join(" ")}
            style={{ left: `${c * 25}%`, top: `${r * 25}%`, opacity: landed ? 1 : 0, transform: `translate(${shift[0]}%, ${shift[1]}%) rotate(${turn + tilt}deg)` }}>
            <PageSvg strokes={pages[n - 1] ?? []} />
          </div>
        );
      })}
    </div>
  );
}

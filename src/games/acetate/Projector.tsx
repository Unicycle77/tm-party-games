import { useEffect, useState, type CSSProperties } from "react";
import { PageSvg } from "../flipchart/Portrait";
import type { Stroke } from "../flipchart/strokes";
import { handOf } from "./data";

/** The steps of the hand putting the acetate down: an empty glass, the sheet dropped in crooked, a nudge or two, the hand gone. */
type Beat = "empty" | "drop" | "nudge" | "nudge2" | "rest" | "gone";
const BEAT_MS: Record<Beat, number> = { empty: 550, drop: 750, nudge: 450, nudge2: 380, rest: 380, gone: 0 };

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One acetate on the overhead projector: a keystoned square of warm light on the darkened curtain, the acetate on its glass
 * turned half way round (the room's way up, never the guest's), its lines a little soft. `landing`: the light clicks on over an
 * empty glass, then a hand's out-of-focus shadow slides the sheet in from the bottom, drops it crooked, nudges it nearly
 * straight (once or twice, different for every guest) and withdraws. Without it (or with reduced motion) it's just there.
 */
export function Projector({ uid, strokes, landing = false, small = false }: { uid: string; strokes: Stroke[]; landing?: boolean; small?: boolean }) {
  const hand = handOf(uid);
  const still = !landing || reduced();
  const [beat, setBeat] = useState<Beat>(still ? "gone" : "empty");
  useEffect(() => {
    if (beat === "gone") return;
    const order: Beat[] = ["empty", "drop", "nudge", ...(hand.nudges === 2 ? ["nudge2" as const] : []), "rest", "gone"];
    const timer = window.setTimeout(() => setBeat(order[order.indexOf(beat) + 1]!), BEAT_MS[beat]);
    return () => window.clearTimeout(timer);
  }, [beat]);

  // Where the sheet is at each beat, in % of itself and degrees. Off the bottom before it comes in.
  const { drop, rest } = hand;
  const place = beat === "empty" ? { x: drop.x, y: 115, turn: drop.turn * 1.4 }
    : beat === "drop" ? { x: drop.x, y: drop.y, turn: drop.turn }
    : beat === "nudge" && hand.nudges === 2 ? { x: rest.x - drop.x * 0.3, y: rest.y + drop.y * 0.3, turn: -rest.turn * 0.8 }
    : beat === "nudge" || beat === "nudge2" || beat === "rest" ? rest
    : rest;
  const handOn = beat === "drop" || beat === "nudge" || beat === "nudge2";
  const sheet: CSSProperties = {
    transform: `translate(${place.x}%, ${place.y}%) rotate(${place.turn}deg)`,
    transitionDuration: beat === "empty" || beat === "gone" ? "0ms" : `${BEAT_MS[beat === "drop" ? "drop" : "nudge"] * 0.8}ms`,
  };
  return (
    <div className={small ? "ohp small" : "ohp"}>
      <div className="ohp-spill" />
      <div className="ohp-light">
        <div className="ohp-sheet" style={sheet}>
          <div className="ohp-ink"><PageSvg strokes={strokes} /></div>
          {!still && (
            <div className={["ohp-hand", hand.side, handOn ? "on" : "off"].join(" ")}>
              <HandShadow />
            </div>
          )}
        </div>
        <div className="ohp-fringe" />
      </div>
    </div>
  );
}

/** A hand seen from below the glass: out of focus, so soft and see-through (blurred in CSS). Holding the sheet's right corner. */
function HandShadow() {
  return (
    <svg viewBox="0 0 400 600" aria-hidden="true">
      <g fill="#1a120a">
        <rect x="170" y="330" width="150" height="320" rx="70" transform="rotate(-18 245 490)" />
        <ellipse cx="200" cy="300" rx="95" ry="110" transform="rotate(-20 200 300)" />
        <rect x="98" y="120" width="34" height="150" rx="17" transform="rotate(-28 115 195)" />
        <rect x="140" y="95" width="36" height="160" rx="18" transform="rotate(-18 158 175)" />
        <rect x="188" y="100" width="35" height="150" rx="17" transform="rotate(-8 205 175)" />
        <rect x="234" y="130" width="32" height="125" rx="16" transform="rotate(2 250 190)" />
        <rect x="60" y="250" width="36" height="120" rx="18" transform="rotate(-62 78 310)" />
      </g>
    </svg>
  );
}

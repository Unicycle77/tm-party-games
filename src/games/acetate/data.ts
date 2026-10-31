import { ref, update } from "firebase/database";
import { db } from "../../firebase";
import type { ScoreboardTask, Session } from "../../types";
import { limitsOf } from "../../clock/timesIn";
import { decodePage, type Stroke } from "../flipchart/strokes";
import { drawRound } from "../drawRound";

export const DEFAULT_DRAW = "a happy horse";
/** The show's limit, used when the task's words give none. */
export const DEFAULT_MS = 100_000;

/** The task's words, as the show wrote them (S7E9), with what the guests draw filled in. The host only ever changes `draw`. */
export const acetateWords = (draw?: string) =>
  `Write your name and draw a picture of ${draw?.trim() || DEFAULT_DRAW} on your overhead projector acetate, upside-down. You must not rotate or manipulate your acetate. You have 100 seconds. Most accurate picture and writing when your acetate is overhead-projected wins.`;

/** What a new Acetate task on the list starts with. */
export const acetateDefaults = () => ({ draw: DEFAULT_DRAW, text: acetateWords(DEFAULT_DRAW) });

export const drawOf = (task: ScoreboardTask | undefined) => task?.draw?.trim() || DEFAULT_DRAW;

/** "a happy horse" → "Happy horse": the card's title, what they draw without its article. */
export const titleOfDraw = (draw: string) => {
  const bare = draw.trim().replace(/^(a|an|the)\s+/i, "");
  return bare ? bare[0]!.toUpperCase() + bare.slice(1) : bare;
};

/** The time the host set in ✎, else the one the task's words give ("You have 100 seconds"), else the show's 100 seconds. No extra time: it's a live task. */
export const limitOf = (task: ScoreboardTask | undefined) => limitsOf(task)[0]?.ms ?? DEFAULT_MS;

const round = drawRound("acetate", limitOf);
export const acetateRound = round;
export const acetateTask = round.taskOf;
export const { dataOf, started, closed, running, holdsScreen, sentCount, useRemaining, startClock, drewIn, roundOver, settleOldRound, endNow } = round;
/** In at time (there's no send button: everyone's goes in when the clock runs out). */
export const acetateStatus = round.status;

/** The one sheet each guest draws on. */
export const SHEET = "p1";

/** A guest's acetate, decoded from the session, the guest's way up. */
export const sheetOf = (session: Session, uid: string): Stroke[] => decodePage(dataOf(session).pages?.[uid]?.[SHEET]);

/** Saves a task's what-they-draw (its words follow from it, see `editTask`). */
export const editAcetate = (code: string, id: string, draw: string) =>
  update(ref(db(), `sessions/${code}/scoreboard/tasks/${id}`), { draw: draw.trim() || null });

/**
 * Laying an acetate on the glass by hand is never quite the same twice: where it lands, how crooked, one nudge or two, and
 * how straight it ends up. Seeded by the guest, so every screen (and a replay) shows the same moves for the same guest.
 */
export function handOf(uid: string) {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) h = Math.imul(h ^ uid.charCodeAt(i), 16777619);
  const r = (n: number) => {
    const x = Math.sin((h >>> 0) * 0.0001 + n * 12.9898) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
  const sign = r(1) < 0 ? -1 : 1;
  return {
    /** Where it's dropped, in degrees and % of the light: crooked, low and off to one side. */
    drop: { turn: sign * (5 + Math.abs(r(2)) * 4), x: r(3) * 5, y: 4 + Math.abs(r(4)) * 4 },
    /** Two nudges for some guests: the first overshoots a little. */
    nudges: r(5) > 0.2 ? 2 : 1,
    /** Where it ends up: nearly straight, never quite. */
    rest: { turn: -sign * (0.6 + Math.abs(r(6)) * 1.4), x: r(7) * 1.2, y: r(8) * 1 },
    /** Which bottom corner the hand holds. */
    side: r(9) < 0 ? "left" as const : "right" as const,
  };
}

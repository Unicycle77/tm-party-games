import type { ScoreboardTask, Session } from "../../types";
import { limitsOf } from "../../clock/timesIn";
import { MARKERS } from "../../drawing/palettes";
import { measureSnake, type SnakeLength } from "../../drawing/measure";
import { decodePage, type Stroke } from "../../drawing/strokes";
import { ROLL_SHEET, ROLL_UNITS_PER_INCH, ROLL_W, outOf, tearOf } from "../../drawing/surfaces/Roll";
import { drawRound } from "../drawRound";

/** The show's words (Jeffrey's, 2026-10-31), a paragraph a line, the "-" line kept. */
export const SNAKE_WORDS = [
  "Draw the second longest snake.",
  "-",
  "Your snake must be at least half an inch wide at all points.",
  "Your snake must be neatly curled up again after 3 minutes.",
  "There is a bonus point for the best snake.",
].join("\n");

/** What a new snake task on the list starts with. */
export const snakeDefaults = () => ({ text: SNAKE_WORDS });

/** The show's three minutes, used when the task's words give none. */
export const DEFAULT_MS = 180_000;
/** The time the host set in ✎, else the one the task's words give ("after 3 minutes"), else three minutes. */
export const limitOf = (task: ScoreboardTask | undefined) => limitsOf(task)[0]?.ms ?? DEFAULT_MS;

// ---- drawn on the toilet roll (src/drawing/surfaces/Roll.tsx), in roll units ----

/** One sheet of the roll, for the TV's lengths and layout. */
export const SHEET = ROLL_SHEET;
/** Half an inch: the narrowest a snake may be. */
export const MIN_WIDTH = ROLL_UNITS_PER_INCH / 2;

const round = drawRound("snake", limitOf);
export const snakeRound = round;
export const snakeTask = round.taskOf;
export const { dataOf, started, closed, running, holdsScreen, sentCount, useRemaining, startClock, drewIn, roundOver, settleOldRound, endNow } = round;
/** In at time (no send button: what's still out tears off, and the rest goes in). */
export const snakeStatus = round.status;

/** A guest's roll as saved: the strokes (y along the paper from the free end), how far it's out, and where it tears at 0:00. */
export function rollOf(session: Session, uid: string): { strokes: Stroke[]; out: number; tear: number } {
  const page = dataOf(session).pages?.[uid];
  const out = outOf(page?.out);
  return { strokes: decodePage(page?.p1, MARKERS.length), out, tear: tearOf(out) };
}

const measured = new Map<string, SnakeLength>();
/** A guest's snake, measured on the paper they kept (worked out once per drawing: the TV and the host phone ask often). */
export function lengthOf(session: Session, uid: string): SnakeLength {
  const page = dataOf(session).pages?.[uid];
  const { strokes, tear } = rollOf(session, uid);
  const key = `${tear}|${page?.p1 ?? ""}`;
  let m = measured.get(key);
  if (!m) {
    m = measureSnake(strokes, { w: ROLL_W, unitsPerInch: ROLL_UNITS_PER_INCH, sheet: SHEET, from: tear, minWidth: MIN_WIDTH });
    if (measured.size > 64) measured.clear();
    measured.set(key, m);
  }
  return m;
}

/** "44½ in": inches to the half, as said out loud. */
export const inchesText = (n: number) => `${Math.floor(n)}${n % 1 ? "½" : ""} in`;
export const sheetsText = (n: number) => `${n} ${n === 1 ? "sheet" : "sheets"}`;

/** Unrolling on the TV: everyone at one speed, in roll units per second (about a sheet a second). */
export const UNROLL_SPEED = 1300;
/** The rolls hang still for a moment before they start. */
export const UNROLL_DELAY = 1500;

/** How far a guest's roll unrolls on the TV: from the tear (or the free end) to the end of the last sheet with ink on it. */
export function stripOf(session: Session, uid: string) {
  const { strokes, out, tear } = rollOf(session, uid);
  let last = 0;
  for (const s of strokes) for (let i = 1; i < s.p.length; i += 2) if (s.p[i]! >= tear) last = Math.max(last, s.p[i]!);
  const end = Math.max(out, last > 0 ? Math.ceil(last / SHEET) * SHEET : 0);
  return { strokes, tear, hang: out - tear, full: end - tear };
}

/** How long a roll takes to unroll once the race starts, in ms. */
export const unrollMs = (hang: number, full: number) => Math.max(0, full - hang) / UNROLL_SPEED * 1000;

/** The guests in the race, in the order they joined (as everywhere "everyone" is shown). */
export const racersOf = (session: Session) =>
  Object.entries(session.players ?? {}).filter(([uid]) => snakeStatus(session, uid) === "submitted")
    .sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0)).map(([uid]) => uid);


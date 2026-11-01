import type { ScoreboardTask, Session } from "../../types";
import { limitsOf } from "../../clock/timesIn";
import { RAINBOW } from "../../drawing/palettes";
import { sheetSurface } from "../../drawing/surfaces/Sheet";
import { areaOf, type Area } from "../../drawing/measure";
import { decodePage, type Stroke } from "../../drawing/strokes";
import { drawRound } from "../drawRound";

/** The show's words (Jeffrey's, 2026-10-31), a paragraph a line, the "-" line kept. */
export const DUCK_WORDS = [
  "Draw the median duck.",
  "-",
  "The median duck alone wins.",
  "You have 100 seconds.",
  "There will also be a bonus point for best duck picture.",
].join("\n");

/** What a new duck task on the list starts with. */
export const duckDefaults = () => ({ text: DUCK_WORDS });

/** The show's 100 seconds, used when the task's words give none. */
export const DEFAULT_MS = 100_000;
/** The time the host set in ✎, else the one the task's words give ("You have 100 seconds"), else 100 seconds. */
export const limitOf = (task: ScoreboardTask | undefined) => limitsOf(task)[0]?.ms ?? DEFAULT_MS;

/** The duck's markers: ten, in rainbow order. */
export const PALETTE = RAINBOW;

const round = drawRound("duck", limitOf);
export const duckRound = round;
export const duckTask = round.taskOf;
export const { dataOf, started, closed, running, holdsScreen, sentCount, useRemaining, startClock, drewIn, roundOver, settleOldRound, endNow } = round;
/** Sent by the guest, or in at time. */
export const duckStatus = round.status;

/** A guest's duck, decoded from the session. */
export const pageOf = (session: Session, uid: string): Stroke[] => decodePage(dataOf(session).pages?.[uid]?.p1, PALETTE.length);

const measured = new Map<string, Area>();
/** A guest's duck, measured (once per drawing: the TV and the host phone ask often). */
export function sizeOf(session: Session, uid: string): Area {
  const key = dataOf(session).pages?.[uid]?.p1 ?? "";
  let m = measured.get(key);
  if (!m) {
    m = areaOf(pageOf(session, uid), sheetSurface("paper"));
    if (measured.size > 64) measured.clear();
    measured.set(key, m);
  }
  return m;
}

/** The ducks in the line-up, in the order the guests joined (the running order, before the frames slide into size order). */
export const ducksOf = (session: Session) =>
  Object.entries(session.players ?? {}).filter(([uid]) => duckStatus(session, uid) === "submitted")
    .sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0)).map(([uid]) => uid);

/** The line-up's timing on the TV, in ms after the host's "▶ Line up the ducks": hung, then each duck's gold wash in turn, then the slide. */
export const HANG_MS = 900;
export const WASH_MS = 1000;
export const slideAt = (n: number) => HANG_MS + n * WASH_MS + 200;

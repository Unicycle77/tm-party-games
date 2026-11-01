import { ref, update } from "firebase/database";
import { db } from "../../firebase";
import type { Session } from "../../types";
import { RAINBOW } from "../../drawing/palettes";
import { LINE, decodePage, type Stroke } from "../../drawing/strokes";
import { drawRound } from "../drawRound";

/**
 * The task's two parts, from the wiki's account of the show's task (2026-11-01), with "on your device" for the show's tablet
 * (Jeffrey). Part 1 is the question, asked before anyone knows why; part 2 the task, which makes the answer a time limit.
 */
export const PART_1 = "How long does it take you to eat an orange?";
export const PART_2 = [
  "Draw a picture of yourself eating some fruit on your device.",
  "You may not use your hands.",
  "You must get increasingly angry throughout.",
  "Your time limit is how long you said it takes you to eat an orange.",
  "Best picture wins.",
].join("\n");

/** What a new fruit selfie task on the list starts with: part 1 the question, part 2 the task. */
export const fruitDefaults = () => ({ text: PART_1, parts: [{ type: "", text: PART_2 }] });

/** The ten markers, as the duck's: hitting the right one with a nose is half the fun (Jeffrey). */
export const PALETTE = RAINBOW;
/** The line, twice a marker's: a nose can't draw a fine one, and thick lines read on the TV. */
export const WIDTH = LINE * 2;

/** The longest an answer can be: 999 minutes, as the boxes allow. */
export const MAX_MS = 999 * 60_000 + 59_000;

// Each guest's limit is their own answer; the round's end is the longest of them (set when the host starts it).
const round = drawRound("fruit", () => 0);
export const fruitRound = round;
export const fruitTask = round.taskOf;
export const { path, dataOf, started, closed, running, holdsScreen, drewIn, roundOver, settleOldRound, endNow, hold } = round;

/** Part 1's and part 2's words, as the host has them on the task (the built-in ones when it has none). */
export function wordsOf(session: Session): [string, string] {
  const t = fruitTask(session);
  // As partsOf (scoreboard/TaskText) reads them, without importing the scoreboard's screens into the game's data.
  const more = (Array.isArray(t?.parts) ? t.parts : Object.values(t?.parts ?? {})) as { text?: string }[];
  const parts = [t?.text, ...more.map((p) => p?.text)].filter((x): x is string => !!x?.trim());
  return [parts[0] ?? PART_1, parts[1] ?? PART_2];
}

/** The guests in the order they joined. */
const joined = (session: Session) =>
  Object.entries(session.players ?? {}).sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0)).map(([uid]) => uid);

/** The shortest time anyone gave: what a guest who didn't answer gets (Jeffrey: less harsh than sitting it out). */
export function shortest(session: Session): number | undefined {
  const all = Object.values(dataOf(session).answers ?? {}).filter((ms) => ms > 0);
  return all.length ? Math.min(...all) : undefined;
}

/** A guest's own answer, if they gave one. */
export const answerOf = (session: Session, uid: string): number | undefined => dataOf(session).answers?.[uid];

/** A guest's time limit: their answer, else the shortest anyone gave. */
export const limitOf = (session: Session, uid: string): number | undefined => answerOf(session, uid) ?? shortest(session);

/** Everyone, shortest time first (ties in the order they joined); no answer at all goes last. */
export function inOrder(session: Session): string[] {
  const all = joined(session);
  const t = (uid: string) => answerOf(session, uid) ?? Infinity;
  return [...all].sort((a, b) => t(a) - t(b) || all.indexOf(a) - all.indexOf(b));
}

/** How long the clock has counted, at `now` (database time): held while paused, nothing before the start. */
export function elapsed(session: Session, now: number): number {
  const d = dataOf(session);
  if (d.startedAt === undefined) return 0;
  return Math.max(0, (d.heldAt ?? now) - d.startedAt);
}

/** This guest's time is up: their own time has passed on the clock, the host ended it for them, or the round is over. */
export function timeUp(session: Session, uid: string, now: number): boolean {
  const d = dataOf(session);
  if (d.closed || d.submitted?.[uid]) return true;
  if (!started(session)) return false;
  const limit = limitOf(session, uid);
  return limit !== undefined && elapsed(session, now) >= limit;
}

/** Their picture is in (their time's up and it was sent), or the round is over. What the reveal goes by. */
export const fruitStatus = round.status;

/** A guest's picture, decoded from the session. */
export const pageOf = (session: Session, uid: string): Stroke[] => decodePage(dataOf(session).pages?.[uid]?.p1, PALETTE.length);

/** "3:00", "0:45", "10:00": an orange time, as every screen in this task says it. */
export function timeText(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const at = (code: string) => ref(db(), path(code));

/** Host: part 1 on the big screen and every phone: the question. */
export const ask = (code: string) =>
  update(ref(db(), `sessions/${code}`), { "games/fruit/asked": true, display: { step: "list" }, conversion: null, "clock/shown": null });

/** Host: part 2, and with it everyone's time. */
export const tell = (code: string) =>
  update(ref(db(), `sessions/${code}`), { "games/fruit/asked": true, "games/fruit/told": true, display: { step: "list" }, conversion: null, "clock/shown": null });

/** A guest's answer (theirs, or typed by the host for them). */
export const answer = (code: string, uid: string, ms: number) => update(at(code), { [`answers/${uid}`]: Math.min(MAX_MS, ms) });

/**
 * Host: "Your time starts now". Anyone who didn't answer is given the shortest time anyone did (written down, so it can't
 * change under them), and the round ends when the longest time does.
 */
export function startClock(code: string, session: Session, offset: number) {
  const now = Date.now() + offset;
  const fallback = shortest(session);
  const patch: Record<string, unknown> = {};
  for (const uid of joined(session)) if (answerOf(session, uid) === undefined && fallback !== undefined) patch[`games/fruit/answers/${uid}`] = fallback;
  const longest = Math.max(0, ...joined(session).map((uid) => limitOf(session, uid) ?? 0));
  return update(ref(db(), `sessions/${code}`), {
    ...patch,
    "games/fruit/startedAt": now,
    "games/fruit/endsAt": now + longest,
    "games/fruit/closed": null,
    "games/fruit/heldAt": null,
    display: { step: "list" },
    conversion: null,
    "clock/shown": null,
  });
}

/** Host: ends one guest's time early: their picture goes in as drawn. The last one still drawing closes the round. */
export function endOne(code: string, session: Session, uid: string, offset: number) {
  const now = Date.now() + offset;
  const still = joined(session).filter((u) => u !== uid && !timeUp(session, u, now));
  return update(at(code), still.length ? { [`submitted/${uid}`]: true } : { [`submitted/${uid}`]: true, closed: true, endsAt: now, heldAt: null });
}

/** Marks every guest whose time has passed as in (the main screen does this on time; a phone does it for itself too). */
export function sendDue(code: string, session: Session, now: number) {
  const d = dataOf(session);
  const patch: Record<string, true> = {};
  for (const uid of joined(session)) if (!d.submitted?.[uid] && timeUp(session, uid, now)) patch[`submitted/${uid}`] = true;
  return Object.keys(patch).length ? update(at(code), patch) : Promise.resolve();
}

import { ref, update } from "firebase/database";
import { useEffect } from "react";
import { db } from "../../firebase";
import type { SubmissionStatus } from "../../submission";
import type { FlipchartData, ScoreboardTask, Session } from "../../types";
import { useServerNow, useServerOffset } from "../noisemaster/data";

export const DEFAULT_DRAW = "a portrait of the Taskmaster";
export const DEFAULT_MINUTES = 20;
/** The time limits the host picks from. */
export const MINUTES = [10, 15, 20, 30] as const;
const EXTRA_MS = 5 * 60_000;

/** The task's words, as the show wrote them, with what the guests draw filled in. The host only ever changes `draw`. */
export const flipchartWords = (draw?: string) =>
  `Draw ${draw?.trim() || DEFAULT_DRAW} using 16 A1 pages. You may not remove the A1 pages from the flipchart during your drawing. After the task, the A1 pages will be laid out in the pattern shown on the front page. You may only draw on the flipchart paper.`;

/** What a new Flipchart task on the list starts with. */
export const flipchartDefaults = () => ({ draw: DEFAULT_DRAW, minutes: DEFAULT_MINUTES, text: flipchartWords(DEFAULT_DRAW) });

/** The Flipchart task on the run of show (it's on the list at most once). */
export const flipchartTask = (session: Session): ScoreboardTask | undefined =>
  Object.values(session.scoreboard?.tasks ?? {}).find((t) => t.game === "flipchart");

export const minutesOf = (task: ScoreboardTask | undefined) => task?.minutes ?? DEFAULT_MINUTES;
export const drawOf = (task: ScoreboardTask | undefined) => task?.draw?.trim() || DEFAULT_DRAW;

export const dataOf = (session: Session): FlipchartData => session.games?.flipchart ?? {};
export const started = (session: Session) => dataOf(session).startedAt !== undefined;
export const closed = (session: Session) => !!dataOf(session).closed;
/** The clock is running: started, and neither run out nor ended. */
export const running = (session: Session) => started(session) && !closed(session);
/** Whether the big screen is held by the clock: nothing else can go up while the guests draw. */
export const holdsScreen = (session: Session) => session.game === "flipchart" && running(session);

/** Sent by the guest, or final because the time is up. */
export const flipchartStatus = (session: Session, uid: string): SubmissionStatus =>
  dataOf(session).submitted?.[uid] || dataOf(session).closed ? "submitted" : "waiting";

export const sentCount = (session: Session) =>
  Object.keys(session.players ?? {}).filter((uid) => flipchartStatus(session, uid) === "submitted").length;

/** How much time is left on every screen's clock, ticking while it runs: the limit before the start, nothing once it's closed. */
export function useRemaining(session: Session): number {
  const data = dataOf(session);
  const now = useServerNow(running(session));
  if (data.closed) return 0;
  if (data.endsAt === undefined) return minutesOf(flipchartTask(session)) * 60_000;
  return Math.max(0, data.endsAt - now);
}

const path = (code: string) => `sessions/${code}/games/flipchart`;

/** Host: starts the clock for everyone ("Your time starts now"), and puts the clock on the big screen. */
export function startClock(code: string, session: Session, offset: number) {
  const now = Date.now() + offset;
  return update(ref(db(), `sessions/${code}`), {
    "games/flipchart/startedAt": now,
    "games/flipchart/endsAt": now + minutesOf(flipchartTask(session)) * 60_000,
    "games/flipchart/closed": null,
    display: { step: "list" },
    conversion: null,
    "clock/shown": null,
  });
}

/** Guests who drew anything, in a round from before. */
export const drewIn = (session: Session) =>
  Object.entries(dataOf(session).pages ?? {}).filter(([, pages]) => Object.values(pages ?? {}).some((p) => !!p)).map(([uid]) => uid);

/** A round from before whose time is up: left while the clock ran (so nothing closed it), or closed. A round still running isn't. */
export const roundOver = (session: Session) =>
  started(session) && (closed(session) || (dataOf(session).endsAt ?? 0) <= Date.now());

/**
 * Host, as Start puts Flipchart on: a round from before whose time is up is cleared, so "Your time starts now" is back, unless
 * there are drawings in it and the host chose to keep them (`keep`): then it's closed, so they stay for the reveal. Left as it
 * was, its clock would flash up until the big screen closed it, and the round could never start. A round still running is left to run.
 */
export function settleOldRound(code: string, session: Session, keep: boolean) {
  if (!roundOver(session)) return Promise.resolve();
  if (keep && drewIn(session).length) return closed(session) ? Promise.resolve() : update(ref(db(), path(code)), { closed: true });
  const data = dataOf(session);
  const patch: Record<string, null> = { startedAt: null, endsAt: null, closed: null };
  for (const part of ["pages", "submitted", "unlocked", "shown"] as const) {
    for (const uid of Object.keys(data[part] ?? {})) patch[`${part}/${uid}`] = null;
  }
  return update(ref(db(), path(code)), patch);
}

/** Host: five more minutes for everyone, while the clock runs. */
export const addFiveMinutes = (code: string, endsAt: number) => update(ref(db(), path(code)), { endsAt: endsAt + EXTRA_MS });

/** Host: stops the clock now: every portrait is final as it is. */
export const endNow = (code: string, offset: number) => update(ref(db(), path(code)), { closed: true, endsAt: Date.now() + offset });

/**
 * The main screen closes the round when the clock runs out, so every portrait is final and the running order can start.
 * Guests' own phones send their portrait at the same moment.
 */
export function useCloser(code: string, session: Session, enabled: boolean) {
  const offset = useServerOffset();
  const endsAt = dataOf(session).endsAt;
  const live = enabled && session.game === "flipchart" && running(session) && endsAt !== undefined;
  useEffect(() => {
    if (!live) return;
    const wait = Math.max(0, endsAt! - (Date.now() + offset)) + 300;
    const timer = window.setTimeout(() => { void update(ref(db(), path(code)), { closed: true }); }, wait);
    return () => window.clearTimeout(timer);
  }, [live, endsAt, offset, code]);
}

/** Main screen: closes the round on time whatever is up, the curtain included (see `useCloser`). */
export function FlipchartCloser({ code, session }: { code: string; session: Session }) {
  useCloser(code, session, true);
  return null;
}

/** Saves a task's what-they-draw and time limit (its words follow from them, see `editTask`). */
export const editFlipchart = (code: string, id: string, draw: string, minutes: number) =>
  update(ref(db(), `sessions/${code}/scoreboard/tasks/${id}`), { draw: draw.trim() || null, minutes });

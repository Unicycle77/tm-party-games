import { ref, update } from "firebase/database";
import { useEffect } from "react";
import { db } from "../firebase";
import type { SubmissionStatus } from "../submission";
import type { DrawingData, ScoreboardTask, Session } from "../types";
import { useServerNow, useServerOffset } from "./noisemaster/data";

import { GUEST_PARTS, type DrawGame } from "./drawGames";

export { DRAW_GAMES, GUEST_PARTS, type DrawGame } from "./drawGames";

/**
 * One drawing round's clock and state (Flipchart, Acetate): the host starts it, every phone draws until it runs out, then
 * every drawing is final. `limitMs` is the time the task gives. Everything lives at `sessions/<code>/games/<game>`.
 */
export function drawRound(game: DrawGame, limitMs: (task: ScoreboardTask | undefined) => number) {
  const path = (code: string) => `sessions/${code}/games/${game}`;
  /** The task on the run of show (each drawing task is on it at most once). */
  const taskOf = (session: Session): ScoreboardTask | undefined =>
    Object.values(session.scoreboard?.tasks ?? {}).find((t) => t.game === game);
  const dataOf = (session: Session): DrawingData => session.games?.[game] ?? {};
  const started = (session: Session) => dataOf(session).startedAt !== undefined;
  const closed = (session: Session) => !!dataOf(session).closed;
  /** The clock is running: started, and neither run out nor ended. */
  const running = (session: Session) => started(session) && !closed(session);
  /** Whether the big screen is held by the clock: nothing else can go up while the guests draw. */
  const holdsScreen = (session: Session) => session.game === game && running(session);
  /** Sent by the guest, or final because the time is up. */
  const status = (session: Session, uid: string): SubmissionStatus =>
    dataOf(session).submitted?.[uid] || dataOf(session).closed ? "submitted" : "waiting";
  const sentCount = (session: Session) => Object.keys(session.players ?? {}).filter((uid) => status(session, uid) === "submitted").length;

  /** How much time is left on every screen's clock, ticking while it runs: the limit before the start, nothing once it's closed. */
  function useRemaining(session: Session): number {
    const data = dataOf(session);
    const now = useServerNow(running(session));
    if (data.closed) return 0;
    if (data.endsAt === undefined) return limitMs(taskOf(session));
    return Math.max(0, data.endsAt - (data.heldAt ?? now));
  }

  /** Host: starts the clock for everyone ("Your time starts now"), and puts the clock on the big screen. */
  function startClock(code: string, session: Session, offset: number) {
    const now = Date.now() + offset;
    return update(ref(db(), `sessions/${code}`), {
      [`games/${game}/startedAt`]: now,
      [`games/${game}/endsAt`]: now + limitMs(taskOf(session)),
      [`games/${game}/closed`]: null,
      display: { step: "list" },
      conversion: null,
      "clock/shown": null,
    });
  }

  /** Guests who drew anything, in a round from before. */
  const drewIn = (session: Session) =>
    Object.entries(dataOf(session).pages ?? {}).filter(([, pages]) => Object.values(pages ?? {}).some((p) => !!p)).map(([uid]) => uid);

  /** A round from before whose time is up: left while the clock ran (so nothing closed it), or closed. A round still running isn't. */
  const roundOver = (session: Session) => started(session) && (closed(session) || (dataOf(session).endsAt ?? 0) <= Date.now());

  /**
   * Host, as Start puts the task on: a round from before whose time is up is cleared, so "Your time starts now" is back, unless
   * there are drawings in it and the host chose to keep them (`keep`): then it's closed, so they stay for the reveal. Left as it
   * was, its clock would flash up until the big screen closed it, and the round could never start. A round still running is left to run.
   */
  function settleOldRound(code: string, session: Session, keep: boolean) {
    if (!roundOver(session)) return Promise.resolve();
    if (keep && drewIn(session).length) return closed(session) ? Promise.resolve() : update(ref(db(), path(code)), { closed: true });
    const data = dataOf(session);
    const patch: Record<string, null> = { startedAt: null, endsAt: null, closed: null, heldAt: null, asked: null, told: null };
    for (const part of GUEST_PARTS) for (const uid of Object.keys(data[part] ?? {})) patch[`${part}/${uid}`] = null;
    return update(ref(db(), path(code)), patch);
  }

  /** Host: pauses the clock (⏸) or carries on (▶). Carrying on moves the start and the end on by the pause, so the time left is as it was. */
  function hold(code: string, session: Session, offset: number) {
    const data = dataOf(session);
    const now = Date.now() + offset;
    if (data.heldAt === undefined) return update(ref(db(), path(code)), { heldAt: now });
    const paused = now - data.heldAt;
    return update(ref(db(), path(code)), { heldAt: null, startedAt: (data.startedAt ?? now) + paused, endsAt: (data.endsAt ?? now) + paused });
  }

  /** Host: more time for everyone, while the clock runs. */
  const addTime = (code: string, endsAt: number, ms: number) => update(ref(db(), path(code)), { endsAt: endsAt + ms });

  /** Host: stops the clock now: every drawing is final as it is. */
  const endNow = (code: string, offset: number) => update(ref(db(), path(code)), { closed: true, endsAt: Date.now() + offset, heldAt: null });

  /** The main screen closes the round when the clock runs out, so every drawing is final and the running order can start. */
  function useCloser(code: string, session: Session, enabled: boolean) {
    const offset = useServerOffset();
    const endsAt = dataOf(session).endsAt;
    // Paused (the fruit selfie's ⏸): nothing closes until it carries on.
    const live = enabled && session.game === game && running(session) && endsAt !== undefined && dataOf(session).heldAt === undefined;
    useEffect(() => {
      if (!live) return;
      const wait = Math.max(0, endsAt! - (Date.now() + offset)) + 300;
      const timer = window.setTimeout(() => { void update(ref(db(), path(code)), { closed: true }); }, wait);
      return () => window.clearTimeout(timer);
    }, [live, endsAt, offset, code]);
  }

  return { game, path, taskOf, dataOf, started, closed, running, holdsScreen, status, sentCount, useRemaining, startClock, drewIn, roundOver, settleOldRound, addTime, endNow, hold, useCloser };
}

export type DrawRound = ReturnType<typeof drawRound>;

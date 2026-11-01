import { useEffect } from "react";
import type { Session } from "../../types";
import { useServerOffset } from "../noisemaster/data";
import { dataOf, elapsed, inOrder, limitOf, running, sendDue } from "./data";

/**
 * Main screen: as the clock passes each guest's own time, their picture goes in (the round's own closer ends it at the
 * longest). Waits for the next time due, so it's on the dot whatever is up; nothing while paused.
 */
export function useFruitSender(code: string, session: Session) {
  const offset = useServerOffset();
  const live = session.game === "fruit" && running(session) && dataOf(session).heldAt === undefined;
  const now = Date.now() + offset;
  const done = elapsed(session, now);
  const next = live
    ? Math.min(...inOrder(session).map((uid) => limitOf(session, uid) ?? Infinity).filter((ms) => ms > done), Infinity)
    : Infinity;
  const startedAt = dataOf(session).startedAt;
  const sent = Object.keys(dataOf(session).submitted ?? {}).length;
  useEffect(() => {
    if (!live) return;
    // Anyone already due (the screen was reloaded mid-round) goes in now.
    void sendDue(code, session, Date.now() + offset);
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(() => { void sendDue(code, session, Date.now() + offset + 50); }, next - done + 50);
    return () => window.clearTimeout(timer);
    // The session changes all the time; what matters is the start, the pause and who's in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, next, startedAt, sent, code, offset]);
}

import { shownTotals } from "../../scoreboard/scoring";
import { setDisplay } from "../../session";
import type { Session } from "../../types";

/** Each contestant's prize photos, in their order. */
export const prizePhotos = (session: Session): Record<string, string[]> => session.games?.prize?.photos ?? {};

/**
 * Whether the prize haul can go up: once every task on the run of show has points and the last of them
 * is on the scoreboard, with at least one prize photo. A tie at the top waits for a tiebreaker task
 * (just the tied contestants), so it names who's tied instead of a winner.
 */
export function haulState(session: Session): { winner: string } | { tied: string[] } | undefined {
  const board = session.scoreboard;
  const tasks = Object.values(board?.tasks ?? {});
  if (!tasks.length || tasks.some((t) => !Object.keys(t.scores ?? {}).length)) return undefined;
  if (!Object.values(prizePhotos(session)).some((p) => p.length)) return undefined;
  const totals = shownTotals(board);
  const top = Math.max(...Object.keys(board?.contestants ?? {}).map((c) => totals[c] ?? 0));
  const leaders = Object.keys(board?.contestants ?? {}).filter((c) => (totals[c] ?? 0) === top);
  return leaders.length === 1 ? { winner: leaders[0]! } : { tied: leaders };
}

export const showHaul = (code: string) => setDisplay(code, { step: "haul" });

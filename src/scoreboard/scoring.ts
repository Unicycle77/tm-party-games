import type { Scoreboard } from "../types";

type Points = Record<string, number>;

/** Each contestant's total over a set of tasks' points. */
export function totals(tasks: Record<string, Points | undefined>): Points {
  const sum: Points = {};
  for (const scores of Object.values(tasks)) {
    for (const [id, n] of Object.entries(scores ?? {})) sum[id] = (sum[id] ?? 0) + n;
  }
  return sum;
}

/** Every task's points right now, by task id. */
export const currentPoints = (board: Scoreboard | undefined): Record<string, Points | undefined> =>
  Object.fromEntries(Object.entries(board?.tasks ?? {}).map(([id, t]) => [id, t.scores]));

/** The totals the big screen shows: as they stood at the host's last update. */
export const shownTotals = (board: Scoreboard | undefined): Points => totals(board?.shown ?? {});

/** The totals with every point given so far, shown or not. */
export const currentTotals = (board: Scoreboard | undefined): Points => totals(currentPoints(board));

const same = (a: Points | undefined, b: Points | undefined) => {
  const ka = Object.keys(a ?? {}).filter((k) => a![k] !== undefined);
  const kb = Object.keys(b ?? {}).filter((k) => b![k] !== undefined);
  return ka.length === kb.length && ka.every((k) => a![k] === b?.[k]);
};

/** Tasks never shown on the big screen that now have points, and shown tasks whose points have changed since. */
export function pendingTasks(board: Scoreboard | undefined): { added: number; changed: number } {
  const now = currentPoints(board);
  const shown = board?.shown ?? {};
  let added = 0, changed = 0;
  for (const id of new Set([...Object.keys(now), ...Object.keys(shown)])) {
    if (same(now[id], shown[id])) continue;
    if (shown[id]) changed++;
    else added++;
  }
  return { added, changed };
}

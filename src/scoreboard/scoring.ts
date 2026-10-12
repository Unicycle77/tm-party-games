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

/** How many tasks have new or changed points since the last update (a removed task that had shown points counts too). */
export function changedTasks(board: Scoreboard | undefined): number {
  const now = currentPoints(board);
  const shown = board?.shown ?? {};
  const ids = new Set([...Object.keys(now), ...Object.keys(shown)]);
  return [...ids].filter((id) => !same(now[id], shown[id])).length;
}

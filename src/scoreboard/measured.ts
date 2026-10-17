import type { ScoreboardTask } from "../types";

type Points = Record<string, number>;

/** How a task is won: by hand, or from the numbers (Noisemaster always by the fastest time). */
export const scoringOf = (t: ScoreboardTask): "hand" | "highest" | "lowest" =>
  t.game === "noisemaster" ? "lowest" : t.scoring ?? "hand";

export const isMeasured = (t: ScoreboardTask) => scoringOf(t) !== "hand";

/** By hand, the host's points: kept in `given`, or in `scores` for a task scored before there was `given`. */
const handPoints = (t: ScoreboardTask): Points => t.given ?? t.scores ?? {};

/** 5 for 1st, then 4, 3, 2, and 1 for everyone below. */
const pointsForPlace = (place: number) => Math.max(1, 6 - place);

/**
 * Each contestant's place among `ids` by their result. Ties share the place and the next place is skipped
 * (two tied for 2nd, then 4th).
 */
function places(results: Points, ids: string[], lowest: boolean): Points {
  const better = (a: number, b: number) => (lowest ? a < b : a > b);
  return Object.fromEntries(ids.map((c) => [c, 1 + ids.filter((o) => better(results[o]!, results[c]!)).length]));
}

export interface Worked {
  /** The points that count. A contestant with none isn't scored. */
  points: Points;
  /** What each contestant had before the DQs moved them, where that's different. */
  before: Points;
  /** A measured task's places, DQs left out (or in, while the DQs don't move anyone). */
  place: Points;
  /** A measured task's automatic points, before any override. */
  auto: Points;
  /** How many contestants the DQs moved up, or would move up if they were allowed to. */
  moved: number;
  /** Everyone's points as if no DQ had moved anyone, a DQ'd contestant's included: what they'd have had. */
  held: Points;
}

/**
 * A task's points from what the host entered. Measured: points by place from the results, a DQ'd
 * contestant left out of the ranking unless the DQs aren't to move anyone, and the host's overrides on top.
 * By hand: the host's points, and one more for every DQ'd contestant who had more than you. A DQ is always 0.
 */
export function workOut(t: ScoreboardTask): Worked {
  const dq = t.dq ?? {};
  const moves = !t.dqStays;
  const points: Points = {}, before: Points = {}, place: Points = {}, auto: Points = {}, held: Points = {};
  let moved = 0;
  if (isMeasured(t)) {
    const results = t.results ?? {};
    const lowest = scoringOf(t) === "lowest";
    const all = Object.keys(results);
    const everyone = places(results, all, lowest);
    const ranked = places(results, all.filter((c) => !dq[c]), lowest);
    for (const c of all) {
      const was = pointsForPlace(everyone[c]!);
      held[c] = t.given?.[c] ?? was;
      if (dq[c]) continue;
      const now = pointsForPlace(ranked[c]!);
      if (now !== was) moved++;
      place[c] = moves ? ranked[c]! : everyone[c]!;
      auto[c] = moves ? now : was;
      if (moves && now !== was && t.given?.[c] === undefined) before[c] = was;
      points[c] = t.given?.[c] ?? auto[c]!;
    }
    for (const c of Object.keys(t.given ?? {})) {
      held[c] ??= t.given![c]!;
      if (!(c in points) && !dq[c]) points[c] = t.given![c]!;
    }
  } else {
    const given = handPoints(t);
    Object.assign(held, given);
    const out = Object.keys(dq).filter((d) => given[d] !== undefined);
    for (const [c, n] of Object.entries(given)) {
      if (dq[c]) continue;
      const up = out.filter((d) => given[d]! > n).length;
      if (up) moved++;
      points[c] = moves ? n + up : n;
      if (moves && up) before[c] = n;
    }
  }
  for (const c of Object.keys(dq)) points[c] = 0;
  return { points, before, place, auto, moved, held };
}

/** 1st, 2nd, 3rd, 4th, … 11th, 12th, 13th, 21st. */
export function ordinal(n: number) {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** "0:42.3", "42.3" or "1:05" back to ms; undefined if it isn't a time. */
export function parseClock(text: string): number | undefined {
  const m = /^\s*(?:(\d+):)?(\d+(?:[.,]\d*)?)\s*$/.exec(text);
  if (!m) return undefined;
  return Math.round(((m[1] ? +m[1] * 60 : 0) + +m[2]!.replace(",", ".")) * 1000);
}

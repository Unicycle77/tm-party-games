import { GAMES } from "../games";
import type { Scoreboard, ScoreboardTask, Session, TaskGame, TaskPart } from "../types";
import { currentPoints } from "./scoring";

export const sorted = <T extends { order: number }>(items: Record<string, T> | undefined) =>
  Object.entries(items ?? {}).sort(([, a], [, b]) => a.order - b.order);

/** A task's parts after the first. The database hands them back as an object when it keeps them as one (a list is only kept as one while it has no gaps). */
export const asParts = (v: unknown): TaskPart[] => (Array.isArray(v) ? v : Object.values((v ?? {}) as Record<string, TaskPart>)) as TaskPart[];

/** An app game's name on the task list. */
export const LIGHT = "💡 The light";
export const gameName = (g: TaskGame) => g === "light" ? LIGHT : GAMES[g]?.name ?? g;

/** A live task goes by its name; an app game by the game's, plus the host's name for it when there are several. */
export const titleOf = (t: ScoreboardTask) => {
  if (!t.game) return t.name || "Untitled task";
  const game = gameName(t.game);
  return t.name ? `${game}: ${t.name}` : game;
};
export const scored = (t: ScoreboardTask) => Object.keys(t.scores ?? {}).length > 0;
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "Priya and Sam", "Priya, Sam and Mei". */
export const list = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] ?? "";

/**
 * The run-of-show task the game in progress belongs to: the photo task whose photos are on, or else the
 * list's entry for that game (each other game is on the list once). Undefined for a game not on the list.
 */
export function activeTaskId(session: Session): string | undefined {
  const tasks = session.scoreboard?.tasks ?? {};
  if (!session.game) return undefined;
  if (session.game === "photos") {
    const id = session.games?.photos?.task;
    return id && tasks[id] ? id : undefined;
  }
  return Object.entries(tasks).find(([, t]) => t.game === session.game)?.[0];
}

/**
 * Up next: the task after the last one with any points. While contestants still have no points for that
 * last one, it's the one still up, so a task half-scored is picked up where it was left.
 */
export function upNextOf(board: Scoreboard | undefined): { id: string; unfinished: boolean } | undefined {
  const tasks = sorted(board?.tasks);
  const contestants = Object.keys(board?.contestants ?? {});
  const last = tasks.map(([, t]) => scored(t)).lastIndexOf(true);
  if (last >= 0 && contestants.some((c) => tasks[last]![1].scores?.[c] === undefined)) return { id: tasks[last]![0], unfinished: true };
  const next = tasks[last + 1]?.[0];
  return next ? { id: next, unfinished: false } : undefined;
}

/** The tasks whose points the next update adds: never shown with points, or changed since. In list order. */
export function pendingIds(board: Scoreboard | undefined): string[] {
  const now = currentPoints(board);
  const shown = board?.shown ?? {};
  const same = (a: Record<string, number> | undefined, b: Record<string, number> | undefined) =>
    Object.keys(a ?? {}).length === Object.keys(b ?? {}).length && Object.entries(a ?? {}).every(([k, v]) => b?.[k] === v);
  return sorted(board?.tasks).map(([id]) => id).filter((id) => !same(now[id], shown[id]));
}

/** Everyone on the scoreboard has points (or a DQ) for this task. The light always has: no right guess is 0. */
export const allScored = (board: Scoreboard | undefined, t: ScoreboardTask) => {
  const contestants = Object.keys(board?.contestants ?? {});
  if (t.game === "light") return contestants.length > 0;
  return contestants.length > 0 && contestants.every((c) => t.scores?.[c] !== undefined || t.dq?.[c]);
};

/** The arrival task (its ✎ switch "Give it to guests at check-in"), if it has words to give: the last step of check-in. */
export const arrivalOf = (session: Session) => Object.values(session.scoreboard?.tasks ?? {}).find((t) => t.checkin && t.text?.trim());

import { push, ref, remove, set, update } from "firebase/database";
import { db, storage } from "../firebase";
import { shrinkImage } from "../media";
import { setDisplay } from "../session";
import type { GameId, Scoreboard, ScoreboardTask, TaskUnit } from "../types";
import { currentPoints } from "./scoring";

/** The party's scoreboard lives at sessions/{code}/scoreboard. Only the host and the host remote write it. */
const at = (code: string, path = "") => ref(db(), `sessions/${code}/scoreboard${path ? `/${path}` : ""}`);

const nextOrder = (items: Record<string, { order: number }> | undefined) =>
  Math.max(-1, ...Object.values(items ?? {}).map((i) => i.order)) + 1;

export async function addContestant(code: string, board: Scoreboard | undefined, name: string) {
  const key = push(at(code, "contestants")).key!;
  await set(at(code, `contestants/${key}`), { name: name.trim(), order: nextOrder(board?.contestants) });
}

/** Someone who joined by typing a name while there was no guest list: onto the scoreboard, linked to their phone. */
export async function addPlayerToScoreboard(code: string, board: Scoreboard | undefined, uid: string, name: string) {
  const key = push(at(code, "contestants")).key!;
  await update(ref(db(), `sessions/${code}`), {
    [`scoreboard/contestants/${key}`]: { name: name.trim(), order: nextOrder(board?.contestants), uid },
    [`players/${uid}/contestant`]: key,
  });
}

export const renameContestant = (code: string, id: string, name: string) => set(at(code, `contestants/${id}/name`), name.trim());

/** Takes them off the scoreboard, with every point they were given. */
export async function removeContestant(code: string, board: Scoreboard | undefined, id: string) {
  const patch: Record<string, null> = { [`contestants/${id}`]: null };
  for (const t of Object.keys(board?.tasks ?? {})) patch[`tasks/${t}/scores/${id}`] = null;
  for (const t of Object.keys(board?.shown ?? {})) patch[`shown/${t}/${id}`] = null;
  await update(at(code), patch);
}

/** Uploads a contestant's headshot (under the uploader's own uid, like every upload) and puts it in their frame. */
export async function uploadHeadshot(code: string, uid: string, id: string, file: File, onProgress: (fraction: number) => void) {
  const body = await shrinkImage(file, 800);
  const { getDownloadURL, ref: fileRef, uploadBytesResumable } = await import("firebase/storage");
  const task = uploadBytesResumable(fileRef(await storage(), `sessions/${code}/${uid}/headshot-${Date.now()}`), body, {
    contentType: body.type || "image/jpeg",
    cacheControl: "public, max-age=31536000, immutable",
  });
  await new Promise<void>((resolve, reject) => {
    task.on("state_changed", (s) => onProgress(s.bytesTransferred / s.totalBytes), reject, resolve);
  });
  await set(at(code, `contestants/${id}/photo`), await getDownloadURL(task.snapshot.ref));
}

/** Adds a live task (a name, and the host's note) or an app game to the end of the task list. */
export async function addTask(code: string, board: Scoreboard | undefined, task: { name: string; description?: string } | { game: GameId }) {
  const key = push(at(code, "tasks")).key!;
  const entry: ScoreboardTask = "game" in task
    ? { order: nextOrder(board?.tasks), game: task.game }
    : { order: nextOrder(board?.tasks), name: task.name.trim(), ...(task.description?.trim() ? { description: task.description.trim() } : {}) };
  await set(at(code, `tasks/${key}`), entry);
}

/** Changes a task's name, note and song in place. An empty note or song removes it. */
export const editTask = (code: string, id: string, name: string, description: string, song: string, unit: TaskUnit | null) =>
  update(at(code, `tasks/${id}`), { name: name.trim() || null, description: description.trim() || null, song: song || null, unit });

/** Takes a task off the list, with its points. The big screen keeps showing them until the next update. */
export const removeTask = (code: string, id: string) => remove(at(code, `tasks/${id}`));

/** Puts the task list in this order. */
export const reorderTasks = (code: string, ids: string[]) =>
  update(at(code, "tasks"), Object.fromEntries(ids.map((id, i) => [`${id}/order`, i])));

/**
 * The totals the big screen will show, caught up on every task but `task`: so that showing the scoreboard after
 * `task` opens on the scores from just before it, and the update ticks up that one task alone. Unchanged while
 * the scoreboard is up, where catching up would tick the totals in front of the room.
 */
function catchUp(board: Scoreboard | undefined, task: string, onScreen: boolean) {
  if (onScreen) return {};
  const shown: Record<string, unknown> = Object.fromEntries(
    Object.entries(currentPoints(board)).filter(([id, s]) => id !== task && s && Object.keys(s).length));
  if (board?.shown?.[task]) shown[task] = board.shown[task];
  return { shown };
}

/**
 * A contestant's points for a task; null takes them away (they get nothing for it). The first points given on a
 * task start it: every earlier task is caught up on the big screen (see catchUp).
 */
export const setPoints = (code: string, board: Scoreboard | undefined, onScreen: boolean, task: string, contestant: string, points: number | null) => {
  const starting = points !== null && !Object.keys(board?.tasks?.[task]?.scores ?? {}).length;
  return update(at(code), { [`tasks/${task}/scores/${contestant}`]: points, ...(starting ? catchUp(board, task, onScreen) : {}) });
};

/** ▶ Start on an app game in the task list: it starts that task (see catchUp). */
export const startTask = (code: string, board: Scoreboard | undefined, onScreen: boolean, task: string) => {
  const patch = catchUp(board, task, onScreen);
  return "shown" in patch ? update(at(code), patch) : Promise.resolve();
};

/** Puts the scoreboard on the big screen, at the totals last shown. */
export const showScoreboard = (code: string) => setDisplay(code, { step: "scoreboard" });

/** The big screen ticks up to every point given so far: they become the totals shown. */
export const updateScores = (code: string, board: Scoreboard | undefined) => {
  const now = Object.fromEntries(Object.entries(currentPoints(board)).filter(([, s]) => s && Object.keys(s).length));
  return set(at(code, "shown"), now);
};

/**
 * The end of the night, whatever's left unscored: the scoreboard goes up for one last update, then the
 * winner is decided on the points so far. Undone with `null`, if the host jumped the gun.
 */
export const declareWinner = (code: string, on = true) =>
  update(ref(db(), `sessions/${code}`), on
    ? { "scoreboard/final": true, display: { step: "scoreboard" } }
    : { "scoreboard/final": null });

export const lowerCurtain = (code: string) => setDisplay(code, { step: "curtain" });

/** Records who won the tiebreaker task (null clears it). Nothing changes on the big screen. */
export const setTiebreakerWinner = (code: string, contestant: string | null) =>
  set(at(code, "tiebreaker/winner"), contestant);

/** Fixes the tiebreaker task's name or note. It can't be removed: every party has one. */
export const editTiebreaker = (code: string, name: string, description: string, song: string) =>
  update(at(code, "tiebreaker"), { name: name.trim() || null, description: description.trim() || null, song: song || null });

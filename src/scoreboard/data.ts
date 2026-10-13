import { push, ref, remove, set, update } from "firebase/database";
import { db, storage } from "../firebase";
import { shrinkImage } from "../media";
import { setDisplay } from "../session";
import type { GameId, Scoreboard, ScoreboardTask } from "../types";
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

/** Changes a task's name and note in place. An empty note removes it. */
export const editTask = (code: string, id: string, name: string, description: string) =>
  update(at(code, `tasks/${id}`), { name: name.trim() || null, description: description.trim() || null });

/** Takes a task off the list, with its points. The big screen keeps showing them until the next update. */
export const removeTask = (code: string, id: string) => remove(at(code, `tasks/${id}`));

/** Puts the task list in this order. */
export const reorderTasks = (code: string, ids: string[]) =>
  update(at(code, "tasks"), Object.fromEntries(ids.map((id, i) => [`${id}/order`, i])));

/** A contestant's points for a task; null takes them away (they get nothing for it). */
export const setPoints = (code: string, task: string, contestant: string, points: number | null) =>
  set(at(code, `tasks/${task}/scores/${contestant}`), points);

/** Puts the scoreboard on the big screen, at the totals last shown. */
export const showScoreboard = (code: string) => setDisplay(code, { step: "scoreboard" });

/** The big screen ticks up to every point given so far: they become the totals shown. */
export const updateScores = (code: string, board: Scoreboard | undefined) => {
  const now = Object.fromEntries(Object.entries(currentPoints(board)).filter(([, s]) => s && Object.keys(s).length));
  return set(at(code, "shown"), now);
};

export const lowerCurtain = (code: string) => setDisplay(code, { step: "curtain" });

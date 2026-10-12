import type { SubmissionStatus } from "../../submission";
import { ref, update } from "firebase/database";
import { db } from "../../firebase";
import type { GameData, PhotosMedia, Session } from "../../types";

export const allPhotos = (session: Session): Record<string, PhotosMedia> => session.games?.photos?.media ?? {};

export const photoOf = (session: Session, uid: string): string | undefined => allPhotos(session)[uid]?.photo;

/** One photo per player: it's either in or it isn't (the upload finishes before its URL is published). */
export const photoStatus = (session: Session, uid: string): SubmissionStatus => (photoOf(session, uid) ? "submitted" : "waiting");

/** The player before / after `uid` who has a photo, in the order they joined (as on the "everyone" grid). */
export function neighbour(session: Session, uid: string, dir: 1 | -1): string | undefined {
  const order = Object.entries(session.players ?? {})
    .filter(([id]) => photoOf(session, id))
    .sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0))
    .map(([id]) => id);
  const i = order.indexOf(uid);
  return i < 0 ? undefined : order[i + dir];
}

/**
 * Starting a photo task from the scoreboard puts its own photos on: the set on now is put away under its
 * task, and this task's set (if it has been started before) comes back. Photos started without a task
 * are kept too: the first photo task started takes them on, or they're put away on their own.
 */
export async function switchPhotosTask(code: string, session: Session, task: string) {
  const now = session.games?.photos ?? {};
  if (now.task === task) return;
  const set = (d: GameData<PhotosMedia> | undefined) => ({ media: d?.media ?? null, unlocked: d?.unlocked ?? null, shown: d?.shown ?? null });
  const inUse = !!(now.media || now.unlocked || now.shown);
  const saved = now.sets?.[task];
  const u: Record<string, unknown> = { task };
  if (inUse && !now.task && !saved) {
    await update(ref(db(), `sessions/${code}/games/photos`), u);
    return;
  }
  if (inUse) u[`sets/${now.task ?? `untasked-${Date.now()}`}`] = set(now);
  u[`sets/${task}`] = null;
  // Player by player: the rules only let the host write each player's entry, not the whole map at once.
  for (const key of ["media", "unlocked", "shown"] as const) {
    for (const uid of Object.keys(now[key] ?? {})) u[`${key}/${uid}`] = null;
    for (const [uid, v] of Object.entries(saved?.[key] ?? {})) u[`${key}/${uid}`] = v;
  }
  await update(ref(db(), `sessions/${code}/games/photos`), u);
}

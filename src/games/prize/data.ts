import { ref, runTransaction, set } from "firebase/database";
import { db, storage } from "../../firebase";
import { shrinkImage } from "../../media";
import { shownTotals } from "../../scoreboard/scoring";
import { setDisplay } from "../../session";
import type { Session } from "../../types";

/** Each contestant's prize photos, in their order. */
export const prizePhotos = (session: Session): Record<string, string[]> => session.games?.prize?.photos ?? {};

/**
 * Who won the night, once every task on the run of show has points and the last of them is on the
 * scoreboard (or once the host has declared the winner, on what's been scored so far): the leader, or the winner of the tiebreaker task when the top is tied. A tie the
 * tiebreaker hasn't settled names who's tied; `tied` stays on a settled one, for its page.
 */
export function standing(session: Session): { winner: string; tied?: string[] } | { tied: string[] } | undefined {
  const board = session.scoreboard;
  const tasks = Object.values(board?.tasks ?? {});
  // Every task scored, or the host has declared the winner with some still unscored.
  if (!tasks.length || (!board?.final && tasks.some((t) => !Object.keys(t.scores ?? {}).length))) return undefined;
  if (!Object.keys(board?.shown ?? {}).length) return undefined;
  const totals = shownTotals(board);
  const top = Math.max(...Object.keys(board?.contestants ?? {}).map((c) => totals[c] ?? 0));
  const leaders = Object.keys(board?.contestants ?? {}).filter((c) => (totals[c] ?? 0) === top);
  if (leaders.length === 1) return { winner: leaders[0]! };
  // A tie settled by the tiebreaker task: its winner, as long as they're still among the tied.
  const settled = board?.tiebreaker?.winner;
  return settled && leaders.includes(settled) ? { winner: settled, tied: leaders } : { tied: leaders };
}

/**
 * Whose haul can go up: the night's winner (see `standing`). With no prize photos (a party from before
 * guests could send them, or nobody did), the haul is the winner alone, so the night still gets its winner.
 */
export function haulWinner(session: Session): string | undefined {
  const now = standing(session);
  return now && "winner" in now ? now.winner : undefined;
}

/**
 * The prize task's line on the run of show, from check-in onwards: "4 of 6 prizes in · waiting on Jo
 * and Tom". Names only while there are three or fewer to wait on, so the line stays one line.
 */
export function prizesIn(session: Session, list: (names: string[]) => string): string | undefined {
  const contestants = Object.entries(session.scoreboard?.contestants ?? {}).sort(([, a], [, b]) => a.order - b.order);
  if (!contestants.length) return undefined;
  const photos = prizePhotos(session);
  const missing = contestants.filter(([id]) => !photos[id]?.length).map(([, c]) => c.name);
  const n = contestants.length - missing.length;
  if (!missing.length) return `All ${n} prizes in`;
  return `${n} of ${contestants.length} prizes in${missing.length <= 3 ? ` · waiting on ${list(missing)}` : ""}`;
}

export const showHaul = (code: string) => setDisplay(code, { step: "haul" });

/** The contestant `uid` checked in as, if the party had a guest list. Prizes are kept by contestant. */
export const contestantOf = (session: Session, uid: string): string | undefined =>
  Object.entries(session.scoreboard?.contestants ?? {}).find(([, c]) => c.uid === uid)?.[0];

/** The party has a prize task: it's on, or on the run of show. Parties from before it was an app game don't. */
export const prizePlanned = (session: Session) =>
  session.game === "prize" || Object.values(session.scoreboard?.tasks ?? {}).some((t) => t.game === "prize");

export const presentedOf = (session: Session): Record<string, boolean> => session.games?.prize?.presented ?? {};

const photosAt = (code: string, id: string) => ref(db(), `sessions/${code}/games/prize/photos/${id}`);

/** Uploads one prize photo under the uploader's uid (the guest's, or the host's) and returns its URL. */
async function uploadPhoto(code: string, uid: string, file: File, n: number, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<string> {
  const body = await shrinkImage(file);
  signal?.throwIfAborted();
  const { getDownloadURL, ref: fileRef, uploadBytesResumable } = await import("firebase/storage");
  const task = uploadBytesResumable(fileRef(await storage(), `sessions/${code}/${uid}/prize-${Date.now()}-${n}`), body, {
    contentType: body.type || "image/jpeg",
    cacheControl: "public, max-age=31536000, immutable",
  });
  const cancel = () => task.cancel();
  signal?.addEventListener("abort", cancel);
  try {
    await new Promise<void>((resolve, reject) => {
      task.on("state_changed", (s) => onProgress(s.bytesTransferred / s.totalBytes), reject, resolve);
    });
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
  signal?.throwIfAborted();
  return getDownloadURL(task.snapshot.ref);
}

/**
 * A guest submits their prize: the new photos go up together, then the whole prize (photos already
 * sent, kept as they were, and the new ones) is saved in the guest's order in one write. Nothing is
 * submitted unless every photo made it.
 */
export async function submitPrize(code: string, uid: string, id: string, picks: { url: string; file?: File }[],
  onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<void> {
  const files = picks.filter((p) => p.file);
  const sent = files.map(() => 0);
  onProgress(0);
  const urls = await Promise.all(files.map((p, n) => uploadPhoto(code, uid, p.file!, n, (f) => {
    sent[n] = f;
    onProgress(sent.reduce((a, b) => a + b, 0) / sent.length);
  }, signal)));
  const uploaded = new Map(files.map((p, n) => [p, urls[n]!]));
  await set(photosAt(code, id), picks.map((p) => uploaded.get(p) ?? p.url));
}

/** Changes a prize's photos in one go, so photos a guest or another phone adds meanwhile aren't lost. */
const changePhotos = (code: string, id: string, change: (photos: string[]) => string[]) =>
  runTransaction(photosAt(code, id), (now: string[] | null) => change(now ?? []));

/** The host adds photos of a prize in the room: each joins the end once it's sent, so the ★ stays put. */
export const addPrizePhotos = (code: string, uid: string, id: string, files: File[], onProgress: (n: number, fraction: number) => void) =>
  Promise.all(files.map(async (file, n) => {
    const url = await uploadPhoto(code, uid, file, n, (f) => onProgress(n, f));
    await changePhotos(code, id, (photos) => [...photos, url]);
  }));

export const removePrizePhoto = (code: string, id: string, url: string) =>
  changePhotos(code, id, (photos) => photos.filter((p) => p !== url));

/** Moves the ★ to this photo: it becomes the prize's first, and its photo in the haul. */
export const starPrizePhoto = (code: string, id: string, url: string) =>
  changePhotos(code, id, (photos) => photos.includes(url) ? [url, ...photos.filter((p) => p !== url)] : photos);

/** The host starts presenting a prize: from now on only the host can change it. */
export const presentPrize = (code: string, id: string) => set(ref(db(), `sessions/${code}/games/prize/presented/${id}`), true);

/** One photo of a prize on the big screen. */
export const showPrizePhoto = (code: string, id: string, index: number) => setDisplay(code, { step: "photo", contestant: id, index });

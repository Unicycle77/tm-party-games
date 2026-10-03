import { ref as dbRef, set, update } from "firebase/database";
import { db, storage } from "./firebase";
import type { GameId } from "./types";

/**
 * Downscale phone photos (often 4000px+/8MB) so uploads are quick and the TV loads them instantly.
 * 1600px on the long side is still sharper than a 1080p screen ever shows a photo, and at quality 0.8
 * the files are ~40% smaller than 1920px @ 0.85.
 */
async function shrinkImage(file: File, maxDim = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (blob) return blob;
  } catch { /* e.g. unsupported format — upload the original */ }
  return file;
}

/**
 * Host phone: uploads this party's Taskmaster portrait (under the host phone's own uid, like any
 * upload) and publishes it for the big screen.
 */
export async function uploadPortrait(code: string, uid: string, file: File, onProgress: (fraction: number) => void): Promise<void> {
  const body = await shrinkImage(file);
  const { getDownloadURL, ref, uploadBytesResumable } = await import("firebase/storage");
  const task = uploadBytesResumable(ref(await storage(), `sessions/${code}/${uid}/portrait-${Date.now()}`), body, {
    contentType: body.type || "image/jpeg",
    cacheControl: "public, max-age=31536000, immutable",
  });
  await new Promise<void>((resolve, reject) => {
    task.on("state_changed", (s) => onProgress(s.bytesTransferred / s.totalBytes), reject, resolve);
  });
  await set(dbRef(db(), `sessions/${code}/portrait`), await getDownloadURL(task.snapshot.ref));
}

/** Uploads a file to Storage, then publishes its URL as the player's `kind` in that game. */
export async function submitMedia(
  code: string,
  game: GameId,
  uid: string,
  kind: string,
  file: Blob,
  onProgress: (fraction: number) => void,
  // alreadySized: frames we already resized/encoded ourselves. signal: aborting it cancels the upload.
  opts: { alreadySized?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const body = kind === "video" || opts.alreadySized ? file : await shrinkImage(file as File);
  const contentType = kind === "video" ? file.type || "video/mp4" : body.type || "image/jpeg";
  const { getDownloadURL, ref, uploadBytesResumable } = await import("firebase/storage");
  const task = uploadBytesResumable(ref(await storage(), `sessions/${code}/${uid}/${kind}-${Date.now()}`), body, {
    contentType,
    // File names are unique per upload, so a cached copy is never stale.
    cacheControl: "public, max-age=31536000, immutable",
  });
  const cancel = () => task.cancel();
  opts.signal?.addEventListener("abort", cancel);
  try {
    await new Promise<void>((resolve, reject) => {
      task.on("state_changed", (s) => onProgress(s.bytesTransferred / s.totalBytes), reject, resolve);
    });
  } finally {
    opts.signal?.removeEventListener("abort", cancel);
  }
  opts.signal?.throwIfAborted();
  const url = await getDownloadURL(task.snapshot.ref);
  await update(dbRef(db(), `sessions/${code}/games/${game}/media/${uid}`), { [kind]: url });
}

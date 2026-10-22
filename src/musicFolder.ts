/**
 * Music lives on the main-screen PC only: the host picks a folder with Chrome's
 * File System Access API and files are read straight from disk — nothing is uploaded.
 * The folder handle is remembered in IndexedDB so a refresh doesn't lose it
 * (Chrome may still ask for one click to re-grant access).
 */

interface FileHandle { kind: "file"; name: string; getFile(): Promise<File> }
export interface DirHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<FileHandle | DirHandle>;
  queryPermission?(o: { mode: "read" }): Promise<PermissionState>;
  requestPermission?(o: { mode: "read" }): Promise<PermissionState>;
}
export interface Track { title: string; handle: FileHandle }

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i;
const MAX_TRACKS = 1000;
const MAX_DEPTH = 4;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|mov)$/i;
/** A subfolder of the music folder holding Noisemaster's sounds: not songs, so the jukebox skips it. */
export const SOUNDS_FOLDER = "noisemaster";
/** The three subfolders of a task's transition (what plays when the host starts it): not songs either. Matched in any capitalisation. */
export const TRANSITION_MUSIC = "transition music";
export const TRANSITION_PICTURES = "transition pictures";
export const TRANSITION_VIDEOS = "transition videos";
const NOT_SONGS = [SOUNDS_FOLDER, TRANSITION_MUSIC, TRANSITION_PICTURES, TRANSITION_VIDEOS];
export const PICTURE_FILES = IMAGE_EXT;
export const VIDEO_FILES = VIDEO_EXT;

type Picker = (o?: { mode?: "read" }) => Promise<DirHandle>;
const picker = () => (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker;

export const folderPickerSupported = () => typeof picker() === "function";

/** Opens the folder picker. Resolves undefined if the user cancels. */
export async function pickFolder(): Promise<DirHandle | undefined> {
  try { return await picker()!({ mode: "read" }); }
  catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return undefined;
    throw e;
  }
}

/** Recursively lists audio files (title = file name without extension), sorted by title. Skips the sounds and transition folders. */
export async function scanFolder(dir: DirHandle, ext: RegExp = AUDIO_EXT, skip: string[] = NOT_SONGS): Promise<Track[]> {
  const tracks: Track[] = [];
  async function walk(d: DirHandle, depth: number) {
    for await (const entry of d.values()) {
      if (tracks.length >= MAX_TRACKS) return;
      if (entry.kind === "file") {
        if (ext.test(entry.name)) tracks.push({ title: entry.name.replace(/\.[^.]+$/, ""), handle: entry });
      } else if (depth < MAX_DEPTH && !(depth === 0 && skip.includes(entry.name.toLowerCase()))) {
        await walk(entry, depth + 1);
      }
    }
  }
  await walk(dir, 0);
  return tracks.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));
}

/** A subfolder of the music folder (any capitalisation), if it has one. */
export async function subfolder(dir: DirHandle, name: string): Promise<DirHandle | undefined> {
  for await (const entry of dir.values()) {
    if (entry.kind === "directory" && entry.name.toLowerCase() === name) return entry;
  }
  return undefined;
}

/** The music folder's sounds subfolder, if it has one. */
export const soundsFolder = (dir: DirHandle) => subfolder(dir, SOUNDS_FOLDER);


/** Song length in whole seconds (0 if it can't be read). Reads metadata only. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let finished = false;
    const finish = (seconds: number) => {
      if (finished) return;
      finished = true;
      URL.revokeObjectURL(url);
      audio.removeAttribute("src");
      resolve(seconds);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0);
    audio.onerror = () => finish(0);
    window.setTimeout(() => finish(0), 8000);
    audio.src = url;
  });
}

/** Durations (seconds) for every track, in the same order; unreadable ones are 0. */
export async function readDurations(tracks: Track[], concurrency = 6): Promise<number[]> {
  const out: number[] = new Array(tracks.length).fill(0);
  let next = 0;
  async function worker() {
    while (next < tracks.length) {
      const i = next++;
      try { out[i] = await readDuration(await tracks[i]!.handle.getFile()); } catch { out[i] = 0; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tracks.length) }, worker));
  return out;
}

// ---- remembering the folder across refreshes ----
const DB = "before-and-after";
const STORE = "handles";
const KEY = "musicFolder";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function rememberFolder(dir: DirHandle): Promise<void> {
  try { await idb("readwrite", (s) => s.put(dir, KEY)); } catch { /* private mode etc. — non-fatal */ }
}

export async function recallFolder(): Promise<DirHandle | undefined> {
  try { return (await idb<DirHandle | undefined>("readonly", (s) => s.get(KEY))) ?? undefined; } catch { return undefined; }
}

/** True if we can read the folder right now without prompting. */
export async function hasAccess(dir: DirHandle): Promise<boolean> {
  return (await dir.queryPermission?.({ mode: "read" })) === "granted";
}

/** Must be called from a click. */
export async function requestAccess(dir: DirHandle): Promise<boolean> {
  return (await dir.requestPermission?.({ mode: "read" })) === "granted";
}

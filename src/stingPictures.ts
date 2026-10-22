import type { Track } from "./musicFolder";

/**
 * A task's transition files live on the main-screen PC only, in subfolders of the music folder apart from the songs
 * (see transitions.ts). This is what the main screen found there, by file name: the music and the video as files to read
 * when they play, and each picture as a local URL, ready to show. Nothing is uploaded, so other screens never have them.
 *
 * A file that lives in OneDrive can take seconds to come down the first time it's read, so `warm` reads each into memory
 * as soon as the folder is read, and playing then never waits on the disk.
 */
interface Stored { handle: Track["handle"]; blob?: Blob }
let music = new Map<string, Stored>();
let videos = new Map<string, Stored>();
let pictures = new Map<string, string>();

/** Replaces what this screen has: the folders were just read. */
export function setTransitionFiles(next: { music: Map<string, Track["handle"]>; videos: Map<string, Track["handle"]>; pictures: Map<string, string> }) {
  for (const url of pictures.values()) URL.revokeObjectURL(url);
  const wrap = (m: Map<string, Track["handle"]>) => new Map([...m].map(([k, handle]) => [k, { handle }] as [string, Stored]));
  music = wrap(next.music); videos = wrap(next.videos); pictures = next.pictures;
}

/** The local URL of a transition picture, if this screen read it from its folder. */
export const stingPictureUrl = (name: string | undefined) => (name ? pictures.get(name) : undefined);
export const hasStingMusic = (title: string | undefined) => !!title && music.has(title);
export const hasStingVideo = (name: string | undefined) => !!name && videos.has(name);

const read = async (s: Stored | undefined): Promise<Blob | undefined> => s && (s.blob ?? await s.handle.getFile());
/** The music's file, from memory once warmed. */
export const stingMusicFile = (title: string | undefined) => read(title ? music.get(title) : undefined);
export const stingVideoFile = (name: string | undefined) => read(videos.get(name ?? ""));

const MAX_VIDEO = 200 * 1024 * 1024;
const MAX_VIDEOS_TOTAL = 600 * 1024 * 1024;

/**
 * Reads every transition file into memory, music first: it's short and the one most often wanted at once. Videos too, up to a size
 * (the rest are read when they play). A file that can't be read is left to play from disk.
 */
export async function warm() {
  const mine = { music, videos };
  const stale = () => mine.music !== music || mine.videos !== videos;
  const load = async (s: Stored, cap: number) => {
    try {
      const file = await s.handle.getFile();
      if (file.size <= cap) s.blob = new Blob([await file.arrayBuffer()], { type: file.type });
    } catch { /* left to play from disk */ }
  };
  for (const s of music.values()) { if (stale()) return; await load(s, MAX_VIDEO); }
  let total = 0;
  for (const s of videos.values()) {
    if (stale()) return;
    await load(s, Math.min(MAX_VIDEO, MAX_VIDEOS_TOTAL - total));
    total += s.blob?.size ?? 0;
  }
}

/** For the shots: stands in for a picture the main screen read. */
export const registerStingPicture = (name: string, url: string) => { pictures.set(name, url); };

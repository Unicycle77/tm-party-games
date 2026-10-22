import { type Track, readDurations } from "./musicFolder";

/**
 * A task's transition files live on the main-screen PC only, in subfolders of the music folder apart from the songs
 * (see transitions.ts). This is what the main screen found there, by file name: the music and the video as files to read
 * when they play, and each picture as a local URL, ready to show. Nothing is uploaded, so other screens never have them.
 *
 * A file that lives in OneDrive can take seconds to come down the first time it's read, so `warmFor` reads the ones the next
 * tasks want into memory ahead of Start, and playing then never waits on the disk.
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

const MAX_VIDEO = 150 * 1024 * 1024;
const MAX_MUSIC = 30 * 1024 * 1024;

/**
 * Reads the files the next tasks will want into memory, and lets go of the rest. Only those: a OneDrive file comes down in full the
 * first time it's read, so reading every transition when the folder is read would fill the connection and the stage's own pictures
 * would wait behind it. One file at a time, music first. Resolves with each video's length in seconds as it's read (for the host's lists).
 * A file that can't be read, or is too big, plays from disk when it's wanted.
 */
export async function warmFor(wanted: { music: string[]; video: string[] }, onVideoLength?: (name: string, seconds: number) => void) {
  const mine = { music, videos };
  const stale = () => mine.music !== music || mine.videos !== videos;
  for (const [name, s] of music) if (!wanted.music.includes(name)) delete s.blob;
  for (const [name, s] of videos) if (!wanted.video.includes(name)) delete s.blob;
  const load = async (s: Stored, cap: number) => {
    if (s.blob) return false;
    try {
      const file = await s.handle.getFile();
      if (file.size <= cap) { s.blob = new Blob([await file.arrayBuffer()], { type: file.type }); return true; }
    } catch { /* left to play from disk */ }
    return false;
  };
  for (const name of wanted.music) { if (stale()) return; const s = music.get(name); if (s) await load(s, MAX_MUSIC); }
  for (const name of wanted.video) {
    if (stale()) return;
    const s = videos.get(name);
    if (s && (await load(s, MAX_VIDEO)) && s.blob && onVideoLength) {
      const seconds = (await readDurations([{ title: name, handle: s.handle }]))[0];
      if (seconds) onVideoLength(name, seconds);
    }
  }
}

/** For the shots: stands in for a picture the main screen read. */
export const registerStingPicture = (name: string, url: string) => { pictures.set(name, url); };

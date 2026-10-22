import {
  type DirHandle, PICTURE_FILES, type Track, TRANSITION_MUSIC, TRANSITION_PICTURES, TRANSITION_VIDEOS, VIDEO_FILES,
  readDurations, scanFolder, subfolder,
} from "./musicFolder";
import { publishTransitions } from "./session";
import { setSkippedPictures, setTransitionFiles } from "./stingPictures";

const MAX_PICTURES = 60;
const HEIC = /\.(heic|heif)$/i;
const AUDIO = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i;

/** A picture's file as something the browser can show: an iPhone's HEIC becomes a JPEG (in memory; the file isn't touched). */
async function showable(file: File): Promise<Blob> {
  if (!HEIC.test(file.name)) return file;
  // Chrome on a Mac may decode HEIC itself; if not, a converter is loaded (only now, as it's large).
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const jpeg = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.9));
    if (jpeg) return jpeg;
  } catch { /* not decodable here: use the converter */ }
  const { heicTo } = await import("heic-to");
  return heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
}

/**
 * Main screen: reads a freshly loaded music folder's three transition subfolders (music, pictures, videos), keeps what it
 * found for the sting to play, and publishes the names and lengths so the host's phone can pick from them with the PC off.
 * A missing folder is an empty list. Each folder is scanned on its own: the jukebox's song list never has them.
 */
export async function loadTransitions(code: string, music: DirHandle) {
  const scan = async (name: string, ext: RegExp): Promise<Track[]> => {
    const dir = await subfolder(music, name);
    return dir ? await scanFolder(dir, ext, []) : [];
  };
  const [sounds, pics, vids] = await Promise.all([scan(TRANSITION_MUSIC, AUDIO), scan(TRANSITION_PICTURES, PICTURE_FILES), scan(TRANSITION_VIDEOS, VIDEO_FILES)]);
  // Pictures and videos are listed by their whole file name (the name is how a task keeps them); music by its title, as songs are.
  const pictures = new Map<string, string>();
  const skipped: string[] = [];
  for (const t of pics.slice(0, MAX_PICTURES)) {
    try { pictures.set(t.handle.name, URL.createObjectURL(await showable(await t.handle.getFile()))); } catch { skipped.push(t.handle.name); }
  }
  setSkippedPictures(skipped);
  setTransitionFiles({
    music: new Map(sounds.map((t) => [t.title, t.handle])),
    videos: new Map(vids.map((t) => [t.handle.name, t.handle])),
    pictures,
  });
  await publishTransitions(code, { music: sounds.map((t) => t.title), pictures: [...pictures.keys()], videos: vids.map((t) => t.handle.name) });
  // Music lengths come once read, as the songs' do. A video's is read only when it's about to be wanted (see StingDriver): reading it
  // here would bring every video down from OneDrive at once.
  await publishTransitions(code, { musicLengths: await readDurations(sounds) });
}

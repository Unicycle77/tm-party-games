import {
  type DirHandle, PICTURE_FILES, type Track, TRANSITION_MUSIC, TRANSITION_PICTURES, TRANSITION_VIDEOS, VIDEO_FILES,
  readDurations, scanFolder, subfolder,
} from "./musicFolder";
import { publishTransitions } from "./session";
import { setTransitionFiles } from "./stingPictures";

const MAX_PICTURES = 60;
const AUDIO = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i;

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
  for (const t of pics.slice(0, MAX_PICTURES)) {
    try { pictures.set(t.handle.name, URL.createObjectURL(await t.handle.getFile())); } catch { /* unreadable: left out */ }
  }
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

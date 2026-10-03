import { useEffect, useState } from "react";
import { type DirHandle, type Track, scanFolder, soundsFolder } from "../../musicFolder";
import { publishSounds } from "./data";

/*
 * Noisemaster's sounds live on the main-screen PC only, like the music: a "Noisemaster" subfolder of the
 * music folder, one file per word ("hello.mp3" is "hello"). The jukebox loads them along with the songs;
 * only their names go into the session, for the host to build the board from.
 */
let library = new Map<string, Track["handle"]>();
const listeners = new Set<() => void>();

/** Main screen: reads the sounds subfolder of a freshly loaded music folder and publishes their names. */
export async function loadSounds(code: string, music: DirHandle) {
  const dir = await soundsFolder(music);
  const tracks = dir ? await scanFolder(dir) : [];
  // The first file with each name (ignoring capitals) wins.
  const next = new Map<string, Track["handle"]>();
  for (const t of tracks) if (![...next.keys()].some((k) => k.toLowerCase() === t.title.toLowerCase())) next.set(t.title, t.handle);
  library = next;
  buffers.clear();
  listeners.forEach((l) => l());
  await publishSounds(code, [...next.keys()]);
}

/** How many sounds this screen can play (re-renders when the folder is reloaded). */
export function useSoundCount(): number {
  const [count, setCount] = useState(library.size);
  useEffect(() => {
    const l = () => setCount(library.size);
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
  }, []);
  return count;
}

// Decoded once and played through Web Audio, so a press sounds straight away.
let context: AudioContext | undefined;
const buffers = new Map<string, Promise<AudioBuffer | undefined>>();
let playing: AudioBufferSourceNode | undefined;
const audio = () => (context ??= new AudioContext());

function decode(name: string): Promise<AudioBuffer | undefined> {
  let buffer = buffers.get(name);
  if (!buffer) {
    const handle = library.get(name);
    buffer = handle
      ? handle.getFile().then((f) => f.arrayBuffer()).then((b) => audio().decodeAudioData(b)).catch(() => undefined)
      : Promise.resolve(undefined);
    buffers.set(name, buffer);
  }
  return buffer;
}

/** Decodes a board's sounds ahead of the first press. */
export const prepareSounds = (names: string[]) => { names.forEach((n) => void decode(n)); };

/** Plays a sound, cutting off the one before it so the words don't pile up. A word with no file is spoken instead. */
export async function playSound(name: string) {
  if (!library.has(name)) { speak(name); return; }
  const buffer = await decode(name);
  if (!buffer) { speak(name); return; }
  const ctx = audio();
  if (ctx.state === "suspended") void ctx.resume();
  try { playing?.stop(); } catch { /* already finished */ }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  playing = source;
}

/** Stand-in for a missing sound file: the browser's speech synthesiser says the word (for testing without recordings). */
function speak(word: string) {
  if (!("speechSynthesis" in window)) return;
  try { playing?.stop(); } catch { /* already finished */ }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
}

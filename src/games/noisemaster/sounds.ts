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

/** The file's own name for a word, whatever capitals it was typed with. */
const fileFor = (word: string) => [...library.keys()].find((k) => k.toLowerCase() === word.toLowerCase());

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
export const prepareSounds = (names: string[]) => { names.forEach((n) => { const f = fileFor(n); if (f) void decode(f); }); };

/** Plays a sound, cutting off the one before it so the words don't pile up. A word with no file is spoken instead. */
export async function playSound(name: string, inPhrase: boolean) {
  const file = fileFor(name);
  if (!file) { speak(name, inPhrase); return; }
  const buffer = await decode(file);
  if (!buffer) { speak(name, inPhrase); return; }
  const ctx = audio();
  if (ctx.state === "suspended") void ctx.resume();
  try { playing?.stop(); } catch { /* already finished */ }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  playing = source;
}

/**
 * Stand-in for a missing sound file: the browser's speech synthesiser says the word (for testing without
 * recordings). The phrase's words get one voice and the decoys another, so they can be told apart by ear.
 */
function speak(word: string, inPhrase: boolean) {
  if (!("speechSynthesis" in window)) return;
  try { playing?.stop(); } catch { /* already finished */ }
  const synth = window.speechSynthesis;
  synth.cancel();
  const say = new SpeechSynthesisUtterance(word);
  // English voices, the usual good ones first (macOS's alphabetical list starts with novelty voices); the second
  // voice (or the first, deeper, if there's only one) is for decoys.
  const liked = ["zira", "david", "samantha", "daniel", "karen", "alex", "moira", "aria", "guy", "google us english", "google uk english"];
  const rank = (v: SpeechSynthesisVoice) => { const i = liked.findIndex((n) => v.name.toLowerCase().includes(n)); return i < 0 ? liked.length : i; };
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en")).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  const voice = inPhrase ? voices[0] : voices[1] ?? voices[0];
  if (voice) say.voice = voice;
  if (!inPhrase) say.pitch = voices.length > 1 ? 1 : 0.5;
  synth.speak(say);
}

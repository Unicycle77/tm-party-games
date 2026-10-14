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

/** Whether this screen has a sound file for a word (if not, the word is spoken). */
export const hasSound = (word: string) => !!fileFor(word);

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
 *
 * Chrome on Windows is fussy here: it drops an utterance spoken straight after cancel(), can get stuck paused,
 * stops speaking if the utterance is garbage collected, and its Google voices are online ones that can fail
 * silently. So: cancel only when something is talking and speak a moment later, resume first, keep hold of the
 * utterance, prefer voices on the device, and if a voice fails, say the word again in the default one.
 */
let saying: SpeechSynthesisUtterance | undefined;

// Chrome loads its voices in the background: ask early so the first word already has them.
if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices());
}

export function speak(word: string, inPhrase: boolean) {
  if (!("speechSynthesis" in window)) return;
  try { playing?.stop(); } catch { /* already finished */ }
  const synth = window.speechSynthesis;
  const busy = synth.speaking || synth.pending;
  if (busy) synth.cancel();
  // British men (Daniel, Arthur and Oliver on Apple devices, George and Ryan on Windows, Google's UK male): the phrase
  // gets the first and decoys the second, voices on the device ahead of online ones. With only one on the device,
  // decoys reuse it, pitched lower to tell them apart.
  const male = ["daniel", "arthur", "oliver", "george", "ryan", "thomas", "male"];
  const rank = (v: SpeechSynthesisVoice) => (v.localService ? 0 : male.length) + male.findIndex((n) => v.name.toLowerCase().includes(n));
  const british = synth.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-") === "en-gb"
    && male.some((n) => v.name.toLowerCase().includes(n)) && !v.name.toLowerCase().includes("female"))
    .sort((a, b) => rank(a) - rank(b));
  const voice = inPhrase ? british[0] : british[1] ?? british[0];
  const utterance = (withVoice: boolean) => {
    const say = new SpeechSynthesisUtterance(word);
    if (withVoice && voice) { say.voice = voice; say.lang = voice.lang; }
    if (!inPhrase && british.length < 2) say.pitch = 0.6;
    say.onerror = (e) => {
      // A voice that fails (an online one offline, say) gets one more go in the device's default voice.
      if (withVoice && voice && saying === say && e.error !== "interrupted" && e.error !== "canceled") start(utterance(false));
    };
    return say;
  };
  const start = (say: SpeechSynthesisUtterance) => {
    saying = say;
    synth.resume();
    synth.speak(say);
  };
  const first = utterance(true);
  saying = first;
  if (busy) setTimeout(() => { if (saying === first) start(first); }, 50);
  else start(first);
}

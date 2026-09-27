import { useEffect, useState } from "react";

/*
 * The buzzer's sound, made in the browser (two slightly detuned saw waves, like an old door buzzer).
 * Browsers keep audio off until the page has had a click, so one click anywhere turns it on.
 */
let ctx: AudioContext | undefined;
const audio = () => (ctx ??= new AudioContext());

export function playBuzz(ms: number) {
  const a = audio();
  if (a.state === "suspended") void a.resume();
  const start = a.currentTime;
  const end = start + ms / 1000;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
  gain.gain.setValueAtTime(0.25, end - 0.05);
  gain.gain.linearRampToValueAtTime(0, end);
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.connect(gain).connect(a.destination);
  for (const hz of [110, 113]) {
    const osc = a.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = hz;
    osc.connect(filter);
    osc.start(start);
    osc.stop(end);
  }
}

/** True while the browser is keeping the buzzer quiet (until the page gets a click). */
export function useSoundBlocked(): boolean {
  const [blocked, setBlocked] = useState(() => audio().state === "suspended");
  useEffect(() => {
    const a = audio();
    const update = () => setBlocked(a.state === "suspended");
    const unlock = () => void a.resume().then(update, () => {});
    a.addEventListener("statechange", update);
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    update();
    return () => {
      a.removeEventListener("statechange", update);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  return blocked;
}

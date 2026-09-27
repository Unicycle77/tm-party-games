import { onValue, ref, remove, serverTimestamp, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import type { Session, SmileGame } from "../../types";

/** The secret: how long after someone stops smiling the light goes on, and for how long. */
export const DELAY_MS = 2000;
export const ON_MS = 1000;

export const TITLE = "The Light Bulb";
/** The task, as the players get it (after the original Taskmaster task). */
export const BRIEF = "Tell the host why the light bulb turns on. You may not touch or tamper with the light bulb. Fastest correct answer wins.";
export const ANSWER = `It's smiling! The light goes on ${DELAY_MS / 1000} seconds after someone stops smiling.`;

export const smileOf = (session: Session): SmileGame => session.games?.smile ?? {};

/** The camera turns the light on unless the host has paused it. */
export const isArmed = (game: SmileGame) => game.armed !== false;

const path = (code: string, key: keyof SmileGame | "timer/stoppedAt") => ref(db(), `sessions/${code}/games/smile/${key}`);

/** Turns the light on, on every screen. */
export const lightNow = (code: string) => set(path(code, "litAt"), Date.now());

/** The same, after the delay (as if someone had just stopped smiling). Returns the timer. */
export const lightLater = (code: string) => window.setTimeout(() => void lightNow(code), DELAY_MS);

export const setArmed = (code: string, armed: boolean) => set(path(code, "armed"), armed);
export const setRevealed = (code: string, revealed: boolean) => set(path(code, "revealed"), revealed);
export const setCamera = (code: string, camera: SmileGame["camera"] | null) => set(path(code, "camera"), camera);

/** The task's clock, kept in server time so every screen shows the same count. */
export const startTimer = (code: string) => set(path(code, "timer"), { startedAt: serverTimestamp() });
export const stopTimer = (code: string) => set(path(code, "timer/stoppedAt"), serverTimestamp());
export const resetTimer = (code: string) => remove(path(code, "timer"));

/**
 * Whether the light is on: for a second each time `litAt` changes (lighting it again restarts the second).
 * The value already there when a screen opens is from before, so it doesn't light up.
 */
export function useLit(litAt: number | undefined): boolean {
  const seen = useRef(litAt);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (litAt === undefined || litAt === seen.current) { setLit(false); return; }
    seen.current = litAt;
    setLit(true);
    const off = window.setTimeout(() => setLit(false), ON_MS);
    return () => window.clearTimeout(off);
  }, [litAt]);
  return lit;
}

/** Milliseconds on the task's clock, ticking while it runs; undefined before it's started. */
export function useElapsed(timer: SmileGame["timer"]): number | undefined {
  // How far this device's clock is from the server's, so the count matches everywhere.
  const [offset, setOffset] = useState(0);
  useEffect(() => onValue(ref(db(), ".info/serverTimeOffset"), (s) => setOffset((s.val() as number | null) ?? 0)), []);
  const [now, setNow] = useState(Date.now());
  const running = !!timer?.startedAt && !timer.stoppedAt;
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [running]);
  if (!timer?.startedAt) return undefined;
  return Math.max(0, (timer.stoppedAt ?? now + offset) - timer.startedAt);
}

/** 83000 → "1:23". */
export const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** What the main screen's camera sees, in words, for the host. `onStage`: the light bulb is on the main screen. */
export function cameraText(game: SmileGame, onStage: boolean): string {
  const camera = game.camera;
  const paused = isArmed(game) ? "" : " Paused: it won't turn the light on.";
  if (camera?.error) return `Camera: ${camera.error}`;
  if (!camera) return onStage ? "Camera: starting…" : "The camera starts when the light bulb is on the main screen.";
  if (camera.starting) return `Camera: starting…${paused}`;
  const faces = camera.faces ?? 0;
  return `Camera sees ${faces} ${faces === 1 ? "face" : "faces"}, ${camera.smiling ?? 0} smiling.${paused}`;
}

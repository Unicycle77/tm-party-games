import { ref, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import type { Session, SmileGame } from "../../types";

/** The secret: how long after someone stops smiling the light and buzzer go on, and for how long. */
export const DELAY_MS = 3000;
export const ON_MS = 1000;

export const TITLE = "What's the Buzz?";
export const ANSWER = `It's smiling! The light and buzzer go on ${DELAY_MS / 1000} seconds after someone stops smiling.`;

export const smileOf = (session: Session): SmileGame => session.games?.smile ?? {};

/** The camera sets the buzzer off unless the host has paused it. */
export const isArmed = (game: SmileGame) => game.armed !== false;

const path = (code: string, key: keyof SmileGame) => ref(db(), `sessions/${code}/games/smile/${key}`);

/** Turns the light and buzzer on, on every screen. */
export const buzzNow = (code: string) => set(path(code, "buzzAt"), Date.now());

/** The same, after the delay (as if someone had just stopped smiling). Returns the timer. */
export const buzzLater = (code: string) => window.setTimeout(() => void buzzNow(code), DELAY_MS);

export const setArmed = (code: string, armed: boolean) => set(path(code, "armed"), armed);
export const setRevealed = (code: string, revealed: boolean) => set(path(code, "revealed"), revealed);
export const setCamera = (code: string, camera: SmileGame["camera"] | null) => set(path(code, "camera"), camera);

/**
 * Whether the light is on: for a second each time `buzzAt` changes (a second buzz restarts the second).
 * The value already there when a screen opens is an old buzz, so it doesn't light up.
 */
export function useLit(buzzAt: number | undefined, onBuzz?: () => void): boolean {
  const seen = useRef(buzzAt);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (buzzAt === undefined || buzzAt === seen.current) { setLit(false); return; }
    seen.current = buzzAt;
    setLit(true);
    onBuzz?.();
    const off = window.setTimeout(() => setLit(false), ON_MS);
    return () => window.clearTimeout(off);
  }, [buzzAt]);
  return lit;
}

/** What the main screen's camera sees, in words, for the host. `onStage`: the light bulb is on the main screen. */
export function cameraText(game: SmileGame, onStage: boolean): string {
  const camera = game.camera;
  const paused = isArmed(game) ? "" : " Paused: it won't set the buzzer off.";
  if (camera?.error) return `Camera: ${camera.error}`;
  if (!camera) return onStage ? "Camera: starting…" : "The camera starts when the light bulb is on the main screen.";
  if (camera.starting) return `Camera: starting…${paused}`;
  const faces = camera.faces ?? 0;
  return `Camera sees ${faces} ${faces === 1 ? "face" : "faces"}, ${camera.smiling ?? 0} smiling.${paused}`;
}

import { get, ref, set, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { PUBLIC_URL, db } from "../firebase";
import { JoinError, ensureSignedIn } from "../session";
import type { LightState, Session } from "../types";
import { type Mode, type Trigger, findMode, findTrigger } from "./triggers";

/** How long after someone does the trigger the light goes on, and for how long. */
export const DELAY_MS = 2000;
export const ON_MS = 1000;

export const lightOf = (session: Session): LightState => session.light ?? {};

/** The camera turns the light on unless the host has paused it. */
export const isArmed = (light: LightState) => light.armed !== false;

const path = (code: string, key: keyof LightState) => ref(db(), `sessions/${code}/light/${key}`);

/** Turns the light on (the light page flashes it, and its Hue lamp). */
export const lightNow = (code: string) => set(path(code, "litAt"), Date.now());

/** The same, after the delay (as if someone had just stopped smiling). Returns the timer. */
export const lightLater = (code: string) => window.setTimeout(() => void lightNow(code), DELAY_MS);

export const setArmed = (code: string, armed: boolean) => set(path(code, "armed"), armed);
export const setTrigger = (code: string, trigger: string) => set(path(code, "trigger"), trigger);
/** The secret trigger the host has picked (in "One secret" mode). */
export const triggerOf = (light: LightState) => findTrigger(light.trigger);

/** The mode with a bulb per trigger ("Smiles", "All at once"), or undefined for "One secret" (the red bulb). */
export const modeOf = (light: LightState): Mode | undefined => findMode(light.mode);
export const setMode = (code: string, mode: Mode["id"] | null) => set(path(code, "mode"), mode);
/** The triggers the camera watches for. */
export const watchedTriggers = (light: LightState): Trigger[] => modeOf(light)?.bulbs.map((b) => b.trigger) ?? [triggerOf(light)];

/** A mode with several bulbs: turns one trigger's bulb on, now or after the delay (returns the timer). */
export const lightOneNow = (code: string, id: string) => set(ref(db(), `sessions/${code}/light/lit/${id}`), Date.now());
export const lightOneLater = (code: string, id: string) => window.setTimeout(() => void lightOneNow(code, id), DELAY_MS);
/** Every bulb of a mode (a test); a millisecond apart, so they take their turns in the mode's order. */
export const lightAllNow = (code: string, mode: Mode) => {
  const now = Date.now();
  return update(ref(db(), `sessions/${code}/light/lit`), Object.fromEntries(mode.bulbs.map((b, i) => [b.trigger.id, now + i])));
};
export const setCamera = (code: string, camera: LightState["camera"] | null) => set(path(code, "camera"), camera);

/** The light page: becomes the session's light computer (one per session; this browser may already be it). */
export async function claimLight(rawCode: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  const user = await ensureSignedIn();
  if (!(await get(ref(db(), `sessions/${code}/hostUid`))).exists()) throw new JoinError(`No session found for code ${code}.`);
  const current = (await get(ref(db(), `sessions/${code}/lightUid`))).val() as string | null;
  if (current === user.uid) return code;
  if (current) throw new JoinError("Another computer is already running the light. The host can reset it from their phone.");
  try { await set(ref(db(), `sessions/${code}/lightUid`), user.uid); }
  catch { throw new JoinError("Couldn't start the light. Try again."); }
  return code;
}

/**
 * The light page giving up its slot, or the host resetting it so another computer can take over.
 * Clears what the camera saw in the same write (the page can't once it has given up the slot).
 */
export const releaseLight = (code: string) => update(ref(db(), `sessions/${code}`), { lightUid: null, "light/camera": null });

/** The dark pause between two flashes, so back-to-back ones can be told apart. */
export const GAP_MS = 400;
/** The flash of the one red bulb ("One secret" mode); in the other modes a flash is a trigger's id. */
export const ONE = "one";

/**
 * Which light is flashing right now: ONE, a trigger's id, or undefined. Each lighting event (a new time in
 * `litAt`, or in `lit` in a mode with several bulbs) gets its full second and a short gap after it;
 * events that arrive meanwhile wait their turn, in order, and never cut a flash short. A light that's
 * already waiting isn't queued twice, so a busy moment can't build up a backlog. Times already there
 * when the page opens are old, and so are other modes'.
 */
export function useFlash(light: LightState): string | undefined {
  const mode = modeOf(light);
  const seen = useRef({ litAt: light.litAt, lit: light.lit ?? {}, mode: mode?.id });
  const queue = useRef<string[]>([]);
  const playing = useRef(false);
  const timer = useRef<number>();
  const [current, setCurrent] = useState<string>();

  const playNext = useRef(() => {
    const id = queue.current.shift();
    if (id === undefined) { playing.current = false; return; }
    playing.current = true;
    setCurrent(id);
    timer.current = window.setTimeout(() => {
      setCurrent(undefined);
      timer.current = window.setTimeout(playNext.current, GAP_MS);
    }, ON_MS);
  });

  useEffect(() => {
    // Switching modes drops what was waiting for the old one.
    if (seen.current.mode !== mode?.id) queue.current = [];
    const fresh: [string, number][] = [];
    if (!mode && light.litAt !== undefined && light.litAt !== seen.current.litAt) fresh.push([ONE, light.litAt]);
    for (const b of mode?.bulbs ?? []) {
      const at = light.lit?.[b.trigger.id];
      if (at !== undefined && at !== seen.current.lit[b.trigger.id]) fresh.push([b.trigger.id, at]);
    }
    seen.current = { litAt: light.litAt, lit: light.lit ?? {}, mode: mode?.id };
    fresh.sort(([, a], [, b]) => a - b);
    for (const [id] of fresh) if (!queue.current.includes(id)) queue.current.push(id);
    if (!playing.current) playNext.current();
  }, [light.litAt, light.lit, mode?.id]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return current;
}

/** What the light computer's camera sees, in words, for the host (this gives the secret away). */
export function cameraText(session: Session): string {
  const light = lightOf(session);
  const camera = light.camera;
  const paused = isArmed(light) ? "" : " Paused: it won't turn the light on.";
  if (!session.lightUid) return `Not running. Open ${PUBLIC_URL.replace(/^https?:\/\//, "")}/light on the computer with the webcam.`;
  if (camera?.error) return `Camera: ${camera.error}`;
  if (!camera) return "The light computer isn't responding. Check that its /light page is still open.";
  if (camera.starting) return `Camera: starting…${paused}`;
  const people = camera.people ?? 0;
  const seen = `Camera sees ${people} ${people === 1 ? "person" : "people"}`;
  // Per state ("smiling" is shared by the two smile triggers, "with an arm up" by the two arm ones).
  const states = new Map<string, number>();
  for (const t of watchedTriggers(light)) states.set(t.state, camera.each?.[t.id] ?? 0);
  if (!modeOf(light)) return `${seen}, ${[...states.values()][0] ?? 0} ${triggerOf(light).state}.${paused}`;
  return `${seen}: ${[...states].map(([state, n]) => `${n} ${state}`).join(", ")}.${paused}`;
}

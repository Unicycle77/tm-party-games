import { get, ref, set, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { PUBLIC_URL, db } from "../firebase";
import { JoinError, ensureSignedIn } from "../session";
import type { LightState, Session } from "../types";
import { TRIGGERS, type Trigger, findTrigger } from "./triggers";

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

/** "All at once": every trigger, each with its own coloured bulb. */
export const isAllMode = (light: LightState) => light.mode === "all";
export const setAllMode = (code: string, all: boolean) => set(path(code, "mode"), all ? "all" : null);
/** The triggers the camera watches for. */
export const watchedTriggers = (light: LightState): Trigger[] => (isAllMode(light) ? TRIGGERS : [triggerOf(light)]);

/** "All at once": turns one trigger's bulb on, now or after the delay (returns the timer). */
export const lightOneNow = (code: string, id: string) => set(ref(db(), `sessions/${code}/light/lit/${id}`), Date.now());
export const lightOneLater = (code: string, id: string) => window.setTimeout(() => void lightOneNow(code, id), DELAY_MS);
/** "All at once": every bulb on at once (a test). */
export const lightAllNow = (code: string) =>
  update(ref(db(), `sessions/${code}/light/lit`), Object.fromEntries(TRIGGERS.map((t) => [t.id, Date.now()])));
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

/**
 * Whether the light is on: for a second each time `litAt` changes (lighting it again restarts the second).
 * The value already there when the page opens is from before, so it doesn't light up.
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

/**
 * "All at once": which bulbs are on, by trigger id, with when each came on (so the latest one is known).
 * Each stays on for a second after its time in `lit` changes; times already there when the page opens are old.
 */
export function useLitBulbs(lit: Record<string, number> | undefined): Record<string, number> {
  const seen = useRef(lit ?? {});
  const [on, setOn] = useState<Record<string, number>>({});
  const timers = useRef<Record<string, number>>({});
  useEffect(() => {
    const now = lit ?? {};
    for (const [id, at] of Object.entries(now)) {
      if (seen.current[id] === at) continue;
      window.clearTimeout(timers.current[id]);
      setOn((o) => ({ ...o, [id]: Date.now() }));
      timers.current[id] = window.setTimeout(() => setOn(({ [id]: _, ...rest }) => rest), ON_MS);
    }
    seen.current = now;
  }, [lit]);
  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);
  return on;
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
  if (!isAllMode(light)) return `${seen}, ${[...states.values()][0] ?? 0} ${triggerOf(light).state}.${paused}`;
  return `${seen}: ${[...states].map(([state, n]) => `${n} ${state}`).join(", ")}.${paused}`;
}

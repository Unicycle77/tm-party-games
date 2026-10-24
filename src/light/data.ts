import { get, ref, set, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { PUBLIC_URL, db } from "../firebase";
import { JoinError, ensureSignedIn } from "../session";
import { enterPoints, lightPlaces, taskFor } from "../scoreboard/data";
import type { LightState, Session, StageLightAsk, StageLightInfo } from "../types";
import { type Mode, type Trigger, findMode, findTrigger } from "./triggers";

/** How long after someone does the trigger the light goes on, and for how long. */
export const DELAY_MS = 2000;
export const ON_MS = 1000;
/** The rainbow spin: each bulb in turn for this long, twice round. */
export const SPIN_STEP_MS = 170;
export const SPIN_LAPS = 2;

export const lightOf = (session: Session): LightState => session.light ?? {};

/** The light is on (and its camera watching) only once the host has switched it on. */
export const isArmed = (light: LightState) => light.armed === true;

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
export const watchedTriggers = (light: LightState): Trigger[] => {
  const mode = modeOf(light);
  return mode ? [...mode.bulbs.map((b) => b.trigger), ...(mode.spins ?? [])] : [triggerOf(light)];
};
/** How long a mode's rainbow spin lasts. */
export const spinMs = (mode: Mode) => SPIN_STEP_MS * mode.bulbs.length * SPIN_LAPS;

/** A mode with several bulbs: turns one trigger's bulb on, now or after the delay (returns the timer). */
export const lightOneNow = (code: string, id: string) => set(ref(db(), `sessions/${code}/light/lit/${id}`), Date.now());
export const lightOneLater = (code: string, id: string) => window.setTimeout(() => void lightOneNow(code, id), DELAY_MS);
/** Every bulb of a mode in turn, a little slower than the light may change (a test). */
export const lightAllNow = (code: string, mode: Mode) =>
  mode.bulbs.forEach((b, i) => window.setTimeout(() => void lightOneNow(code, b.trigger.id), i * (MIN_CHANGE_MS + 100)));

/** Who has worked out the secret, first to last. */
export const gotOrder = (light: LightState) =>
  Object.entries(light.got ?? {}).sort(([, a], [, b]) => a - b).map(([c]) => c);
/**
 * Saves a new order, and while the light is on the task list, the places on its task too (1 for whoever
 * got it first), so the scoreboard works out the points.
 */
function saveGot(code: string, session: Session, got: Record<string, number>) {
  const board = session.scoreboard;
  const id = taskFor(board, "light");
  const saving = set(path(code, "got"), Object.keys(got).length ? got : null);
  if (!id) return saving;
  const places = lightPlaces(got, board);
  const results = Object.fromEntries(Object.keys({ ...board?.tasks?.[id]?.results, ...places }).map((c) => [c, places[c] ?? null]));
  return Promise.all([saving, enterPoints(code, board, session.display?.step === "scoreboard", id, { results })]);
}
/** Marks a contestant as the next to work it out. */
export function markGot(code: string, session: Session, contestant: string) {
  const got = lightOf(session).got ?? {};
  return saveGot(code, session, { ...got, [contestant]: Math.max(0, ...Object.values(got)) + 1 });
}
/** Moves a contestant to a place (1st is 1); the others shift to make room. */
export function moveGot(code: string, session: Session, contestant: string, place: number) {
  const order = gotOrder(lightOf(session)).filter((c) => c !== contestant);
  order.splice(place - 1, 0, contestant);
  return saveGot(code, session, Object.fromEntries(order.map((c, i) => [c, i + 1])));
}
/** Takes a contestant off the list, as if they'd never been marked. */
export function unmarkGot(code: string, session: Session, contestant: string) {
  const { [contestant]: _, ...got } = lightOf(session).got ?? {};
  return saveGot(code, session, got);
}

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
export const releaseLight = (code: string) => update(ref(db(), `sessions/${code}`), {
  lightUid: null, "light/camera": null, "light/onStage": null, "light/stage": null, "light/setup": null, "light/ask": null,
});

/** The host phone starting the light on the main screen, with the setup checklist open. */
export const startOnStage = (code: string) => update(ref(db(), `sessions/${code}/light`), { onStage: true, setup: true });
/** The phone's setup checklist opening or closing (the main screen then sends where it finds heads, or stops). */
export const setSetup = (code: string, open: boolean) => set(path(code, "setup"), open || null);
/** Asks the main screen to change its camera or Hue lamp (kept in its browser), or to flash the lamp. */
export const askStage = (code: string, kind: StageLightAsk["kind"], value?: string) =>
  set(path(code, "ask"), { id: Date.now(), kind, ...(value !== undefined && { value }) });
/** The main screen doing what the phone asked, or giving up on it. */
export const clearAsk = (code: string) => set(path(code, "ask"), null);
export const setStageInfo = (code: string, info: StageLightInfo | null) => set(path(code, "stage"), info);

/** The light is running on the main screen (not on a computer at /light). */
export const runsOnStage = (session: Session) => !!session.lightUid && lightOf(session).onStage === true;
/**
 * The light on the main screen needs the host: its Hue lamp isn't responding, or its camera failed while on.
 * With nothing on the big screen, the lamp is the only light.
 */
export function lightTrouble(session: Session): boolean {
  const light = lightOf(session);
  return runsOnStage(session) && (!!light.stage?.hue?.error || (isArmed(light) && !!light.camera?.error));
}

/** The light never changes (on, off, or to another colour) more often than this. */
export const MIN_CHANGE_MS = 500;
/** The flash of the one red bulb ("One secret" mode); in the other modes a flash is a trigger's id. */
export const ONE = "one";

/**
 * Which light is on right now: ONE, a trigger's id, or undefined. Each lighting event (a new time in
 * `litAt`, or in `lit` in a mode with several bulbs) wants its light on for a second from when it
 * arrives (a rainbow spin: for the whole spin); when several overlap, the newest wins, except that a
 * spin wins over plain flashes while it lasts. To keep it readable the light changes at most once every
 * MIN_CHANGE_MS: a change that comes sooner waits for the rest of that time (so nothing is ever more than
 * that late), and one overtaken by a newer event meanwhile is skipped. Times already there when the page
 * opens are old, and so are other modes'.
 */
export function useFlash(light: LightState): string | undefined {
  const mode = modeOf(light);
  const seen = useRef({ litAt: light.litAt, lit: light.lit ?? {}, mode: mode?.id });
  // Each event: which light, when it arrived here, until when it wants the light, and whether it's a spin.
  const events = useRef<{ id: string; at: number; until: number; spin: boolean }[]>([]);
  const shown = useRef<string>();
  const changedAt = useRef(0);
  const timer = useRef<number>();
  const [current, setCurrent] = useState<string>();

  const update = useRef(() => {
    window.clearTimeout(timer.current);
    const now = Date.now();
    events.current = events.current.filter((e) => now < e.until);
    // The newest spin still going, or else the newest event still within its second.
    type Event = (typeof events.current)[number];
    const newest = (list: Event[]) => list.reduce<Event | undefined>((w, e) => (e.at <= now && (!w || e.at >= w.at) ? e : w), undefined);
    const want = (newest(events.current.filter((e) => e.spin)) ?? newest(events.current))?.id;
    if (want !== shown.current) {
      const wait = changedAt.current + MIN_CHANGE_MS - now;
      if (wait > 0) { timer.current = window.setTimeout(update.current, wait); return; }
      shown.current = want;
      changedAt.current = now;
      setCurrent(want);
    }
    // Look again when the next event's second ends.
    const next = Math.min(...events.current.map((e) => e.until));
    if (next !== Infinity) timer.current = window.setTimeout(update.current, next - now);
  });

  useEffect(() => {
    // Switching modes drops the old mode's lights.
    if (seen.current.mode !== mode?.id) events.current = [];
    const now = Date.now();
    if (!mode && light.litAt !== undefined && light.litAt !== seen.current.litAt) events.current.push({ id: ONE, at: now, until: now + ON_MS, spin: false });
    // (Several in one update: the newest time wins.)
    const spins = new Set(mode?.spins?.map((t) => t.id));
    const fresh = [...(mode?.bulbs.map((b) => b.trigger.id) ?? []), ...spins]
      .map((id) => ({ id, t: light.lit?.[id] }))
      .filter((e): e is { id: string; t: number } => e.t !== undefined && e.t !== seen.current.lit[e.id])
      .sort((x, y) => x.t - y.t);
    fresh.forEach((e, i) => {
      const spin = spins.has(e.id);
      events.current.push({ id: e.id, at: now + i, until: now + i + (spin && mode ? spinMs(mode) : ON_MS), spin });
    });
    seen.current = { litAt: light.litAt, lit: light.lit ?? {}, mode: mode?.id };
    update.current();
  }, [light.litAt, light.lit, mode?.id]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return current;
}

/** What the light computer's camera sees, in words, for the host (this gives the secret away). */
export function cameraText(session: Session): string {
  const light = lightOf(session);
  const camera = light.camera;
  if (!session.lightUid) return `Not running. Open ${PUBLIC_URL.replace(/^https?:\/\//, "")}/light on the computer with the webcam.`;
  if (!camera) return runsOnStage(session) ? "The big screen isn't responding. Check that it's still open." : "The light computer isn't responding. Check that its /light page is still open.";
  if (!isArmed(light)) return "Off. The camera isn't watching.";
  if (camera.error) return `Camera: ${camera.error}`;
  if (camera.starting || camera.off) return "Camera starting…";
  const people = camera.people ?? 0;
  const seen = `Camera sees ${people} ${people === 1 ? "person" : "people"}`;
  // Per state ("smiling" is shared by the two smile triggers, "with an arm up" by the two arm ones).
  const states = new Map<string, number>();
  for (const t of watchedTriggers(light)) states.set(t.state, camera.each?.[t.id] ?? 0);
  if (!modeOf(light)) return `${seen}, ${[...states.values()][0] ?? 0} ${triggerOf(light).state}.`;
  return `${seen}: ${[...states].map(([state, n]) => `${n} ${state}`).join(", ")}.`;
}

/** The colour a flash shows in (a rainbow spin: its first bulb's), for the host phone's 💡 pulse. */
export function flashColour(light: LightState, flash: string | undefined): string | undefined {
  if (!flash) return undefined;
  const mode = modeOf(light);
  if (!mode) return flash === ONE ? "var(--bulb-red)" : undefined;
  return (mode.bulbs.find((b) => b.trigger.id === flash) ?? (mode.spins?.some((t) => t.id === flash) ? mode.bulbs[0] : undefined))?.colour;
}

import { ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { dataOf as flipchartOf, running as flipchartRunning } from "../games/flipchart/data";
import { useServerOffset } from "../games/noisemaster/data";
import { enterPoints } from "../scoreboard/data";
import { scoringOf } from "../scoreboard/measured";
import { sorted } from "../scoreboard/tasks";
import { asNums, asList } from "../JukeboxRemote";
import type { ClockState, Session } from "../types";

export { clockText, watchLabel, watchText } from "./text";

/** Not started yet; counting; held (paused, or a stopwatch that stopped itself); or a countdown that has run out. */
export type Phase = "idle" | "running" | "held" | "done";

/** What a clock shows at a moment: pure, so every screen reads the same from the same state. */
export function readClock(state: ClockState | undefined, now: number): { phase: Phase; ms: number } {
  const ms = state?.ms ?? 0;
  if (!state?.begun) return { phase: "idle", ms };
  if (state.at === undefined || state.stopped) return { phase: "held", ms };
  if (state.mode === "up") return { phase: "running", ms: Math.max(0, now - state.at) };
  const left = state.at - now;
  return left > 0 ? { phase: "running", ms: left } : { phase: "done", ms: 0 };
}

/** The clock in the party: the ⏱ clock, or Flipchart's while that runs (its own state, since it also closes the drawing). */
export interface ClockView {
  /** The ⏱ clock's state, even while Flipchart's clock is the one in the party. */
  state: ClockState | undefined;
  owner?: "flipchart";
  up: boolean;
  phase: Phase;
  ms: number;
  /** On the big screen, over whatever's there (Flipchart's always is: it's the focus). */
  shown: boolean;
}

/** Flipchart's clock is the one in the party while the game is on and its time runs. */
const flipchartOwns = (session: Session) => session.game === "flipchart" && flipchartRunning(session) && flipchartOf(session).endsAt !== undefined;

/** The clock every screen counts, ticking every tenth of a second while it runs. */
export function useClock(session: Session | undefined): ClockView {
  const offset = useServerOffset();
  const [, tick] = useState(0);
  const state = session?.clock;
  const owner = !!session && flipchartOwns(session);
  const now = Date.now() + offset;
  const own = readClock(state, now);
  const left = owner ? Math.max(0, flipchartOf(session!).endsAt! - now) : 0;
  const live = owner ? left > 0 : own.phase === "running";
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => tick((n) => n + 1), 100);
    return () => window.clearInterval(t);
  }, [live]);
  if (owner) return { state, owner: "flipchart", up: false, phase: left > 0 ? "running" : "done", ms: left, shown: true };
  return { state, up: state?.mode === "up", phase: own.phase, ms: own.ms, shown: !!state?.shown };
}

const at = (code: string) => ref(db(), `sessions/${code}`);

/** Host: puts the clock on the big screen over whatever's there, or takes it down. */
export const showClock = (code: string, state: ClockState | undefined, on: boolean) =>
  update(at(code), on ? { "clock/shown": true, ...(state ? {} : { "clock/ms": 0 }), conversion: null } : { "clock/shown": null });

/** Host: sets a countdown's time (before it starts), and the task it came from. Switches a stopwatch back to a countdown. */
export const setTime = (code: string, ms: number, task?: string) =>
  update(at(code), { "clock/mode": null, "clock/set": ms, "clock/ms": ms, "clock/task": task ?? null, "clock/going": null });

/** Host: switches between a countdown and a stopwatch (only before it starts). A stopwatch starts at nothing. */
export const setMode = (code: string, state: ClockState | undefined, up: boolean, task?: string) =>
  update(at(code), up
    ? { "clock/mode": "up", "clock/ms": 0, "clock/task": task ?? null, "clock/going": null }
    : { "clock/mode": null, "clock/ms": state?.set ?? 0, "clock/task": task ?? state?.task ?? null });

/** Where a song for the clock is in the jukebox's list, and how long it is in ms (0: unknown). */
export function songIn(session: Session, title: string | undefined): { index: number; ms: number } | undefined {
  if (!title) return undefined;
  const index = asList(session.jukebox?.tracks).indexOf(title);
  return index < 0 ? undefined : { index, ms: (asNums(session.jukebox?.durations)[index] ?? 0) * 1000 };
}

const pauseSong = (state: ClockState | undefined, playing: boolean) => state?.songOn ? { "jukebox/state/playing": playing } : {};

/** Host: ▶ Start, or carries on from ⏸ (the song with it, once it's begun). */
export function startClock(code: string, view: ClockView, offset: number) {
  const now = Date.now() + offset;
  const { state } = view;
  if (!state || view.phase === "running" || view.phase === "done") return Promise.resolve();
  if (view.phase === "held" && state.stopped) return Promise.resolve();
  const reference = state.mode === "up" ? now - view.ms : now + view.ms;
  return update(at(code), { "clock/begun": true, "clock/at": reference, "clock/stopped": null, ...pauseSong(state, true) });
}

/** Host: ⏸ holds the clock where it is, and the song with it. */
export function stopClock(code: string, view: ClockView, offset: number) {
  if (view.phase !== "running" || !view.state) return Promise.resolve();
  const ms = readClock(view.state, Date.now() + offset).ms;
  return update(at(code), { "clock/ms": ms, "clock/at": null, ...pauseSong(view.state, false) });
}

/** Host: back to the time set (or nothing, for a stopwatch), not started. The song stops. */
export function resetClock(code: string, state: ClockState | undefined) {
  if (!state) return Promise.resolve();
  return update(at(code), {
    "clock/ms": state.mode === "up" ? 0 : state.set ?? 0, "clock/at": null, "clock/begun": null, "clock/stopped": null,
    ...(state.mode === "up" ? { "clock/going": null } : {}),
    ...(state.songOn ? { "clock/songOn": null, "jukebox/state/playing": false } : {}),
  });
}

/** Host: another minute while it counts or is held. A song that's started plays on, so it ends early. */
export function addMinute(code: string, view: ClockView, offset: number) {
  const state = view.state;
  if (!state || state.mode === "up") return Promise.resolve();
  if (view.phase === "running") return update(at(code), { "clock/at": state.at! + 60_000 });
  if (view.phase === "held") return update(at(code), { "clock/ms": view.ms + 60_000 });
  return Promise.resolve();
}

/** Host: the song that ends on 0:00, or none. */
export const setSong = (code: string, title: string | null) => update(at(code), { "clock/song": title, "clock/songOn": null });

/**
 * Main screen (it plays the music; a component of its own, so the 10 ticks a second don't redraw the stage): starts the clock's song when the time left is its length (or with the clock, if it's longer or its length isn't
 * known). It plays once, ends where it ends, and goes on past 0:00 if the clock is shorter.
 */
export function ClockSongStarter({ code, session }: { code: string; session: Session }) {
  const view = useClock(session);
  const state = session.clock;
  const song = songIn(session, state?.song);
  const due = !!song && !!session.jukebox?.open && !state?.songOn && !view.owner && !view.up && view.phase === "running"
    && (song.ms === 0 || view.ms <= song.ms);
  useEffect(() => {
    if (!due) return;
    void update(at(code), { "clock/songOn": true, "jukebox/state/current": song!.index, "jukebox/state/playing": true, "jukebox/state/repeat": false });
  }, [due]);
  return null;
}

/** The scoreboard's contestants in the host's order, for the stopwatch. */
export const contestantsOf = (session: Session) =>
  sorted(session.scoreboard?.contestants).map(([id, c]) => ({ id, name: c.name }));

/** The task a stopwatch's times go into: a live task won by the lowest time, and nothing else. */
export function watchTask(session: Session): string | undefined {
  const id = session.clock?.task;
  const task = id ? session.scoreboard?.tasks?.[id] : undefined;
  return id && task && !task.game && scoringOf(task) === "lowest" ? id : undefined;
}

/** Each contestant's time so far, in ms: from the task's results (in seconds) or, with no task, from the clock. */
export function timesOf(session: Session): Record<string, number> {
  const id = watchTask(session);
  if (!id) return session.clock?.times ?? {};
  return Object.fromEntries(Object.entries(session.scoreboard!.tasks![id]!.results ?? {}).map(([c, s]) => [c, s * 1000]));
}

/** Who a stopwatch is timing: the contestants picked, or else everyone with no time yet. */
export function goingOf(session: Session): string[] {
  const times = timesOf(session);
  const picked = Object.keys(session.clock?.going ?? {});
  return picked.length ? picked : contestantsOf(session).map((c) => c.id).filter((id) => times[id] === undefined);
}

const writeTime = (code: string, session: Session, id: string, ms: number | null) => {
  const task = watchTask(session);
  if (!task) return update(at(code), { [`clock/times/${id}`]: ms });
  const seconds = ms === null ? null : Math.round(ms / 100) / 10;
  return enterPoints(code, session.scoreboard, session.display?.step === "scoreboard", task, { results: { [id]: seconds } });
};

/**
 * Host: a contestant's chip on the stopwatch. Before the start (or once it has stopped itself) it picks who's going; while it
 * runs it takes their time, and stops the clock when everyone going has one; a chip with a time takes it back.
 */
export function tapContestant(code: string, session: Session, view: ClockView, id: string) {
  const state = session.clock;
  if (!state || state.mode !== "up") return Promise.resolve();
  const times = timesOf(session);
  if (times[id] !== undefined) {
    return Promise.all([writeTime(code, session, id, null), ...(state.stopped ? [update(at(code), { "clock/stopped": null })] : [])]);
  }
  const going = goingOf(session);
  if (view.phase === "running") {
    if (!going.includes(id)) return Promise.resolve();
    const everyone = going.every((g) => g === id || times[g] !== undefined);
    return Promise.all([writeTime(code, session, id, view.ms), ...(everyone ? [update(at(code), { "clock/stopped": true, "clock/ms": view.ms })] : [])]);
  }
  if (view.phase === "held" && !state.stopped) return Promise.resolve();
  // Picking: the first tap, with everyone going, picks just that one (one at a time); after that each tap adds or takes away.
  const picked = Object.keys(state.going ?? {});
  const next = view.phase === "held" || !picked.length ? [id] : picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
  return update(at(code), {
    "clock/going": next.length ? Object.fromEntries(next.map((p) => [p, true])) : null,
    ...(view.phase === "held" ? { "clock/ms": 0, "clock/at": null, "clock/begun": null, "clock/stopped": null } : {}),
  });
}

/** Host: everyone with no time goes, not just those picked. */
export const pickEveryone = (code: string) => update(at(code), { "clock/going": null });

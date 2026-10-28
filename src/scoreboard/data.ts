import { push, ref, remove, set, update } from "firebase/database";
import { flipchartDefaults } from "../games/flipchart/data";
import { db, storage } from "../firebase";
import { DEFAULT_WORDS } from "../games/secretTasks/data";
import { shrinkImage } from "../media";
import { setDisplay } from "../session";
import type { HeadshotCrop, Session, Scoreboard, ScoreboardTask, TaskGame, TaskUnit } from "../types";
import { isMeasured, withBonus, workOut } from "./measured";
import { currentPoints } from "./scoring";

/** The party's scoreboard lives at sessions/{code}/scoreboard. Only the host and the host remote write it. */
const at = (code: string, path = "") => ref(db(), `sessions/${code}/scoreboard${path ? `/${path}` : ""}`);

/** What the host enters on a task, from which its points are worked out. */
const ENTERED = ["given", "results", "restarts", "dq", "overDq", "dqStays", "bonus"] as const;

const nextOrder = (items: Record<string, { order: number }> | undefined) =>
  Math.max(-1, ...Object.values(items ?? {}).map((i) => i.order)) + 1;

export async function addContestant(code: string, board: Scoreboard | undefined, name: string) {
  const key = push(at(code, "contestants")).key!;
  await set(at(code, `contestants/${key}`), { name: name.trim(), order: nextOrder(board?.contestants) });
}

/** Several contestants at once, one per line of a pasted list: added in that order, after the ones already there. */
export async function addContestants(code: string, board: Scoreboard | undefined, text: string) {
  const names = text.split("\n").map((n) => n.trim()).filter(Boolean);
  const first = nextOrder(board?.contestants);
  const patch: Record<string, unknown> = {};
  names.forEach((name, i) => { patch[`contestants/${push(at(code, "contestants")).key!}`] = { name: name.slice(0, 20), order: first + i }; });
  if (names.length) await update(at(code), patch);
  return names.length;
}

/** Someone who joined by typing a name while there was no guest list: onto the scoreboard, linked to their phone. */
export async function addPlayerToScoreboard(code: string, board: Scoreboard | undefined, uid: string, name: string) {
  const key = push(at(code, "contestants")).key!;
  await update(ref(db(), `sessions/${code}`), {
    [`scoreboard/contestants/${key}`]: { name: name.trim(), order: nextOrder(board?.contestants), uid },
    [`players/${uid}/contestant`]: key,
  });
}

/** "Not playing": the host dismisses a guest's "add them?" card. They stay in "Here, but not on the scoreboard". */
export const setNotPlaying = (code: string, uid: string, on = true) =>
  update(ref(db(), `sessions/${code}`), { [`players/${uid}/notPlaying`]: on ? true : null });

export const renameContestant = (code: string, id: string, name: string) => set(at(code, `contestants/${id}/name`), name.trim());

/** Takes them off the scoreboard, with every point they were given. */
export async function removeContestant(code: string, board: Scoreboard | undefined, id: string) {
  const patch: Record<string, null> = { [`contestants/${id}`]: null };
  for (const t of Object.keys(board?.tasks ?? {})) {
    for (const k of ["scores", ...ENTERED.filter((k) => k !== "dqStays")]) patch[`tasks/${t}/${k}/${id}`] = null;
  }
  for (const t of Object.keys(board?.shown ?? {})) patch[`shown/${t}/${id}`] = null;
  await update(at(code), patch);
}

/** Uploads a contestant's headshot (under the uploader's own uid, like every upload) and puts it in their frame. */
export async function uploadHeadshot(code: string, uid: string, id: string, file: File, onProgress: (fraction: number) => void) {
  const body = await shrinkImage(file, 800);
  const { getDownloadURL, ref: fileRef, uploadBytesResumable } = await import("firebase/storage");
  const task = uploadBytesResumable(fileRef(await storage(), `sessions/${code}/${uid}/headshot-${Date.now()}`), body, {
    contentType: body.type || "image/jpeg",
    cacheControl: "public, max-age=31536000, immutable",
  });
  await new Promise<void>((resolve, reject) => {
    task.on("state_changed", (s) => onProgress(s.bytesTransferred / s.totalBytes), reject, resolve);
  });
  // A new photo starts uncropped: the old crop was for the old one.
  await update(at(code, `contestants/${id}`), { photo: await getDownloadURL(task.snapshot.ref), crop: null });
}

/** Sets the part of a contestant's headshot the scoreboard shows. The photo itself stays as it was. */
export async function setHeadshotCrop(code: string, id: string, crop: HeadshotCrop | null) {
  await set(at(code, `contestants/${id}/crop`), crop);
}

/** Adds a live task (a name, and the host's note) or an app game to the end of the task list. */
export async function addTask(code: string, board: Scoreboard | undefined, task: { name: string; description?: string } | { game: TaskGame }) {
  const key = push(at(code, "tasks")).key!;
  const entry: ScoreboardTask = "game" in task
    ? { order: nextOrder(board?.tasks), game: task.game, ...(task.game === "secretTasks" && DEFAULT_WORDS), ...(task.game === "flipchart" && flipchartDefaults()) }
    : { order: nextOrder(board?.tasks), name: task.name.trim(), ...(task.description?.trim() ? { description: task.description.trim() } : {}) };
  await set(at(code, `tasks/${key}`), entry);
  return key;
}

/** The task for an app game on the list (the light and Noisemaster are each on it at most once). */
export const taskFor = (board: Scoreboard | undefined, game: TaskGame) =>
  Object.entries(board?.tasks ?? {}).find(([, t]) => t.game === game)?.[0];

/** Each contestant's place in the light's order (1 got it first), from the light's `got`; anyone taken off the scoreboard drops out. */
export const lightPlaces = (got: Record<string, number> | undefined, board: Scoreboard | undefined) =>
  Object.fromEntries(Object.entries(got ?? {}).filter(([c]) => board?.contestants?.[c]).sort(([, a], [, b]) => a - b).map(([c], i) => [c, i + 1]));

/**
 * Adds the light or Noisemaster to the task list, bringing across what was kept while it wasn't on it:
 * who got the light's secret, in order, or Noisemaster's finished goes.
 */
export async function addKeptGame(code: string, session: Session, game: "light" | "noisemaster") {
  const board = session.scoreboard;
  const id = await addTask(code, board, { game });
  const entry: TaskEntry = {};
  if (game === "light") entry.results = lightPlaces(session.light?.got, board);
  else {
    const kept = Object.entries(session.games?.noisemaster?.kept ?? {}).filter(([c]) => board?.contestants?.[c]);
    entry.results = Object.fromEntries(kept.filter(([, k]) => k.ms !== undefined).map(([c, k]) => [c, k.ms!]));
    entry.restarts = Object.fromEntries(kept.filter(([, k]) => k.restarts !== undefined).map(([c, k]) => [c, k.restarts!]));
    entry.dq = Object.fromEntries(kept.filter(([, k]) => k.dq).map(([c]) => [c, true as const]));
    void remove(ref(db(), `sessions/${code}/games/noisemaster/kept`));
  }
  if (!Object.values(entry).some((v) => Object.keys(v).length)) return;
  const added: ScoreboardTask = { order: nextOrder(board?.tasks), game };
  await enterPoints(code, { ...board, tasks: { ...board?.tasks, [id]: added } }, session.display?.step === "scoreboard", id, entry);
}

/** What a task's ✎ saves as its words: its type and the text the host reads out, then the parts after the first. Empty removes them. */
export interface TaskWords { type: string; text: string; limit?: number; parts?: { type: string; text: string; limit?: number }[] }
function wordsOf({ type, text, limit, parts = [] }: TaskWords) {
  // A part with no text is no part (its time limit goes with it); if the first has none, the next one is the first.
  const all = [{ type, text, limit }, ...parts].map((p) => ({ type: p.type.trim(), text: p.text.trim(), limit: p.limit })).filter((p) => p.text);
  const [first, ...rest] = all;
  return {
    type: first?.type || null, text: first?.text || null, limit: first?.limit || null,
    parts: rest.length ? rest.map((p) => ({ ...(p.type && { type: p.type }), text: p.text, ...(p.limit && { limit: p.limit }) })) : null,
  };
}

/** Changes a task's name, note, song, words, unit and DQ line in place. An empty note or song removes it. */
export const editTask = (code: string, id: string, name: string, description: string, song: string, words: TaskWords, unit: TaskUnit | null, dqOver: number | null) =>
  update(at(code, `tasks/${id}`), { name: name.trim() || null, description: description.trim() || null, song: song || null, ...wordsOf(words), unit, dqOver });

/** Takes a task off the list, with its points. The big screen keeps showing them until the next update. */
export const removeTask = (code: string, id: string) => remove(at(code, `tasks/${id}`));

/** Puts the task list in this order. */
export const reorderTasks = (code: string, ids: string[]) =>
  update(at(code, "tasks"), Object.fromEntries(ids.map((id, i) => [`${id}/order`, i])));

/**
 * The totals the big screen will show, caught up on every task but `task`: so that showing the scoreboard after
 * `task` opens on the scores from just before it, and the update ticks up that one task alone. Unchanged while
 * the scoreboard is up, where catching up would tick the totals in front of the room.
 */
function catchUp(board: Scoreboard | undefined, task: string, onScreen: boolean) {
  if (onScreen) return {};
  const shown: Record<string, unknown> = Object.fromEntries(
    Object.entries(currentPoints(board)).filter(([id, s]) => id !== task && s && Object.keys(s).length));
  if (board?.shown?.[task]) shown[task] = board.shown[task];
  return { shown };
}

/** What the host enters on a task's points page: a contestant's value, or null to take it away. */
export interface TaskEntry {
  given?: Record<string, number | null>;
  results?: Record<string, number | null>;
  restarts?: Record<string, number | null>;
  dq?: Record<string, true | null>;
  overDq?: Record<string, true | null>;
  dqStays?: true | null;
  bonus?: Record<string, number | null>;
}


function merged<T>(now: Record<string, T> | undefined, patch: Record<string, T | null>) {
  const out: Record<string, T> = { ...now };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Saves what the host entered on a task and the points it works out to (see workOut), which are what
 * the scoreboard adds up. The first points given on a task start it: every earlier task is caught up on
 * the big screen (see catchUp).
 */
export function enterPoints(code: string, board: Scoreboard | undefined, onScreen: boolean, id: string, entry: TaskEntry) {
  const task = board!.tasks![id]!;
  // A task scored by hand before the host's points were kept apart from the points that count.
  const next: ScoreboardTask = isMeasured(task) || task.given || !task.scores ? { ...task } : { ...task, given: task.scores };
  if (entry.given) next.given = merged(next.given, entry.given);
  if (entry.results) next.results = merged(next.results, entry.results);
  if (entry.restarts) next.restarts = merged(next.restarts, entry.restarts);
  if (entry.dq) next.dq = merged<true>(next.dq, entry.dq);
  if (entry.overDq) next.overDq = merged<true>(next.overDq, entry.overDq);
  if (entry.dqStays !== undefined) next.dqStays = entry.dqStays ?? undefined;
  if (entry.bonus) next.bonus = merged<true | number>(next.bonus, entry.bonus);
  const points = withBonus(next, workOut(next).points);
  const patch: Record<string, unknown> = { [`tasks/${id}/scores`]: Object.keys(points).length ? points : null };
  for (const k of ENTERED) if (next[k] !== task[k]) patch[`tasks/${id}/${k}`] = next[k] ?? null;
  const starting = Object.keys(points).length > 0 && !Object.keys(task.scores ?? {}).length;
  return update(at(code), { ...patch, ...(starting ? catchUp(board, id, onScreen) : {}) });
}

/**
 * A measured task's points as by-hand points that work out the same: what DQ'd contestants would have had,
 * and for everyone else the points that, moved up by the DQs above them, come to what they have now.
 */
function keptByHand(task: ScoreboardTask) {
  const { points, held } = workOut(task);
  const given: Record<string, number> = {};
  const out = Object.keys(task.dq ?? {}).filter((d) => held[d] !== undefined);
  for (const [c, n] of Object.entries(points)) {
    if (task.dq?.[c]) continue;
    // The closest, if none is exact: 1 is the least anyone gets by place, so the places below 5th can't all move up.
    const after = (k: number) => task.dqStays ? k : k + out.filter((d) => held[d]! > k).length;
    let g = n;
    for (let k = n; k >= 0; k--) if (Math.abs(after(k) - n) < Math.abs(after(g) - n)) g = k;
    given[c] = g;
  }
  for (const d of out) given[d] = held[d]!;
  return given;
}

/**
 * Changes how a live task is won, keeping its DQs. To by hand: everyone keeps the points they had, as the
 * host's own. To measured: the points are worked out again from the numbers, which stay through both.
 */
export function setScoring(code: string, board: Scoreboard | undefined, onScreen: boolean, id: string, scoring: "highest" | "lowest" | undefined) {
  const task = board!.tasks![id]!;
  const next: ScoreboardTask = scoring
    ? { ...task, scoring, given: undefined }
    : { ...task, scoring: undefined, given: isMeasured(task) ? keptByHand(task) : task.given };
  if (next.given && !Object.keys(next.given).length) next.given = undefined;
  const points = withBonus(next, workOut(next).points);
  return update(at(code, `tasks/${id}`), {
    scoring: next.scoring ?? null, given: next.given ?? null, scores: Object.keys(points).length ? points : null,
  });
}

/** ▶ Start on an app game in the task list: it starts that task (see catchUp). */
export const startTask = (code: string, board: Scoreboard | undefined, onScreen: boolean, task: string) => {
  const patch = catchUp(board, task, onScreen);
  return "shown" in patch ? update(at(code), patch) : Promise.resolve();
};

/** Puts the scoreboard on the big screen, at the totals last shown. */
export const showScoreboard = (code: string) => setDisplay(code, { step: "scoreboard" });

/** The party's Taskmaster rules on the big screen, until the host puts something else up. */
export const showRules = (code: string) => setDisplay(code, { step: "rules" });

/** The big screen ticks up to every point given so far: they become the totals shown. */
export const updateScores = (code: string, board: Scoreboard | undefined) => {
  const now = Object.fromEntries(Object.entries(currentPoints(board)).filter(([, s]) => s && Object.keys(s).length));
  return set(at(code, "shown"), now);
};

/**
 * The end of the night, whatever's left unscored: the scoreboard goes up for one last update, then the
 * winner is decided on the points so far. Undone with `null`, if the host jumped the gun.
 */
export const declareWinner = (code: string, on = true) =>
  update(ref(db(), `sessions/${code}`), on
    ? { "scoreboard/final": true, display: { step: "scoreboard" }, conversion: null, "clock/shown": null }
    : { "scoreboard/final": null });

/** When the party was locked (ms), if it is. */
export const lockedAt = (board: Scoreboard | undefined) => typeof board?.locked === "number" ? board.locked : undefined;

/** Locks the party, so nothing about the finished night changes by accident. Nothing changes on the big screen. */
export const lockParty = (code: string) => set(at(code, "locked"), Date.now());

/** Unlocks the whole party (for guests or a reset); Run of show says so until it's locked again. */
export const unlockParty = (code: string) => set(at(code, "locked"), false);

/** Whether the big screen pixelates the headshots of guests who haven't checked in (on unless turned off). */
export const setPixelate = (code: string, on: boolean) => set(at(code, "pixelate"), on ? null : false);

export const lowerCurtain = (code: string) => setDisplay(code, { step: "curtain" });

/** Records who won the tiebreaker task (null clears it). Nothing changes on the big screen. */
export const setTiebreakerWinner = (code: string, contestant: string | null) =>
  set(at(code, "tiebreaker/winner"), contestant);

/** Host: starts a task's transition on the big screen. The jukebox stops, so a song never plays under it. */
export const startSting = (code: string, task: string, stopJukebox: boolean, draft?: { music: string; picture: string; video: string }) =>
  update(ref(db(), `sessions/${code}`), {
    sting: { task, ...(draft && { draft: { music: draft.music || null, picture: draft.picture || null, video: draft.video || null } }) },
    ...(stopJukebox && { "jukebox/state/playing": false }),
  });

/** A task's transition: music and/or a picture, or a video on its own. Empty ones are removed. */
export const editTransition = (code: string, id: string, t: { music: string; picture: string; video: string }) =>
  update(at(code, `tasks/${id}`), { transition: t.music || null, transitionImage: t.picture || null, transitionVideo: t.video || null });

/** Fixes the tiebreaker task's name, note, song or words. It can't be removed: every party has one. */
export const editTiebreaker = (code: string, name: string, description: string, song: string, words: TaskWords) =>
  update(at(code, "tiebreaker"), { name: name.trim() || null, description: description.trim() || null, song: song || null, ...wordsOf(words) });

/** Puts a live task's words (a task's id, or "tiebreaker"; part `part`, the first unless said) on every guest's phone, apart from the big screen. */
export const showOnPhones = (code: string, task: string, part = 0) =>
  update(ref(db(), `sessions/${code}`), { phoneText: { task, ...(part && { part }) } });

/** Takes the words off the guests' phones. */
export const takeDownPhones = (code: string) => update(ref(db(), `sessions/${code}`), { phoneText: null });

/** Puts a task's text (a task's id, or "tiebreaker") on the big screen, on the paper task card: part `part` of it, the first unless said. */
export const showTaskText = (code: string, task: string, part = 0) => setDisplay(code, { step: "tasktext", task, ...(part && { part }) });

/** Makes `id` the party's arrival task (its words are the last step of check-in), or no task with `on` false. One at most. */
export function setCheckinTask(code: string, board: Scoreboard | undefined, id: string, on: boolean) {
  const root: Record<string, true | null> = {};
  for (const [t, task] of Object.entries(board?.tasks ?? {})) if (task.checkin && t !== id) root[`${t}/checkin`] = null;
  root[`${id}/checkin`] = on || null;
  return update(ref(db(), `sessions/${code}/scoreboard/tasks`), root);
}

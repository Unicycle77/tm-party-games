import { get, push, ref, update } from "firebase/database";
import { db } from "./firebase";
import { GAMES } from "./games";
import { same } from "./games/secretTasks/data";
import { MODES, TRIGGERS, findMode, findTrigger } from "./light/triggers";
import { rulesCount } from "./rules";
import { asParts, titleOf } from "./scoreboard/tasks";
import { SETUP_FORMAT, SETUP_VERSION, type Setup, type SetupTask } from "./setupFile";
import type { PartyRules, ScoreboardTask, SecretTasks, Session, TaskGame, TaskPart, TaskUnit } from "./types";

export const NOT_A_SETUP = "That file isn't a party setup.";
export const TOO_NEW = "That setup was made by a newer version of the app.";

/** The units the database rules let a task measure in. */
const UNITS = ["mm", "cm", "m", "in", "ft", "g", "kg", "oz", "lb", "sec", "min", "hr", "ml", "L", "tsp", "tbsp", "fl oz", "cup", "pt", "qt", "gal", "dB"];
const KINDS = ["height", "length", "weight", "time", "volume", "loudness"];
const MAX_TASKS = 100;

const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** A string at most `max` long (what the database rules allow), or nothing. */
const str = (v: unknown, max: number) => typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

/** A time limit in ms the database rules allow (a second to 999:59), else none. */
const limit = (v: unknown) => typeof v === "number" && v >= 1000 && v <= 59_999_000 ? Math.round(v) : undefined;

/** The parts after a task's first: each with text, and its type and time limit if it has them, at most as many as the database rules allow. */
const MAX_PARTS = 9;
const partsOf = (v: unknown): TaskPart[] => Array.isArray(v)
  ? v.filter(obj).flatMap((p) => str(p.text, 5000) ? [{ ...(str(p.type, 30) && { type: str(p.type, 30) }), text: str(p.text, 5000)!, ...(limit(p.limit) && { limit: limit(p.limit) }) }] : []).slice(0, MAX_PARTS)
  : [];

/** The words a task or the tiebreaker carries, kept to the lengths the database rules allow. */
function wordsOf(raw: Record<string, unknown>) {
  return {
    ...(str(raw.name, 80) && { name: str(raw.name, 80) }),
    ...(str(raw.type, 30) && { type: str(raw.type, 30) }),
    ...(str(raw.text, 5000) && { text: str(raw.text, 5000) }),
    ...(limit(raw.limit) && { limit: limit(raw.limit) }),
    ...(partsOf(raw.parts).length > 0 && { parts: partsOf(raw.parts) }),
    ...(str(raw.note, 600) && { note: str(raw.note, 600) }),
    ...(str(raw.song, 300) && { song: str(raw.song, 300) }),
  };
}

/** Reads a setup file's text. Anything wrong with a part of it is left out and said in `warnings`; a file that isn't a setup is an `error`. */
export function parseSetup(text: string): { setup: Setup; warnings: string[] } | { error: string } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { error: NOT_A_SETUP }; }
  if (!obj(raw) || raw.format !== SETUP_FORMAT || typeof raw.version !== "number") return { error: NOT_A_SETUP };
  if (raw.version > SETUP_VERSION) return { error: TOO_NEW };
  if (!Array.isArray(raw.tasks)) return { error: NOT_A_SETUP };

  const warnings: string[] = [];
  const tasks: SetupTask[] = [];
  raw.tasks.slice(0, MAX_TASKS).forEach((r, i) => {
    if (!obj(r)) { warnings.push(`Task ${i + 1} isn't a task, so it's left out.`); return; }
    const game = typeof r.game === "string" && (r.game === "light" || r.game in GAMES) ? (r.game as TaskGame) : undefined;
    const task: SetupTask = { id: typeof r.id === "string" ? r.id : "", ...wordsOf(r), ...(game && { game }) };
    if (!task.name && !game) { warnings.push(`Task ${i + 1} has no name or app task, so it's left out.`); return; }
    if (r.scoring === "highest" || r.scoring === "lowest") task.scoring = r.scoring;
    if (typeof r.dqOver === "number" && Number.isFinite(r.dqOver)) task.dqOver = r.dqOver;
    if (r.dqStays === true) task.dqStays = true;
    // One arrival task at most: the first in the file.
    if (r.checkin === true && !game && task.text && !tasks.some((t) => t.checkin)) task.checkin = true;
    if (game === "flipchart") {
      const draw = str(r.draw, 120);
      if (draw) task.draw = draw;
      if (typeof r.minutes === "number" && r.minutes >= 1 && r.minutes <= 120) task.minutes = Math.round(r.minutes);
    }
    if (obj(r.unit)) {
      const u = r.unit;
      const name = str(u.name, 30);
      if (name && typeof u.amount === "number" && u.amount > 0 && typeof u.unit === "string" && UNITS.includes(u.unit) && typeof u.kind === "string" && KINDS.includes(u.kind))
        task.unit = { name, amount: u.amount, unit: u.unit, kind: u.kind as TaskUnit["kind"] };
      else warnings.push(`${task.name ?? "A task"}'s unit isn't one the app knows, so it's left out.`);
    }
    for (const k of ["transition", "transitionImage", "transitionVideo"] as const) { const v = str(r[k], 300); if (v) task[k] = v; }
    tasks.push(task);
  });
  if (raw.tasks.length > MAX_TASKS) warnings.push(`Only the first ${MAX_TASKS} tasks are read.`);

  const setup: Setup = { format: SETUP_FORMAT, version: raw.version, ...(str(raw.name, 80) && { name: str(raw.name, 80) }), tasks };
  if (obj(raw.tiebreaker)) { const words = wordsOf(raw.tiebreaker); if (Object.keys(words).length) setup.tiebreaker = words; }
  if (Array.isArray(raw.secretTasks)) {
    const pool: string[] = [];
    for (const t of raw.secretTasks) { const s = str(t, 300); if (s && !pool.some((p) => same(p, s))) pool.push(s); }
    setup.secretTasks = pool;
  }
  if (obj(raw.rules)) {
    // Kept as written, an empty string too: that's a party with no rules (or no last paragraph, or no sign-off).
    const r = raw.rules, rules: PartyRules = {};
    for (const [k, max] of [["text", 3000], ["last", 1000], ["signOff", 40]] as const) if (typeof r[k] === "string") rules[k] = r[k].slice(0, max);
    setup.rules = rules;
  }
  if (obj(raw.light)) {
    const l = raw.light;
    const trigger = TRIGGERS.some((t) => t.id === l.trigger) ? (l.trigger as string) : undefined;
    const mode = MODES.some((m) => m.id === l.mode) ? (l.mode as "smiles" | "all") : undefined;
    if (trigger || mode) setup.light = { ...(trigger && { trigger }), ...(mode && { mode }) };
  }
  return { setup, warnings };
}

export type RowState = "new" | "updated" | "unchanged" | "kept";

/** What importing would do, worked out before anything is written so the host can look first. */
export interface ImportPlan {
  setup: Setup;
  warnings: string[];
  /** The task list as it will be: the file's tasks in its order, then any party task with points that the file doesn't have. */
  rows: { id?: string; title: string; state: RowState }[];
  /** Party tasks the file doesn't have and nothing was scored on: they go. */
  removed: string[];
  /** The tiebreaker's name, when the file has one. */
  tiebreaker?: string;
  /** The secret pool the file brings, and the players whose dealt task isn't in it (they get it back to pick again). */
  secret?: { count: number; takenBack: string[] };
  light?: string;
  /** The rules the file brings, counted ("5 rules", "no rules"). */
  rules?: string;
  /** Songs the tasks name that aren't in this party's music folder. Absent until the main screen has read a folder. */
  missingSongs: string[];
}

const hasPoints = (t: ScoreboardTask) => ["scores", "results", "given", "bonus", "dq"].some((k) => Object.keys((t as unknown as Record<string, object | undefined>)[k] ?? {}).length > 0);

/** The party fields a file task sets: each is written, or cleared when the file doesn't have it. Points and results are never among them. */
const FIELDS = ["name", "game", "type", "text", "limit", "parts", "description", "song", "transition", "transitionImage", "transitionVideo", "scoring", "unit", "dqOver", "dqStays", "checkin", "draw", "minutes"] as const;
const fieldsOf = (t: SetupTask): Record<(typeof FIELDS)[number], unknown> => ({
  name: t.name, game: t.game, type: t.type, text: t.text, limit: t.limit, parts: t.parts, description: t.note, song: t.song, transition: t.transition, transitionImage: t.transitionImage, transitionVideo: t.transitionVideo, scoring: t.scoring, unit: t.unit, dqOver: t.dqOver, dqStays: t.dqStays, checkin: t.checkin, draw: t.draw, minutes: t.minutes,
});
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Which party task each file task is: the same id, else the same app game (Photos can be on more than once), else the same name. */
function match(setup: Setup, tasks: [string, ScoreboardTask][]): (string | undefined)[] {
  const taken = new Set<string>();
  return setup.tasks.map((ft) => {
    const found = tasks.find(([id]) => !taken.has(id) && ft.id && id === ft.id)
      ?? tasks.find(([id, t]) => !taken.has(id) && ft.game && ft.game !== "photos" && t.game === ft.game)
      ?? tasks.find(([id, t]) => !taken.has(id) && ft.name && t.game === ft.game && t.name?.toLowerCase() === ft.name.toLowerCase());
    if (found) taken.add(found[0]);
    return found?.[0];
  });
}

export function planImport(setup: Setup, warnings: string[], session: Session, secret: SecretTasks | null | undefined): ImportPlan {
  const party = Object.entries(session.scoreboard?.tasks ?? {}).sort(([, a], [, b]) => a.order - b.order);
  const matched = match(setup, party);
  const byId = Object.fromEntries(party);
  const rows: ImportPlan["rows"] = setup.tasks.map((ft, i) => {
    const id = matched[i];
    const title = titleOf({ order: 0, name: ft.name, game: ft.game });
    if (!id) return { title, state: "new" as const };
    const now = byId[id] as unknown as Record<string, unknown>;
    const fields = fieldsOf(ft);
    const have: Record<string, unknown> = { ...now, parts: asParts(now.parts).length ? asParts(now.parts) : undefined };
    return { id, title, state: FIELDS.every((k) => sameValue(fields[k], have[k])) ? "unchanged" as const : "updated" as const };
  });
  const left = party.filter(([id]) => !matched.includes(id));
  const kept = left.filter(([, t]) => hasPoints(t));
  rows.push(...kept.map(([id, t]) => ({ id, title: titleOf(t), state: "kept" as const })));

  const pool = setup.secretTasks;
  const takenBack = pool
    ? Object.entries(secret?.assigned ?? {}).filter(([, text]) => !pool.some((p) => same(p, text))).map(([uid]) => session.players?.[uid]?.name ?? "Someone")
    : [];
  const tracks = session.jukebox?.tracks;
  const songs = [...setup.tasks.map((t) => t.song), setup.tiebreaker?.song].filter((s): s is string => !!s);
  const light = setup.light && (setup.light.mode ? findMode(setup.light.mode)?.label : setup.light.trigger && findTrigger(setup.light.trigger).label);
  return {
    setup, warnings, rows,
    removed: left.filter(([, t]) => !hasPoints(t)).map(([, t]) => titleOf(t)),
    ...(setup.tiebreaker && { tiebreaker: setup.tiebreaker.name || "Tiebreaker task" }),
    ...(pool && { secret: { count: pool.length, takenBack } }),
    ...(light && { light }),
    ...(setup.rules && { rules: rulesCount({ ...session, rules: setup.rules }) }),
    missingSongs: tracks ? [...new Set(songs.filter((s) => !tracks.includes(s)))] : [],
  };
}

/** The writes an import makes, worked out apart from the database so they can be checked. `newKey` makes the id of each task and pool entry that's new. */
export function importWrites(setup: Setup, session: Session, secret: SecretTasks | null | undefined, newKey: () => string) {
  const party = Object.entries(session.scoreboard?.tasks ?? {}).sort(([, a], [, b]) => a.order - b.order);
  const matched = match(setup, party);
  const board: Record<string, unknown> = {};
  setup.tasks.forEach((ft, i) => {
    const id = matched[i] ?? newKey();
    board[`tasks/${id}/order`] = i;
    for (const [k, v] of Object.entries(fieldsOf(ft))) board[`tasks/${id}/${k}`] = v ?? null;
  });
  const left = party.filter(([id]) => !matched.includes(id));
  let after = setup.tasks.length;
  for (const [id, t] of left) {
    if (hasPoints(t)) board[`tasks/${id}/order`] = after++;
    else board[`tasks/${id}`] = null;
  }
  const tb = setup.tiebreaker;
  if (tb) {
    board["tiebreaker/name"] = tb.name ?? null;
    board["tiebreaker/description"] = tb.note ?? null;
    board["tiebreaker/song"] = tb.song ?? null;
    board["tiebreaker/type"] = tb.type ?? null;
    board["tiebreaker/text"] = tb.text ?? null;
    board["tiebreaker/limit"] = tb.limit ?? null;
    board["tiebreaker/parts"] = tb.parts ?? null;
  }
  const light = setup.light && { trigger: setup.light.trigger ?? null, mode: setup.light.mode ?? null };
  let secretPatch: Record<string, unknown> | undefined;
  if (setup.secretTasks) {
    const pool: Record<string, string> = {};
    for (const text of setup.secretTasks) {
      const have = Object.entries(secret?.pool ?? {}).find(([id, t]) => !(id in pool) && same(t, text));
      pool[have?.[0] ?? newKey()] = text;
    }
    secretPatch = { pool: setup.secretTasks.length ? pool : null };
    for (const [uid, text] of Object.entries(secret?.assigned ?? {})) {
      if (!setup.secretTasks.some((p) => same(p, text))) { secretPatch[`assigned/${uid}`] = null; secretPatch[`seen/${uid}`] = null; }
    }
  }
  const rules = setup.rules && { text: setup.rules.text ?? null, last: setup.rules.last ?? null, signOff: setup.rules.signOff ?? null };
  return { board, light, rules, secret: secretPatch };
}

/**
 * Host: makes the party match the file. The task list is the file's, in its order: matched tasks are updated in place and keep their
 * points, new ones are added, the rest go unless something was scored on them (those stay at the end). The tiebreaker, secret pool,
 * light and Taskmaster rules are replaced when the file has them; a dealt secret task that isn't in the new pool goes back to its player to pick again.
 */
export async function applyImport(code: string, session: Session, setup: Setup): Promise<void> {
  const secretRef = ref(db(), `secretTasks/${code}`);
  const secret = setup.secretTasks ? ((await get(secretRef)).val() as SecretTasks | null) : null;
  const tasksRef = ref(db(), `sessions/${code}/scoreboard/tasks`);
  const writes = importWrites(setup, session, secret, () => push(tasksRef).key!);
  await update(ref(db(), `sessions/${code}/scoreboard`), writes.board);
  if (writes.light) await update(ref(db(), `sessions/${code}/light`), writes.light);
  if (writes.rules) await update(ref(db(), `sessions/${code}/rules`), writes.rules);
  if (writes.secret) await update(secretRef, writes.secret);
}

import { get, ref } from "firebase/database";
import { db } from "./firebase";
import { asParts, sorted } from "./scoreboard/tasks";
import type { PartyRules, ScoreboardTask, Session, TaskGame, TaskPart, TaskUnit } from "./types";

/** What a party's setup file says it is, so the importer can tell it from any other JSON. */
export const SETUP_FORMAT = "taskmaster-party-setup";
/** Bumped when the file's shape changes in a way an older app couldn't read. */
export const SETUP_VERSION = 1;

/** A task as the file keeps it: its setup, never what the night did to it (points, results, DQs, bonuses). Only the keys it uses. */
export interface SetupTask {
  id: string;
  name?: string;
  game?: TaskGame;
  type?: string;
  text?: string;
  /** Part 1's time limit in ms, which the ⏱ clock offers. */
  limit?: number;
  /** Parts 2, 3… of the words, each with its own time limit if it has one; `type`, `text` and `limit` are part 1. */
  parts?: TaskPart[];
  note?: string;
  song?: string;
  /** The transition that plays when the task starts: music (a title), a picture and a video (file names). The files stay on the main-screen PC. */
  transition?: string;
  transitionImage?: string;
  transitionVideo?: string;
  scoring?: "highest" | "lowest";
  unit?: TaskUnit;
  dqOver?: number;
  dqStays?: true;
  /** Flipchart: what the guests draw, and the minutes they get. */
  draw?: string;
  minutes?: number;
}

/** The party's setup: what the host plans before the night. */
export interface Setup {
  format: typeof SETUP_FORMAT;
  version: number;
  name?: string;
  tasks: SetupTask[];
  /** Like a task, but with no id and no winner: every party has one and it's played only on a tie. */
  tiebreaker?: Omit<SetupTask, "id">;
  secretTasks?: string[];
  /** The light's trigger and mode. Never whether it's switched on: a new party's light starts off. */
  light?: { trigger?: string; mode?: "smiles" | "all" };
  /** The Taskmaster rules, only where they differ from the standard words (`{}` is the standard rules; "" is none). */
  rules?: PartyRules;
}

const taskOf = (t: ScoreboardTask): Omit<SetupTask, "id"> => ({
  ...(t.name && { name: t.name }),
  ...(t.game && { game: t.game }),
  ...(t.type && { type: t.type }),
  ...(t.text && { text: t.text }),
  ...(t.limit && { limit: t.limit }),
  ...(asParts(t.parts).length > 0 && { parts: asParts(t.parts) }),
  ...(t.description && { note: t.description }),
  ...(t.song && { song: t.song }),
  ...(t.transition && { transition: t.transition }),
  ...(t.transitionImage && { transitionImage: t.transitionImage }),
  ...(t.transitionVideo && { transitionVideo: t.transitionVideo }),
  ...(t.scoring && { scoring: t.scoring }),
  ...(t.unit && { unit: t.unit }),
  ...(t.dqOver !== undefined && { dqOver: t.dqOver }),
  ...(t.dqStays && { dqStays: true as const }),
  ...(t.draw && { draw: t.draw }),
  ...(t.minutes !== undefined && { minutes: t.minutes }),
});

/** The setup file's content for a party. `secretTasks` is the pool, which lives outside the session. */
export function buildSetup(session: Session, secretTasks: string[]): Setup {
  const board = session.scoreboard;
  const tb = board?.tiebreaker;
  const tiebreaker = tb && taskOf({ order: 0, name: tb.name, description: tb.description, song: tb.song, type: tb.type, text: tb.text, limit: tb.limit, parts: tb.parts });
  const { trigger, mode } = session.light ?? {};
  return {
    format: SETUP_FORMAT,
    version: SETUP_VERSION,
    ...(session.name && { name: session.name }),
    tasks: sorted(board?.tasks).map(([id, t]) => ({ id, ...taskOf(t) })),
    ...(tiebreaker && Object.keys(tiebreaker).length > 0 && { tiebreaker }),
    ...(secretTasks.length > 0 && { secretTasks }),
    ...((trigger || mode) && { light: { ...(trigger && { trigger }), ...(mode && { mode }) } }),
    rules: { ...session.rules },
  };
}

/** The file's name: the party's name, or its code. Anything a file system dislikes goes. */
export const setupFileName = (session: Session, code: string) =>
  `${(session.name ?? "").replace(/[^\p{L}\p{N} _.-]/gu, "").trim() || code}.taskmaster.json`;

/**
 * Host: hands the party's setup over as a file, through the share sheet where the browser has one (Files, AirDrop, Mail)
 * and as a plain download where it doesn't. A cancelled share sheet isn't an error.
 */
export async function exportSetup(code: string, session: Session): Promise<void> {
  const pool = ((await get(ref(db(), `secretTasks/${code}/pool`))).val() ?? {}) as Record<string, string>;
  const setup = buildSetup(session, Object.values(pool));
  const name = setupFileName(session, code);
  const file = new File([JSON.stringify(setup, null, 2) + "\n"], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); }
    catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) throw e; }
    return;
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { get, onValue, push, ref, remove, set, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { enterPoints, taskFor } from "../../scoreboard/data";
import { setDisplay } from "../../session";
import type { SecretReveal, SecretTasks, Session } from "../../types";

/** Two tasks are the same if they match ignoring capitals, spacing and punctuation. */
export const same = (a: string, b: string) => key(a) === key(b);
const key = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

/** Tasks in the pool that nobody has been dealt yet, in the order the host typed them. */
export function undealtOf(tasks: SecretTasks | null | undefined): [id: string, text: string][] {
  const dealt = Object.values(tasks?.assigned ?? {});
  return Object.entries(tasks?.pool ?? {}).filter(([, text]) => !dealt.some((d) => same(d, text)));
}

/**
 * Everything about the party's secret tasks. Only the host, the host phone and the main screen can read
 * it (see the rules); for anyone else this stays null. Undefined while loading.
 */
export function useSecretTasks(code: string, enabled = true): SecretTasks | null | undefined {
  const [tasks, setTasks] = useState<SecretTasks | null | undefined>(enabled ? undefined : null);
  useEffect(() => {
    if (!enabled) { setTasks(null); return; }
    setTasks(undefined);
    return onValue(ref(db(), `secretTasks/${code}`), (s) => setTasks((s.val() as SecretTasks | null) ?? {}), () => setTasks(null));
  }, [code, enabled]);
  return tasks;
}

/** A player's own secret task: null if they haven't been dealt one yet. Undefined while loading. */
export function useMyTask(code: string, uid: string): string | null | undefined {
  const [task, setTask] = useState<string | null | undefined>();
  useEffect(() => {
    setTask(undefined);
    return onValue(ref(db(), `secretTasks/${code}/assigned/${uid}`), (s) => setTask(s.exists() ? (s.val() as string) : null), () => setTask(null));
  }, [code, uid]);
  return task;
}

/** The rules, as a Taskmaster task: shown on a guest's phone before they pick, and behind "Read the task again". */
export const RULES = [
  "Secretly complete your secret task.",
  "Select a secret task and read it silently to yourself. You must complete your secret task before the TASKMASTER says, \u201ccan everyone keep a secret?\u201d",
  "You must complete your task secretly, but also perceptibly.",
  "You must not reveal your secret task to anyone else.",
  "Your time starts now.",
] as const;

/** Part 2, the reveal, as a Taskmaster task: what the host reads out (or puts on the big screen) before the first envelope. */
export const PART_2 = [
  "Divulge each other\u2019s secrets.",
  "The TASKMASTER will name a guest. Quickly and secretly write down the named guest\u2019s secret task. When instructed by the TASKMASTER, simultaneously reveal what you have written.",
  "You will repeat this process for each guest.",
  "You will receive a point for each correctly identified secret task.",
  "You will receive a bonus point if nobody correctly identifies your secret task.",
] as const;

/** A new party's Secret Tasks: the rules as Part 1, the reveal as Part 2. The host can change either on its ✎ page. */
export const DEFAULT_WORDS = {
  type: "Secret Task",
  text: RULES.join("\n\n"),
  parts: [{ type: "Secret Tasks", text: PART_2.join("\n\n") }],
};

/** The rules guests read on their phones: this party's Part 1, a paragraph a line, or the built-in rules if it has none. */
export function rulesOf(session: Session): readonly string[] {
  const text = Object.values(session.scoreboard?.tasks ?? {}).find((t) => t.game === "secretTasks")?.text;
  const lines = (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines : RULES;
}

/** Whether this player has opened their envelope before. Undefined while loading. */
export function useSeen(code: string, uid: string): boolean | undefined {
  const [seen, setSeen] = useState<boolean>();
  useEffect(() => {
    setSeen(undefined);
    return onValue(ref(db(), `secretTasks/${code}/seen/${uid}`), (s) => setSeen(s.exists()), () => setSeen(false));
  }, [code, uid]);
  return seen;
}

/** Player: notes that they've opened their envelope, so the host phone stops flagging them. */
export const markSeen = (code: string, uid: string) => set(ref(db(), `secretTasks/${code}/seen/${uid}`), true);

/**
 * Who the host should see to: players who haven't opened their envelope yet (or haven't picked one while
 * there are envelopes to pick), and players waiting for an envelope while the pile is empty.
 */
export function needsOf(session: Session, tasks: SecretTasks | null | undefined): { unseen: string[]; waiting: string[] } {
  if (!tasks) return { unseen: [], waiting: [] };
  const players = Object.entries(session.players ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
  const left = undealtOf(tasks).length;
  return {
    unseen: players.filter(([uid]) => !tasks.seen?.[uid] && (tasks.assigned?.[uid] || left > 0)).map(([uid]) => uid),
    waiting: players.filter(([uid]) => !tasks.assigned?.[uid] && left === 0).map(([uid]) => uid),
  };
}

/** Host: adds tasks to the pool, skipping any already in it. Returns how many were new. */
export async function addTasks(code: string, texts: string[]): Promise<number> {
  // Checked against the pool as it is now, not as this phone last heard of it, so a stale or missing view can't let a duplicate in.
  const poolRef = ref(db(), `secretTasks/${code}/pool`);
  const have = Object.values((await get(poolRef)).val() ?? {}) as string[];
  const fresh: string[] = [];
  for (const raw of texts) {
    const text = raw.trim().slice(0, 300);
    if (text && ![...have, ...fresh].some((t) => same(t, text))) fresh.push(text);
  }
  await update(poolRef, Object.fromEntries(fresh.map((text) => [push(poolRef).key!, text])));
  return fresh.length;
}

/**
 * Host: corrects a task in place, in the pool and for anyone already dealt it, so they keep the same task,
 * corrected. Returns false if the new wording matches another task already in the pool.
 */
export async function editTask(code: string, from: string, to: string): Promise<boolean> {
  const text = to.trim().slice(0, 300);
  const root = ref(db(), `secretTasks/${code}`);
  const now = ((await get(root)).val() ?? {}) as SecretTasks;
  if (!text || Object.values(now.pool ?? {}).some((t) => same(t, text) && !same(t, from))) return false;
  const u: Record<string, string> = {};
  for (const [id, t] of Object.entries(now.pool ?? {})) if (same(t, from)) u[`pool/${id}`] = text;
  for (const [uid, t] of Object.entries(now.assigned ?? {})) if (same(t, from)) u[`assigned/${uid}`] = text;
  await update(root, u);
  return true;
}

/**
 * Envelopes nobody picked roll forward from party to party, on this host phone's account
 * (hostLeftovers/{uid}/{code}), until the host adds them to a pile or forgets them.
 */
type Leftovers = Record<string, { at: number; tasks?: string[] }>;

/** Host phone, always on: keeps this party's undealt tasks on record as its leftovers. */
export function useRecordLeftovers(code: string, uid: string | undefined, tasks: SecretTasks | null | undefined) {
  const undealt = JSON.stringify(undealtOf(tasks).map(([, t]) => t));
  useEffect(() => {
    if (!uid || !tasks) return;
    const list = JSON.parse(undealt) as string[];
    const at = ref(db(), `hostLeftovers/${uid}/${code}`);
    void (list.length ? set(at, { at: Date.now(), tasks: list }) : remove(at)).catch(() => {});
  }, [code, uid, undealt, tasks === undefined || tasks === null]);
}

/** Host: leftovers from earlier parties that aren't in tonight's pool, oldest first. Undefined while loading. */
export function useLeftovers(code: string, uid: string | undefined, tasks: SecretTasks | null | undefined): string[] | undefined {
  const [all, setAll] = useState<Leftovers | null>();
  useEffect(() => {
    if (!uid) return;
    return onValue(ref(db(), `hostLeftovers/${uid}`), (s) => setAll((s.val() as Leftovers | null) ?? {}), () => setAll(null));
  }, [uid]);
  if (all === undefined || tasks === undefined) return undefined;
  const pool = Object.values(tasks?.pool ?? {});
  const out: string[] = [];
  for (const [, party] of Object.entries(all ?? {}).filter(([c]) => c !== code).sort(([, a], [, b]) => a.at - b.at)) {
    for (const t of party.tasks ?? []) if (![...pool, ...out].some((p) => same(p, t))) out.push(t);
  }
  return out;
}

/** Host: clears the leftovers of every earlier party (after adding them, or to forget them). */
export async function clearLeftovers(code: string, uid: string) {
  const all = ((await get(ref(db(), `hostLeftovers/${uid}`))).val() ?? {}) as Leftovers;
  await update(ref(db(), `hostLeftovers/${uid}`), Object.fromEntries(Object.keys(all).filter((c) => c !== code).map((c) => [c, null])));
}

/** Host: takes a task out of the pool. A player who was already dealt it keeps it. */
export const removeTask = (code: string, id: string) => remove(ref(db(), `secretTasks/${code}/pool/${id}`));

/**
 * Host (rarely): takes a player's task back. It goes back on the pile (it's still in the pool, just no longer
 * dealt), and the player's phone goes back to picking an envelope.
 */
export const returnTask = (code: string, uid: string) =>
  update(ref(db(), `secretTasks/${code}`), { [`assigned/${uid}`]: null, [`seen/${uid}`]: null });

/** Host: deals a random undealt task to every player who has none (for anyone who hasn't picked an envelope). */
export function dealRest(code: string, session: Session, tasks: SecretTasks | null | undefined) {
  const free = undealtOf(tasks).map(([, text]) => text);
  const deal: Record<string, string> = {};
  for (const uid of Object.keys(session.players ?? {})) {
    if (tasks?.assigned?.[uid] || !free.length) continue;
    deal[uid] = free.splice(Math.floor(Math.random() * free.length), 1)[0]!;
  }
  return update(ref(db(), `secretTasks/${code}/assigned`), deal);
}

/** Player: picks an envelope from the pile. First pick of an envelope wins; the main screen then deals it. */
export const pickEnvelope = (code: string, id: string, uid: string) =>
  set(ref(db(), `sessions/${code}/games/secretTasks/picks/${id}`), uid);

/**
 * Main screen and host phone, whichever game is on: keeps the pile of sealed envelopes on players' phones in step with
 * the undealt tasks (one envelope per task, lying where it fell), and turns each player's pick into their
 * dealt task. A dealt task is never changed or dealt twice; a player gets only their first pick, and a
 * pick of an envelope someone else got first is dropped.
 */
export function useDealer(code: string, session: Session, enabled: boolean) {
  const tasks = useSecretTasks(code, enabled);
  const working = useRef(false);
  // Bumped when a write ends (or fails), so anything that arrived meanwhile gets dealt with, not dropped.
  const [again, setAgain] = useState(0);
  const mine = session.games?.secretTasks;
  // Everything the dealing depends on, so the effect runs only when something in it changes.
  const inputs = JSON.stringify([tasks, mine?.pile, mine?.picks, Object.keys(session.players ?? {}), again]);
  useEffect(() => {
    if (!enabled || !tasks || working.current) return;
    const root: Record<string, unknown> = {};
    const pool = tasks.pool ?? {};
    const assigned = { ...tasks.assigned };
    const dealt = new Set(Object.values(assigned).map(key));
    for (const [id, uid] of Object.entries(mine?.picks ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      const text = pool[id];
      if (text && session.players?.[uid] && !assigned[uid] && !dealt.has(key(text))) {
        assigned[uid] = text;
        dealt.add(key(text));
        root[`secretTasks/${code}/assigned/${uid}`] = text;
      }
      root[`sessions/${code}/games/secretTasks/picks/${id}`] = null;
    }
    const wanted = new Set(Object.entries(pool).filter(([, text]) => !dealt.has(key(text))).map(([id]) => id));
    for (const id of wanted) {
      if (!mine?.pile?.[id]) {
        root[`sessions/${code}/games/secretTasks/pile/${id}`] = { x: 6 + Math.random() * 78, y: 4 + Math.random() * 76, r: Math.round(Math.random() * 70 - 35) };
      }
    }
    for (const id of Object.keys(mine?.pile ?? {})) if (!wanted.has(id)) root[`sessions/${code}/games/secretTasks/pile/${id}`] = null;
    if (!Object.keys(root).length) return;
    working.current = true;
    update(ref(db()), root)
      .then(() => { working.current = false; setAgain((n) => n + 1); })
      .catch((e: unknown) => {
        // Tried again in a few seconds, so a hiccup doesn't leave a player stuck on "Opening it…".
        console.error("Secret Tasks: couldn't deal the picks", e);
        window.setTimeout(() => { working.current = false; setAgain((n) => n + 1); }, 3000);
      });
  }, [enabled, code, inputs]);
}

export const revealOf = (session: Session): SecretReveal | undefined => session.games?.secretTasks?.reveal;

/** Who is up in the reveal: the first player from `index` on who is still in the party. Undefined when everyone has had their turn. */
export function currentOf(session: Session, reveal: SecretReveal): { uid: string; pos: number } | undefined {
  for (let pos = reveal.index; pos < reveal.order.length; pos++) {
    const uid = reveal.order[pos]!;
    if (session.players?.[uid]) return { uid, pos };
  }
}

/**
 * Host: starts the reveal with every player who has a task, in random order, and puts it on the big screen,
 * opening on the title card ("Can everyone keep a secret?") until the host calls the first one up.
 */
export async function startReveal(code: string, session: Session, tasks: SecretTasks | null | undefined) {
  const uids = Object.keys(session.players ?? {}).filter((uid) => tasks?.assigned?.[uid]);
  const order = uids.map((uid) => [Math.random(), uid] as const).sort(([a], [b]) => a - b).map(([, uid]) => uid);
  await set(ref(db(), `sessions/${code}/games/secretTasks/reveal`), { order, index: 0, startedAt: Date.now(), title: true });
  await setDisplay(code, { step: "envelopes" });
}

/** Host: takes down the title card, so the first player's sealed envelope comes up. */
export const firstUp = (code: string) => update(ref(db(), `sessions/${code}/games/secretTasks/reveal`), { title: null });

/** Host: opens the envelope on the big screen, publishing that one task (it's no longer a secret) and keeping it for the finish screen. */
export const unseal = (code: string, uid: string, task: string) =>
  update(ref(db(), `sessions/${code}/games/secretTasks/reveal`), { task, [`shown/${uid}`]: task });

/** Host: seals the next envelope, for the next player (`index` = where to look from). */
export const nextEnvelope = (code: string, index: number) =>
  update(ref(db(), `sessions/${code}/games/secretTasks/reveal`), { index, task: null });

/** Host: brings a player who hasn't been up yet forward, so they're the one up now (at `pos` in the order). */
export function bringUp(code: string, reveal: SecretReveal, uid: string, pos: number) {
  const order = reveal.order.filter((id) => id !== uid);
  order.splice(pos, 0, uid);
  return update(ref(db(), `sessions/${code}/games/secretTasks/reveal`), { order });
}

/** Host: whether the owner did their task (null = not said yet). */
export const setDone = (code: string, owner: string, done: boolean | null) =>
  set(ref(db(), `sessions/${code}/games/secretTasks/reveal/scores/${owner}/done`), done);

/** Host: whether `guesser` guessed the owner's task. */
export const setGuessed = (code: string, owner: string, guesser: string, guessed: boolean) =>
  set(ref(db(), `sessions/${code}/games/secretTasks/reveal/scores/${owner}/guessed/${guesser}`), guessed || null);

/**
 * Everyone's points so far: 1 for doing your task, 1 for each task you guessed (not your own), and 1 more
 * if you did yours and nobody guessed it.
 */
export function pointsOf(reveal: SecretReveal): Record<string, number> {
  const points: Record<string, number> = {};
  const add = (uid: string, n: number) => { points[uid] = (points[uid] ?? 0) + n; };
  for (const [owner, turn] of Object.entries(reveal.scores ?? {})) {
    const guessers = Object.keys(turn.guessed ?? {}).filter((uid) => uid !== owner);
    if (turn.done) add(owner, guessers.length ? 1 : 2);
    for (const uid of guessers) add(uid, 1);
  }
  return points;
}

/**
 * Host: ends the reveal, putting the points scored so far on Secret Tasks' row of the scoreboard, as each guest's
 * points for the task (none for anyone on nothing); the big screen goes back to the curtain.
 */
export async function endReveal(code: string, session: Session) {
  const reveal = revealOf(session);
  const board = session.scoreboard;
  const id = taskFor(board, "secretTasks");
  if (reveal && id && reveal.scores) {
    const points = pointsOf(reveal);
    const given: Record<string, number | null> = Object.fromEntries(Object.keys(board?.contestants ?? {}).map((c) => [c, null]));
    for (const [uid, n] of Object.entries(points)) {
      const c = session.players?.[uid]?.contestant ?? Object.entries(board?.contestants ?? {}).find(([, x]) => x.uid === uid)?.[0];
      if (c && c in given && n > 0) given[c] = n;
    }
    await enterPoints(code, board, session.display?.step === "scoreboard", id, { given });
  }
  await setDisplay(code, { step: "list" });
  await remove(ref(db(), `sessions/${code}/games/secretTasks/reveal`));
}

/** Whether this party plays Secret Tasks: it's on the run of show (or being played). Until then guests' phones don't offer envelopes. */
export const secretTasksPlanned = (session: Session) =>
  session.game === "secretTasks" || Object.values(session.scoreboard?.tasks ?? {}).some((t) => t.game === "secretTasks");

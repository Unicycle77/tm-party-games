import { onValue, push, ref, remove, set, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { setDisplay } from "../../session";
import type { SecretReveal, SecretTasks, Session } from "../../types";

/** Two tasks are the same if they match ignoring capitals, spaces and stray punctuation at the ends. */
const same = (a: string, b: string) => key(a) === key(b);
const key = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();

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

/** Host: adds tasks to the pool, skipping any already in it. Returns how many were new. */
export async function addTasks(code: string, texts: string[], tasks: SecretTasks | null | undefined): Promise<number> {
  const have = [...Object.values(tasks?.pool ?? {})];
  const fresh: string[] = [];
  for (const raw of texts) {
    const text = raw.trim().slice(0, 300);
    if (text && ![...have, ...fresh].some((t) => same(t, text))) fresh.push(text);
  }
  const poolRef = ref(db(), `secretTasks/${code}/pool`);
  await update(poolRef, Object.fromEntries(fresh.map((text) => [push(poolRef).key!, text])));
  return fresh.length;
}

/** Host: takes a task out of the pool. A player who was already dealt it keeps it. */
export const removeTask = (code: string, id: string) => remove(ref(db(), `secretTasks/${code}/pool/${id}`));

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
 * Main screen, whichever game is on: keeps the pile of sealed envelopes on players' phones in step with
 * the undealt tasks (one envelope per task, lying where it fell), and turns each player's pick into their
 * dealt task. A dealt task is never changed or dealt twice; a player gets only their first pick, and a
 * pick of an envelope someone else got first is dropped.
 */
export function useDealer(code: string, session: Session, enabled: boolean) {
  const tasks = useSecretTasks(code, enabled);
  const working = useRef(false);
  const mine = session.games?.secretTasks;
  // Everything the dealing depends on, so the effect runs only when something in it changes.
  const inputs = JSON.stringify([tasks, mine?.pile, mine?.picks, Object.keys(session.players ?? {})]);
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
    void update(ref(db()), root).catch(() => {}).finally(() => { working.current = false; });
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

/** Host: starts the reveal with every player who has a task, in random order, and puts it on the big screen. */
export async function startReveal(code: string, session: Session, tasks: SecretTasks | null | undefined) {
  const uids = Object.keys(session.players ?? {}).filter((uid) => tasks?.assigned?.[uid]);
  const order = uids.map((uid) => [Math.random(), uid] as const).sort(([a], [b]) => a - b).map(([, uid]) => uid);
  await set(ref(db(), `sessions/${code}/games/secretTasks/reveal`), { order, index: 0, startedAt: Date.now() });
  await setDisplay(code, { step: "envelopes" });
}

/** Host: opens the envelope on the big screen, publishing that one task (it's no longer a secret). */
export const unseal = (code: string, task: string) => set(ref(db(), `sessions/${code}/games/secretTasks/reveal/task`), task);

/** Host: seals the next envelope, for the next player (`index` = where to look from). */
export const nextEnvelope = (code: string, index: number) =>
  update(ref(db(), `sessions/${code}/games/secretTasks/reveal`), { index, task: null });

/** Host: ends the reveal; the big screen goes back to the curtain. */
export async function endReveal(code: string) {
  await setDisplay(code, { step: "list" });
  await remove(ref(db(), `sessions/${code}/games/secretTasks/reveal`));
}

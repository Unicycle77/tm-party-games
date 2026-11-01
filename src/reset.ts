import { get, ref, remove, update } from "firebase/database";
import { db } from "./firebase";
import { DRAW_GAMES, GUEST_PARTS } from "./games/drawGames";
import type { SecretTasks, Session } from "./types";

/** What a task's points page enters and works out, all produced on the night (a task's setup, like `dqStays`, stays). */
const SCORED = ["scores", "given", "results", "restarts", "dq", "overDq", "bonus"] as const;

/**
 * Host: resets the party's scores, keeping its setup (contestants, tasks, the tiebreaker task, the Secret Tasks pool,
 * the light's trigger). Clears every task's points, the shown totals, the winner, the app games' progress, who got
 * the light, and the dealt secret tasks (back on the pile). With `guests`, every player goes too, with their
 * check-in, headshot and submissions. The big screen goes back to the curtain. It can't be undone.
 *
 * Each path is written on its own, because the rules give the host phone write access leaf by leaf, not to `games`.
 */
export async function resetScores(code: string, session: Session, guests: boolean) {
  const board = session.scoreboard;
  const games = session.games;
  const keys = (o: object | undefined) => Object.keys(o ?? {});
  const patch: Record<string, unknown> = {
    "scoreboard/shown": null,
    "scoreboard/final": null,
    // A reset is only offered on an unlocked party; clearing "unlocked" lets the night's offer to lock come back.
    "scoreboard/locked": null,
    "scoreboard/tiebreaker/winner": null,
    game: null,
    display: { step: "curtain" },
    conversion: null,
    clock: null,
    phoneText: null,
    "light/got": null,
    "light/wrong": null,
    "games/box/round": null,
    "games/noisemaster/round": null,
    "games/secretTasks/reveal": null,
  };
  for (const t of keys(board?.tasks)) for (const k of SCORED) patch[`scoreboard/tasks/${t}/${k}`] = null;
  for (const id of keys(games?.headshots?.shown)) patch[`games/headshots/shown/${id}`] = null;
  for (const id of keys(games?.prize?.presented)) patch[`games/prize/presented/${id}`] = null;
  for (const uid of keys(games?.box?.played)) patch[`games/box/played/${uid}`] = null;
  for (const uid of keys(games?.noisemaster?.played)) patch[`games/noisemaster/played/${uid}`] = null;
  for (const g of DRAW_GAMES) {
    for (const k of ["startedAt", "endsAt", "closed", "heldAt", "asked", "told"]) patch[`games/${g}/${k}`] = null;
    for (const part of GUEST_PARTS) for (const uid of keys(games?.[g]?.[part])) patch[`games/${g}/${part}/${uid}`] = null;
  }
  for (const id of keys(games?.secretTasks?.picks)) patch[`games/secretTasks/picks/${id}`] = null;

  if (guests) {
    for (const uid of keys(session.players)) patch[`players/${uid}`] = null;
    for (const uid of keys(session.moves)) patch[`moves/${uid}`] = null;
    for (const id of keys(board?.contestants)) {
      patch[`scoreboard/contestants/${id}/uid`] = null;
      patch[`scoreboard/contestants/${id}/photo`] = null;
      patch[`scoreboard/contestants/${id}/crop`] = null;
    }
    for (const id of keys(games?.prize?.photos)) patch[`games/prize/photos/${id}`] = null;
    for (const game of ["photos", "beforeAfter"] as const) {
      const data = games?.[game];
      for (const part of ["media", "unlocked", "shown"] as const) {
        for (const uid of keys(data?.[part])) patch[`games/${game}/${part}/${uid}`] = null;
      }
    }
    if (games?.photos?.sets) patch["games/photos/sets"] = null;
  }

  const secret = ((await get(ref(db(), `secretTasks/${code}`))).val() ?? {}) as SecretTasks;
  const secretPatch: Record<string, unknown> = { assigned: null };
  for (const uid of keys(secret.seen)) secretPatch[`seen/${uid}`] = null;

  await Promise.all([
    update(ref(db(), `sessions/${code}`), patch),
    update(ref(db(), `secretTasks/${code}`), secretPatch),
    remove(ref(db(), `boxSecrets/${code}`)),
    // Its own write, as where it's added to the task list (see addKeptGame).
    remove(ref(db(), `sessions/${code}/games/noisemaster/kept`)),
  ]);
}

import { onValue, push, ref, remove, serverTimestamp, set, update } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { setDisplay } from "../../session";
import type { NoisemasterRound, NoisemasterSecret, Session } from "../../types";

/** The soundboard is always 4 rows of 4. */
export const BUTTONS = 16;
/** The longest phrase the host can set. */
export const MAX_WORDS = 8;

const path = (code: string) => `sessions/${code}/games/noisemaster`;

export const roundOf = (session: Session): NoisemasterRound | undefined => session.games?.noisemaster?.round;

/** The sound names the main screen can play, as it published them. */
export const soundsOf = (session: Session): string[] => session.games?.noisemaster?.sounds ?? [];

/** Main screen: publishes the sound names found in its sounds folder. */
export const publishSounds = (code: string, names: string[]) => set(ref(db(), `${path(code)}/sounds`), names);

/**
 * Which sound is on which button. Only the host and the main screen can read it (see the rules), so the
 * player has to find out by listening; for anyone else, or before a round, this is null. Undefined while loading.
 */
export function useNoisemasterSecret(code: string, enabled: boolean): NoisemasterSecret | null | undefined {
  const [secret, setSecret] = useState<NoisemasterSecret | null | undefined>(enabled ? undefined : null);
  useEffect(() => {
    if (!enabled) { setSecret(null); return; }
    setSecret(undefined);
    return onValue(ref(db(), `noisemasterSecrets/${code}`), (s) => setSecret(s.exists() ? (s.val() as NoisemasterSecret) : null), () => setSecret(null));
  }, [code, enabled]);
  return secret;
}

/** Host: sets up a round on a board (the secret first, so the main screen has it before the first press). */
export async function startRound(code: string, player: string, phrase: string[], board: string[]) {
  await set(ref(db(), `noisemasterSecrets/${code}`), { board });
  await set(ref(db(), `${path(code)}/round`), { player, phrase, startedAt: Date.now() });
  await set(ref(db(), `${path(code)}/played/${player}`), true);
  await setDisplay(code, { step: "soundboard" });
}

/** Host: the same player, phrase and board again, from the first press (the clock stops and resets). */
export const restartRound = (code: string, round: NoisemasterRound) =>
  set(ref(db(), `${path(code)}/round`), { player: round.player, phrase: round.phrase, startedAt: Date.now() });

/** The player's phone: one press of button `i`. */
export const press = (code: string, i: number) =>
  push(ref(db(), `${path(code)}/round/presses`), { i, at: serverTimestamp() });

/** Main screen: where the round stands after a press it has checked. */
export const recordPress = (code: string, result: Required<Pick<NoisemasterRound, "progress" | "mistakes" | "firstAt" | "last">> & { doneAt: number | null }) =>
  update(ref(db(), `${path(code)}/round`), result);

/** Host: clears the round, ready to set up the next one. */
export async function newRound(code: string) {
  await setDisplay(code, { step: "list" });
  await Promise.all([remove(ref(db(), `${path(code)}/round`)), remove(ref(db(), `noisemasterSecrets/${code}`))]);
}

/** How far this browser's clock is behind the database's, so every screen shows the same clock. */
export function useServerOffset(): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => onValue(ref(db(), ".info/serverTimeOffset"), (s) => setOffset((s.val() as number | null) ?? 0)), []);
  return offset;
}

/** Server time now, ticking every tenth of a second while `running`. */
export function useServerNow(running: boolean): number {
  const offset = useServerOffset();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [running]);
  return now + offset;
}

/** How long the attempt has taken: from the first press to the last word, or to `now` while it's going. */
export const elapsedOf = (round: NoisemasterRound, now: number): number =>
  round.firstAt ? Math.max(0, (round.doneAt ?? now) - round.firstAt) : 0;

/** "0:41.2" */
export function formatTime(ms: number): string {
  const tenths = Math.floor(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths % 10}`;
}

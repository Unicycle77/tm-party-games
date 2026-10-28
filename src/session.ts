import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { get, onDisconnect, onValue, push, ref, remove, serverTimestamp, set, update } from "firebase/database";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { store } from "./store";
import { type BeforeAfterMedia, type Display, type GameData, type GameId, type Jukebox, type Player, type ScoreboardContestant, type Session, type ShownConversion } from "./types";

let signIn: Promise<User> | undefined;

/** Anonymous auth; the uid persists in the browser so refreshes keep identity. */
export function ensureSignedIn(): Promise<User> {
  const a = auth();
  signIn ??= new Promise<User>((resolve, reject) => {
    const unsub = onAuthStateChanged(a, (user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
    // If a persisted user exists, onAuthStateChanged fires with it; otherwise create one.
    a.authStateReady().then(() => {
      if (!a.currentUser) signInAnonymously(a).catch((e: unknown) => { signIn = undefined; reject(e); });
    });
  });
  return signIn;
}

export function useUid(): string | undefined {
  const [uid, setUid] = useState<string>();
  useEffect(() => {
    let live = true;
    ensureSignedIn().then((u) => live && setUid(u.uid), () => {});
    return () => { live = false; };
  }, []);
  return uid;
}

// Excludes visually ambiguous characters: 0/O, 1/I/L.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function freeCode(): Promise<string> {
  for (let i = 0; i < 25; i++) {
    let code = "";
    for (let j = 0; j < 4; j++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (!(await get(ref(db(), `sessions/${code}/hostUid`))).exists()) return code;
  }
  throw new Error("Could not find a free session code, please try again.");
}

/** Main screen: creates a session and returns its code. */
/** Every party has a Headshot task and a Prize task, so a new one starts with them on its list. */
function starterScoreboard(code: string) {
  const id = () => push(ref(db(), `sessions/${code}/scoreboard/tasks`)).key!;
  return { tasks: { [id()]: { order: 0, game: "headshots" }, [id()]: { order: 1, game: "prize" } } };
}

export async function createSession(): Promise<string> {
  const user = await ensureSignedIn();
  const code = await freeCode();
  await set(ref(db(), `sessions/${code}`), {
    hostUid: user.uid,
    createdAt: serverTimestamp(),
    display: { step: "list" },
    scoreboard: starterScoreboard(code),
  });
  return code;
}

/**
 * Host remote: creates a party ahead of time, with no big screen yet. The remote is its host and its
 * controller until a big screen opens the party (see `resumeSession`).
 */
export async function createParty(rawName: string): Promise<string> {
  const user = await ensureSignedIn();
  const code = await freeCode();
  await set(ref(db(), `sessions/${code}`), {
    hostUid: user.uid,
    controllerUid: user.uid,
    name: rawName.trim(),
    createdAt: serverTimestamp(),
    display: { step: "list" },
    scoreboard: starterScoreboard(code),
  });
  return code;
}

/** A party made on the host remote that no big screen has opened yet. */
export const noBigScreen = (session: Session) => !!session.controllerUid && session.hostUid === session.controllerUid;

export class JoinError extends Error {}

/** Joining with a name someone already has (ignoring capitals and spaces): maybe them, on another phone. */
export class SameNameError extends JoinError {
  constructor(readonly taken: string) { super(`There's already a ${taken} here. Is that you on another phone?`); }
}

/** Names match ignoring capitals and spaces ("sam " is Sam). */
export const sameName = (a: string, b: string) => {
  const key = (n: string) => n.toLowerCase().replace(/\s+/g, "");
  return key(a) === key(b);
};

/**
 * Main screen: picks up an existing session by its code, e.g. after "End session" or on another computer.
 * Taking it over moves `hostUid` to this browser, which sends the previous screen back to its start page.
 */
/** Follows which screen owns a session (its hostUid; null once the session is gone). Returns an unsubscribe. */
export const watchHost = (code: string, onChange: (hostUid: string | null) => void) =>
  onValue(ref(db(), `sessions/${code}/hostUid`), (s) => onChange(s.exists() ? (s.val() as string) : null));

/**
 * Main screen, before resuming: does the session exist, and was it last opened on a different screen?
 * A party made on the host remote that no screen has opened yet isn't "elsewhere": this screen just takes it.
 */
export async function checkResume(rawCode: string): Promise<{ code: string; elsewhere: boolean; pin?: PinNeededError }> {
  const code = rawCode.trim().toUpperCase();
  const user = await ensureSignedIn();
  const hostUid = await get(ref(db(), `sessions/${code}/hostUid`));
  if (!hostUid.exists()) throw new JoinError(`No session found for code ${code}.`);
  const controllerUid = (await get(ref(db(), `sessions/${code}/controllerUid`))).val() as string | null;
  // A pinned party asks this browser for the pin, unless it has entered it before (or is already the big screen).
  const pin = hostUid.val() !== user.uid && (await get(ref(db(), `sessions/${code}/hostPin`))).exists() && !(await knowsPin(code))
    ? new PinNeededError(code, (await get(ref(db(), `sessions/${code}/name`))).val() as string | null) : undefined;
  return { code, elsewhere: hostUid.val() !== user.uid && hostUid.val() !== controllerUid, pin };
}

export async function resumeSession(rawCode: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  const user = await ensureSignedIn();
  const hostUid = await get(ref(db(), `sessions/${code}/hostUid`));
  if (!hostUid.exists()) throw new JoinError(`No session found for code ${code}.`);
  if (hostUid.val() !== user.uid) await set(ref(db(), `sessions/${code}/hostUid`), user.uid);
  return code;
}

/**
 * Joining by typing a name. When the party has a guest list (the scoreboard's contestants), a name that's
 * on it checks in as that guest (as tapping it would), and a name that isn't joins the scoreboard too.
 */
export async function joinSession(rawCode: string, rawName: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  const name = rawName.trim();
  if (!name) throw new JoinError("Please enter a name.");
  const user = await ensureSignedIn();
  if (!(await get(ref(db(), `sessions/${code}/hostUid`))).exists()) {
    throw new JoinError(`No session found for code ${code}.`);
  }
  if (typeof (await get(ref(db(), `sessions/${code}/scoreboard/locked`))).val() === "number") throw new JoinError(await overLine(code));
  const players = ((await get(ref(db(), `sessions/${code}/players`))).val() ?? {}) as Record<string, Player>;
  const clash = Object.entries(players).find(([uid, p]) => uid !== user.uid && sameName(p.name, name));
  if (clash) throw new SameNameError(clash[1].name);
  const guests = ((await get(ref(db(), `sessions/${code}/scoreboard/contestants`))).val() ?? {}) as Record<string, ScoreboardContestant>;
  // A name that's on the list checks them in as that guest, just as tapping it would.
  const listed = Object.entries(guests).find(([, c]) => sameName(c.name, name));
  if (listed) return joinAsContestant(code, listed[0]);
  // A brand-new player starts clean: clear anything left behind by an earlier stint or a partial removal.
  // (Someone reconnecting with their player record still in place keeps their submission.)
  if (!(await get(ref(db(), `sessions/${code}/players/${user.uid}`))).exists()) {
    await clearSubmissions(code, user.uid);
  }
  if (Object.keys(guests).length === 0) {
    await set(ref(db(), `sessions/${code}/players/${user.uid}`), { name, joinedAt: serverTimestamp() });
    return code;
  }
  // Not on the guest list: they join the scoreboard as well (and add their headshot next).
  const id = push(ref(db(), `sessions/${code}/scoreboard/contestants`)).key!;
  const order = Math.max(-1, ...Object.values(guests).map((c) => c.order)) + 1;
  await set(ref(db(), `sessions/${code}/scoreboard/contestants/${id}`), { name, order, uid: user.uid });
  await set(ref(db(), `sessions/${code}/players/${user.uid}`), { name, joinedAt: serverTimestamp(), contestant: id });
  return code;
}

/** What a locked party says to anyone new trying to join. */
export const partyOver = (name: string | undefined) => `${name ?? "This party"} is over, so nobody new can join.`;
const overLine = async (code: string) => partyOver((await get(ref(db(), `sessions/${code}/name`))).val() ?? undefined);

/** The name a guest tapped is already checked in on another phone: maybe theirs (see askToMove). */
/** A party with no host pin whose remote is on another phone: this one can ask it to hand over. */
export class RemoteTakenError extends JoinError {
  constructor(readonly code: string, readonly partyName: string | null) { super("This party already has a host remote."); }
}

export class TakenError extends JoinError {
  constructor(readonly taken: string) { super(`${taken} is already checked in on another phone.`); }
}

/** Joining by tapping a name on the guest list (the scoreboard's contestants). */
export async function joinAsContestant(rawCode: string, id: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  const user = await ensureSignedIn();
  const snap = await get(ref(db(), `sessions/${code}`));
  if (!snap.exists()) throw new JoinError(`No session found for code ${code}.`);
  const session = snap.val() as Session;
  const guest = session.scoreboard?.contestants?.[id];
  if (!guest) throw new JoinError("That name isn't on the list any more. Ask the host.");
  if (guest.uid && guest.uid !== user.uid && session.players?.[guest.uid]) throw new TakenError(guest.name);
  // A locked party takes nobody new: only a guest who's in already, moving phones (above, through the host).
  if (typeof session.scoreboard?.locked === "number" && !session.players?.[user.uid]) throw new JoinError(partyOver(session.name));
  if (!session.players?.[user.uid]) await clearSubmissions(code, user.uid);
  await update(ref(db(), `sessions/${code}`), {
    [`scoreboard/contestants/${id}/uid`]: user.uid,
    [`players/${user.uid}`]: { name: guest.name, joinedAt: serverTimestamp(), contestant: id },
  });
  return code;
}

/** New phone: asks the host to move the player with this name here (see MoveRequest). */
export async function askToMove(rawCode: string, name: string): Promise<void> {
  const code = rawCode.trim().toUpperCase();
  const user = await ensureSignedIn();
  const players = ((await get(ref(db(), `sessions/${code}/players`))).val() ?? {}) as Record<string, Player>;
  const from = Object.entries(players).find(([uid, p]) => uid !== user.uid && sameName(p.name, name))?.[0];
  if (!from) throw new JoinError("That name isn't taken any more. Try joining again.");
  await set(ref(db(), `sessions/${code}/moves/${user.uid}`), { from, status: "asked" });
}

/** New phone: withdraws its request (or clears a declined one). */
export const cancelMove = async (code: string) =>
  remove(ref(db(), `sessions/${code}/moves/${(await ensureSignedIn()).uid}`));

/**
 * Host: moves a player to the phone that asked, with everything they've submitted, in one write.
 * Their place in the show (on screen now, shown, a Box round) moves with them.
 */
export async function allowMove(code: string, session: Session, to: string) {
  const from = session.moves?.[to]?.from;
  const player = from && session.players?.[from];
  if (!from || !player) return;
  const u: Record<string, unknown> = { [`players/${to}`]: player, [`players/${from}`]: null, [`moves/${to}/status`]: "allowed" };
  const carry = (path: string, value: unknown) => {
    if (value === undefined) return;
    u[`${path}/${to}`] = value;
    u[`${path}/${from}`] = null;
  };
  for (const game of SUBMISSION_GAMES) {
    const data = session.games?.[game] as GameData<unknown> | undefined;
    carry(`games/${game}/media`, data?.media?.[from]);
    carry(`games/${game}/unlocked`, data?.unlocked?.[from]);
    carry(`games/${game}/shown`, data?.shown?.[from]);
  }
  // Photo tasks put away for later keep their photos too.
  for (const [task, set] of Object.entries(session.games?.photos?.sets ?? {})) {
    carry(`games/photos/sets/${task}/media`, set.media?.[from]);
    carry(`games/photos/sets/${task}/unlocked`, set.unlocked?.[from]);
    carry(`games/photos/sets/${task}/shown`, set.shown?.[from]);
  }
  for (const part of ["pages", "submitted", "unlocked", "shown"] as const) carry(`games/flipchart/${part}`, session.games?.flipchart?.[part]?.[from]);
  carry("games/box/played", session.games?.box?.played?.[from]);
  carry("games/noisemaster/played", session.games?.noisemaster?.played?.[from]);
  const round = session.games?.box?.round;
  if (round?.players.a === from) u["games/box/round/players/a"] = to;
  if (round?.players.b === from) u["games/box/round/players/b"] = to;
  if (round?.peeker === from) u["games/box/round/peeker"] = to;
  if (session.games?.noisemaster?.round?.player === from) u["games/noisemaster/round/player"] = to;
  // A secret task is dealt to the player, so it moves with them (outside the session, so a separate write).
  const task = await get(ref(db(), `secretTasks/${code}/assigned/${from}`));
  if (task.exists()) await update(ref(db(), `secretTasks/${code}/assigned`), { [to]: task.val(), [from]: null });
  const seen = await get(ref(db(), `secretTasks/${code}/seen/${from}`));
  if (seen.exists()) await update(ref(db(), `secretTasks/${code}/seen`), { [to]: true, [from]: null });
  const order = session.games?.secretTasks?.reveal?.order;
  if (order?.includes(from)) u["games/secretTasks/reveal/order"] = order.map((id) => (id === from ? to : id));
  if (session.display?.uid === from) u["display/uid"] = to;
  // Their place on the guest list moves too, so the scoreboard's headshot stays theirs.
  for (const [id, c] of Object.entries(session.scoreboard?.contestants ?? {})) if (c.uid === from) u[`scoreboard/contestants/${id}/uid`] = to;
  await update(ref(db(), `sessions/${code}`), u);
}

export const declineMove = (code: string, to: string) => set(ref(db(), `sessions/${code}/moves/${to}/status`), "declined");

/** A pinned party, opened on a phone or big screen that hasn't entered its pin yet. */
export class PinNeededError extends JoinError {
  constructor(readonly code: string, readonly partyName: string | null) { super("This party has a host pin."); }
}

export const WRONG_PIN = "That pin doesn't match this party.";

/** Whether this browser may read the party's pin: it entered the current one, or holds a host slot. */
async function knowsPin(code: string): Promise<boolean> {
  try { await get(ref(db(), `pins/${code}`)); return true; }
  catch { return false; }
}

/** Remembers a pin this browser typed. Firebase trusts it only while it matches the party's pin. */
async function offerPin(code: string, pin: string) {
  const user = await ensureSignedIn();
  await set(ref(db(), `hostTrust/${code}/${user.uid}`), pin);
}

/** Host phone or big screen: the party's pin, live (null: no pin). Only a browser that knows it can read it. */
export const watchPin = (code: string, onChange: (pin: string | null) => void) =>
  onValue(ref(db(), `pins/${code}`), (s) => onChange(s.exists() ? (s.val() as string) : null), () => onChange(null));

/**
 * Host phone: sets or changes the party's pin. Every other browser that knew the old one has to enter the
 * new one; this one stays trusted.
 */
export async function setHostPin(code: string, pin: string) {
  const user = await ensureSignedIn();
  await update(ref(db()), { [`pins/${code}`]: pin, [`hostTrust/${code}`]: { [user.uid]: pin }, [`sessions/${code}/hostPin`]: true });
}

/** Host phone or the big screen's hidden menu: removes the pin, and with it every browser's trust. */
export const removeHostPin = (code: string) =>
  update(ref(db()), { [`pins/${code}`]: null, [`hostTrust/${code}`]: null, [`sessions/${code}/hostPin`]: null });

/** Big screen: opens a pinned party with the pin typed on its pin step. */
export async function resumeWithPin(code: string, pin: string): Promise<string> {
  await offerPin(code, pin);
  try { return await resumeSession(code); }
  catch (e) { throw e instanceof JoinError ? e : new JoinError(WRONG_PIN); }
}

/** Host phone: connects to a pinned party with the pin typed on its pin step. */
export async function claimWithPin(code: string, pin: string): Promise<string> {
  await offerPin(code, pin);
  try { return await claimController(code); }
  catch (e) { throw e instanceof PinNeededError ? new JoinError(WRONG_PIN) : e; }
}

/**
 * Host phone: connects to a session as its remote controller (one per session). A pinned party needs a
 * phone that knows the pin, and that phone can take over from another one (its battery died, say).
 */
export async function claimController(rawCode: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  const user = await ensureSignedIn();
  const snap = await get(ref(db(), `sessions/${code}`));
  if (!snap.exists()) throw new JoinError(`No session found for code ${code}.`);
  const session = snap.val() as Session;
  const current = session.controllerUid;
  if (session.hostPin) {
    if (!(await knowsPin(code))) throw new PinNeededError(code, session.name ?? null);
    if (current !== user.uid) await set(ref(db(), `sessions/${code}/controllerUid`), user.uid);
    return code;
  }
  if (current && current !== user.uid) throw new RemoteTakenError(code, session.name ?? null);
  if (current === user.uid) return code; // this phone already holds the slot
  try {
    await set(ref(db(), `sessions/${code}/controllerUid`), user.uid);
  } catch {
    throw new JoinError("Couldn't connect as host — someone else just did.");
  }
  return code;
}

/**
 * New phone, on a party with no pin: asks the host remote to hand over. Returns the 3 digits both phones show,
 * a new set each time and never the same as another phone's that's asking.
 */
export async function askHandover(code: string): Promise<string> {
  const user = await ensureSignedIn();
  const snap = await get(ref(db(), `sessions/${code}`));
  if (!snap.exists()) throw new JoinError(`No session found for code ${code}.`);
  const session = snap.val() as Session;
  if (!session.controllerUid) throw new JoinError("Nobody has the host remote now. Connect again.");
  const taken = new Set(Object.values(session.handovers ?? {}).map((h) => h.pair));
  let pair: string;
  do pair = String(100 + Math.floor(Math.random() * 900)); while (taken.has(pair));
  // A declined or stale ask goes first: only a new one can be written.
  await remove(ref(db(), `sessions/${code}/handovers/${user.uid}`));
  await set(ref(db(), `sessions/${code}/handovers/${user.uid}`), { pair, from: session.controllerUid, status: "asked" });
  return pair;
}

/** New phone: withdraws its ask (or clears an answered one). */
export const cancelHandover = async (code: string) =>
  remove(ref(db(), `sessions/${code}/handovers/${(await ensureSignedIn()).uid}`));

/**
 * New phone, once handed the remote: tidies its ask away, and on a party with no big screen yet (the remote
 * that handed over was its host too) takes the host slot as well, so this phone can do all the old one could.
 */
export async function finishHandover(code: string, from: string) {
  const user = await ensureSignedIn();
  if ((await get(ref(db(), `sessions/${code}/hostUid`))).val() === from) await set(ref(db(), `sessions/${code}/hostUid`), user.uid);
  await remove(ref(db(), `sessions/${code}/handovers/${user.uid}`));
}

/** Host remote: hands itself over to the phone that asked, and tells any other phone that asked. */
export function handOver(code: string, session: Session, to: string) {
  const u: Record<string, unknown> = { [`sessions/${code}/controllerUid`]: to, [`sessions/${code}/handovers/${to}/status`]: "handed" };
  for (const [uid, h] of Object.entries(session.handovers ?? {})) if (uid !== to && h.status === "asked") u[`sessions/${code}/handovers/${uid}/status`] = "elsewhere";
  return update(ref(db()), u);
}

export const declineHandover = (code: string, to: string) => set(ref(db(), `sessions/${code}/handovers/${to}/status`), "declined");

/** Main screen: disconnects the current host remote so another phone can claim it. */
export const resetController = (code: string) => remove(ref(db(), `sessions/${code}/controllerUid`));

/** Host phone: gives up the remote slot, so the main screen shows the host QR again. */
export const releaseController = resetController;

/** Pulls a 4-char code from a scanned join URL (?code=ABCD) or a bare code. */
export function extractCode(text: string): string | null {
  try {
    const c = new URL(text).searchParams.get("code");
    if (c) return c.toUpperCase().slice(0, 4);
  } catch { /* not a URL */ }
  const t = text.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(t) ? t : null;
}

/** The games players submit things to (the others, like [BLANK] in a Box, are run by the host). */
const SUBMISSION_GAMES: GameId[] = ["photos", "beforeAfter"];

/** Clears what a player has submitted in every game (and any unlocks). */
const clearSubmissions = (code: string, uid: string) =>
  Promise.all(SUBMISSION_GAMES.flatMap((game) => [
    remove(ref(db(), `sessions/${code}/games/${game}/media/${uid}`)),
    remove(ref(db(), `sessions/${code}/games/${game}/unlocked/${uid}`)),
    remove(ref(db(), `sessions/${code}/games/${game}/shown/${uid}`)),
  ]));

/** Removes a player *and* everything they submitted, so rejoining starts fresh. */
export const removePlayer = async (code: string, uid: string) => {
  // On the guest list, they stay on the scoreboard (the host manages that), free to check in again.
  const guests = ((await get(ref(db(), `sessions/${code}/scoreboard/contestants`))).val() ?? {}) as Record<string, ScoreboardContestant>;
  const listed = Object.entries(guests).filter(([, c]) => c.uid === uid);
  await Promise.all([
    ...listed.map(([id]) => remove(ref(db(), `sessions/${code}/scoreboard/contestants/${id}/uid`))),
    remove(ref(db(), `sessions/${code}/players/${uid}`)),
    clearSubmissions(code, uid),
    ...["pages", "submitted", "unlocked", "shown"].map((part) => remove(ref(db(), `sessions/${code}/games/flipchart/${part}/${uid}`))),
    remove(ref(db(), `sessions/${code}/games/box/played/${uid}`)),
    remove(ref(db(), `sessions/${code}/games/noisemaster/played/${uid}`)),
    // Their secret task goes back in the pool, for whoever arrives next.
    remove(ref(db(), `secretTasks/${code}/assigned/${uid}`)),
    remove(ref(db(), `secretTasks/${code}/seen/${uid}`)),
  ]);
};

/**
 * Host: lets a player who has already submitted to a game send a new submission (or locks them again).
 * The player's phone clears the unlock itself once the new submission lands.
 */
export const setUnlocked = (code: string, game: GameId, uid: string, unlocked: boolean) => {
  const r = ref(db(), `sessions/${code}/games/${game}/unlocked/${uid}`);
  return unlocked ? set(r, true) : remove(r);
};

/** The game players see and the main screen shows; undefined on the game selection screen. */
export const activeGameId = (session: Session): GameId | undefined => session.game;

/**
 * Host: starts or switches to a game (players' phones switch to it, the main screen shows its lobby),
 * or with `null` goes back to the game selection screen. Nothing submitted to any game is lost.
 */
export const setGame = (code: string, game: GameId | null) =>
  update(ref(db(), `sessions/${code}`), { game, display: { step: "list" }, conversion: null, "clock/shown": null, ...(game ? { begun: true } : {}) });

/**
 * Main screen: moves a session from before there were games into the games layout, so it can be resumed.
 * Only the session's host can do this (it rewrites the whole session).
 */
export async function migrateLegacySession(code: string, session: Session): Promise<void> {
  if (!session.media && !session.unlocked) return;
  // They were playing Before & After, so carry on with it rather than landing on the game selection screen.
  const patch: Record<string, BeforeAfterMedia | boolean | string | null> = { media: null, unlocked: null, game: "beforeAfter" };
  for (const [uid, m] of Object.entries(session.media ?? {})) patch[`games/beforeAfter/media/${uid}`] = m;
  for (const [uid, u] of Object.entries(session.unlocked ?? {})) patch[`games/beforeAfter/unlocked/${uid}`] = u;
  await update(ref(db(), `sessions/${code}`), patch);
}

/** A player leaving on their own: same as being removed. */
export const leaveSession = removePlayer;

/** Puts something on the big screen. Like every write to the display, it takes down a useless conversion and the ⏱ clock (which keeps running). */
export const setDisplay = (code: string, display: Display) =>
  update(ref(db(), `sessions/${code}`), { display, conversion: null, "clock/shown": null });

/**
 * Puts a contestant's entry on the main screen and ticks them off the host's running order
 * (so "Next" moves on). Revisiting someone already shown changes nothing there.
 */
export const showContestant = (code: string, game: GameId, display: Display & { uid: string }) =>
  update(ref(db(), `sessions/${code}`), { display, conversion: null, "clock/shown": null, [`games/${game}/shown/${display.uid}`]: true });

/** Host remote: renames the party (shown on the remote, the guests' join screen and the recent list). */
export const renameParty = (code: string, name: string) =>
  set(ref(db(), `sessions/${code}/name`), name.trim());

export const setShowDownload = (code: string, show: boolean) =>
  set(ref(db(), `sessions/${code}/showDownload`), show);

/** How the 📏 converter explains a result. Metric is the default, so it isn't stored. */
export const setUnits = (code: string, units: "metric" | "imperial") =>
  set(ref(db(), `sessions/${code}/units`), units === "imperial" ? units : null);

/**
 * Host remote: puts a useless conversion on the big screen over whatever's there, or (null) takes it down.
 * Anything else the host puts up takes it down too (every display write clears it).
 */
export const showConversion = (code: string, conversion: ShownConversion | null) =>
  update(ref(db(), `sessions/${code}`), { conversion, ...(conversion ? { "clock/shown": null } : {}) });

/** Host remote: opens or closes the join QR, on the host's phone and above the big screen's corner code. */
/** Host: ends a task's transition at once (its music, picture or video); the big screen goes to what starting the task brought up. */
export const endSting = (code: string) => set(ref(db(), `sessions/${code}/sting`), null);

/** Main screen: a transition's video reached its end. Its last frame stays on the big screen until the host puts something else up or ends it. */
export const holdSting = (code: string) => set(ref(db(), `sessions/${code}/sting/held`), true);

/** Main screen: the transition's sound began just now (the host's strip counts down from it). */
export const markSting = (code: string, at: number) => set(ref(db(), `sessions/${code}/sting/at`), at);

export const setShowQr = (code: string, show: boolean) =>
  set(ref(db(), `sessions/${code}/showQr`), show ? true : null);

/**
 * Main screen: publishes the song titles found in the chosen music folder, and marks the folder open
 * until this screen disconnects. The titles stay after that, for picking tasks' songs while the PC is off.
 */
export async function publishTracks(code: string, titles: string[]) {
  const open = ref(db(), `sessions/${code}/jukebox/open`);
  await update(ref(db(), `sessions/${code}/jukebox`), { tracks: titles, tracksAt: Date.now(), open: titles.length ? true : null });
  if (titles.length) await onDisconnect(open).remove();
}

/**
 * Main screen: publishes the transition files it found in the music folder's three transition subfolders (names), and
 * later their lengths in seconds (same order). Each call writes only what it's given; an empty list clears it.
 */
export function publishTransitions(code: string, t: { music?: string[]; pictures?: string[]; videos?: string[]; musicLengths?: number[]; videoLengths?: number[] }) {
  const empty = (l: unknown[] | undefined) => (l && l.length ? l : null);
  const patch: Record<string, unknown> = {};
  if (t.music) patch.transitions = empty(t.music);
  if (t.pictures) patch.transitionPictures = empty(t.pictures);
  if (t.videos) patch.transitionVideos = empty(t.videos);
  if (t.musicLengths) patch.transitionDurations = empty(t.musicLengths);
  if (t.videoLengths) patch.transitionVideoDurations = empty(t.videoLengths);
  return update(ref(db(), `sessions/${code}/jukebox`), patch);
}

/** Main screen: one transition video's length in seconds, by its place in the published list. */
export const publishVideoLength = (code: string, index: number, seconds: number) =>
  set(ref(db(), `sessions/${code}/jukebox/transitionVideoDurations/${index}`), seconds);

/** Main screen: publishes song lengths in seconds (same order as the titles); null clears them. */
export const publishDurations = (code: string, seconds: number[] | null) =>
  set(ref(db(), `sessions/${code}/jukebox/durations`), seconds);

/** Main screen: where the song is now, for the host remote's "now playing" strip. */
export const setJukeboxClock = (code: string, clock: { pos: number; at: number; running: boolean }) =>
  set(ref(db(), `sessions/${code}/jukebox/clock`), clock);

/** Changes part of the jukebox playback state (current song, playing, volume). */
export const setJukeboxState = (code: string, patch: Partial<NonNullable<Jukebox["state"]>>) =>
  update(ref(db(), `sessions/${code}/jukebox/state`), patch);

/** Changes part of the display (e.g. play/pause) without resetting the rest. */
export const patchDisplay = (code: string, patch: Partial<Display>) =>
  update(ref(db(), `sessions/${code}`), {
    ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [`display/${k}`, v ?? null])), conversion: null, "clock/shown": null,
  });

/** `undefined` while loading, `null` if the session doesn't exist. */
export function useSession(code: string | undefined): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>();
  useEffect(() => {
    setSession(undefined);
    if (!code) return;
    return onValue(ref(db(), `sessions/${code}`), (s) => setSession(s.exists() ? (s.val() as Session) : null));
  }, [code]);
  return session;
}

// Kept in its own file so pages without a party (📏 at /convert) don't load Firebase.
export { store };

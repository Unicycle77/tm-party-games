import { useEffect, useState, type CSSProperties } from "react";
import { activeGame } from "./games";
import { presentedOf, prizePhotos, prizePlanned } from "./games/prize/data";
import { PrizeArea } from "./games/prize/PlayerView";
import { rulesOf } from "./rules";
import { RulesCard } from "./scoreboard/RulesSetup";
import { secretTasksPlanned, useMyTask } from "./games/secretTasks/data";
import { SecretEnvelope } from "./games/secretTasks/PlayerView";
import { TaskTextCard } from "./scoreboard/TaskText";
import { GuestCard, GuestContext, GuestHead, NameTag, PUT_AWAY, Status, TodoList, afterwards, leftToDo, phoneWordsOf, taskOn, type TodoRow } from "./guest";
import { QrScannerModal } from "./QrScannerModal";
import { Headshot, HeadshotCaption } from "./scoreboard/Headshot";
import { JoinError, SameNameError, TakenError, askToMove, cancelMove, extractCode, joinAsContestant, joinSession, sameName, store, useSession, useUid } from "./session";
import type { ScoreboardContestant, Session } from "./types";

const CODE_KEY = "ba.playCode";
const NAME_KEY = "ba.playName";
/**
 * This phone's check-in, from "That's me" until its last step: which steps this guest has (the headshot only
 * if none is on file, the envelope only if the party plays Secret Tasks), so "step 2 of 3" holds still as they're done.
 */
const CHECKIN_KEY = "ba.checkin";
/** "Not now" to the prize question, per party: the prize is then an optional row. */
const LATER_KEY = "ba.prizeLater";

interface CheckIn { code: string; confirmed: boolean; rules?: boolean; headshot: boolean; envelope: boolean; arrival?: boolean }
function readCheckIn(code: string): CheckIn | undefined {
  try {
    const c = JSON.parse(store.get(CHECKIN_KEY) || "null") as CheckIn | null;
    return c?.code === code ? c : undefined;
  } catch { return undefined; }
}
const saveCheckIn = (c: CheckIn | undefined) => store.set(CHECKIN_KEY, c ? JSON.stringify(c) : "");

export function Play() {
  const uid = useUid();
  // A QR scanned for another party wins over the one saved here: forget the old one, and the join form opens on the new code.
  // The old party keeps this guest's tile and entries; scanning its QR again gets them back. The same party's QR changes nothing.
  const [code, setCode] = useState(() => {
    const saved = store.get(CODE_KEY);
    const scanned = (new URLSearchParams(location.search).get("code") ?? "").toUpperCase().slice(0, 4);
    if (scanned.length === 4 && saved && scanned !== saved) { store.set(CODE_KEY, ""); return ""; }
    return saved;
  });
  const session = useSession(code || undefined);

  // Why this phone was dropped back to the join form, if it didn't choose to leave.
  const [dropped, setDropped] = useState<string>();
  const leave = (why?: string) => { store.set(CODE_KEY, ""); setCode(""); setDropped(why); };

  // If the session vanished or we were removed, fall back to the join screen.
  useEffect(() => {
    if (!uid || session === undefined) return;
    if (session === null) {
      // The QR's code points at the finished party: start the form with an empty code field.
      history.replaceState(null, "", location.pathname);
      leave("That party has ended.");
    }
    else if (!session.players?.[uid]) {
      const moved = Object.values(session.moves ?? {}).some((m) => m.from === uid && m.status === "allowed");
      leave(moved ? "You've moved to another phone." : "You were removed from the party.");
    }
  }, [uid, session]);

  if (!code) return <Join notice={dropped} onJoined={(c) => { store.set(CODE_KEY, c); setCode(c); setDropped(undefined); }} />;
  if (!uid || !session?.players?.[uid]) return <main className="center"><p>Loading…</p></main>;
  return <Guest code={code} uid={uid} session={session} onLeave={() => leave()} />;
}

/**
 * A guest's phone once they're in the party. Checking in comes first, one step at a time ("Checking in ·
 * step 2 of 3"): the Taskmaster rules, their headshot if none is on file, then their secret envelope. After that the phone is
 * their to-do list: the envelope, then the prize question, each taking the "To do now" card in turn, and
 * a task that's on outranks them all (players only ever see the game the host has made active). With
 * nothing left, no card and no gold: "Put your phone away", under their own name tag.
 */
function Guest({ code, uid, session, onLeave }: { code: string; uid: string; session: Session; onLeave: () => void }) {
  const me = session.players![uid]!;
  const name = me.name;
  const game = activeGame(session);
  const guest = Object.entries(session.scoreboard?.contestants ?? {}).find(([, c]) => c.uid === uid);
  const id = guest?.[0];
  const task = useMyTask(code, uid);
  const planned = secretTasksPlanned(session);
  const prizeOn = !!id && prizePlanned(session);
  const saved = id ? prizePhotos(session)[id] ?? [] : [];
  const presented = !!id && !!presentedOf(session)[id];
  const rules = rulesOf(session);

  const [checkin, setCheckin] = useState(() => readCheckIn(code));
  // Just finished checking in: the status line says so once.
  const [justIn, setJustIn] = useState(false);
  // A row the guest tapped, shown in the card's place. A task starting closes it.
  const [open, setOpen] = useState<"envelope" | "prize" | "rules">();
  const [prizeBusy, setPrizeBusy] = useState(false);
  const [later, setLater] = useState(() => store.get(`${LATER_KEY}.${code}`) === "1");
  useEffect(() => { setOpen(undefined); setJustIn(false); }, [session.game]);

  const needsHeadshot = !!guest && !guest[1].photo;
  // The rules, first: every guest agrees to them, unless the host has taken them all away since.
  const rulesToDo = !!checkin?.rules && !!rules;
  const arrival = Object.values(session.scoreboard?.tasks ?? {}).find((t) => /^arrival/i.test(t.type ?? ""));
  const envelopeDue = !!checkin?.envelope && typeof task !== "string";
  const arrivalToDo = !!checkin?.arrival && !!arrival?.text;
  const checkingIn = !!checkin && (rulesToDo || needsHeadshot || envelopeDue || arrivalToDo);
  // On the guest list but never tapped their name (typed it in, then the host added them): their steps start here.
  useEffect(() => {
    if (checkin || !needsHeadshot) return;
    const c = { code, confirmed: false, rules: !!rules, headshot: true, envelope: planned && typeof task !== "string" };
    saveCheckIn(c);
    setCheckin(c);
  }, [checkin, needsHeadshot]);
  useEffect(() => {
    if (!checkin || checkingIn) return;
    saveCheckIn(undefined);
    setCheckin(undefined);
    setJustIn(true);
  }, [checkin, checkingIn]);

  const envelopeToDo = !!id && planned && task === null;
  const prizeAsk = prizeOn && !saved.length && !presented && !later;
  const left = Number(envelopeToDo) + Number(prizeAsk);

  // What takes the card: a check-in step, photos being sent, a row the guest opened, the task that's on, then the to-dos in order.
  const showPrize = !checkingIn && (prizeBusy || open === "prize" || (!game && !open && !envelopeToDo && prizeAsk));
  const showEnvelope = checkingIn ? !rulesToDo && !needsHeadshot && envelopeDue : !prizeBusy && open === "envelope";
  const envelopeCard = !checkingIn && !prizeBusy && !open && !game && envelopeToDo;
  const showGame = !!game && !checkingIn && !prizeBusy && !open;
  const watching = !id && !!me.notPlaying;
  const waiting = !game && !checkingIn && !showPrize && !showEnvelope && !envelopeCard;

  const partyLine = `${session.name ?? "Party"} · ${code}`;
  const rulesStep = checkin?.rules !== undefined && rules ? 1 : 0;
  const steps = checkin ? Number(checkin.confirmed) + rulesStep + Number(checkin.headshot) + Number(checkin.envelope) + Number(checkin.arrival !== undefined && !!arrival?.text) : 0;
  const step = rulesToDo ? Number(!!checkin?.confirmed) + 1 : needsHeadshot ? Number(!!checkin?.confirmed) + rulesStep + 1 : steps;
  const now = (line: string) => justIn ? `You're in! ${line}` : line;

  const phoneWords = phoneWordsOf(session);
  let status: React.ReactNode = null;
  if (checkingIn) status = <Status>Checking in · step {step} of {steps}</Status>;
  else if (watching) status = <Status>You're watching tonight. Enjoy the show.</Status>;
  else if (showGame) status = null; // the game says where the guest stands
  else if (phoneWords) status = <Status>Here's the task. Read it, then put your phone away.</Status>;
  else if (showPrize && open === "prize" && saved.length && !presented && !prizeBusy) status = <Status>{afterwards("Prize photos sent.", left)}</Status>;
  else if (left || showPrize || showEnvelope) status = <Status>{now(left ? leftToDo(left) : PUT_AWAY)}</Status>;
  else if (!id) status = <Status>Waiting for the host to add you to the scoreboard.</Status>;
  else status = (
    <>
      <Status big>{now(PUT_AWAY)}</Status>
      <p className="muted">When the host starts a task, it'll show up here.</p>
    </>
  );

  const rows: TodoRow[] = [];
  if (id && !checkingIn) {
    if (rules) rows.push({ id: "rules", icon: "✓", label: "Taskmaster rules", state: "agreed", tone: "done", onOpen: () => setOpen("rules") });
    rows.push({ id: "headshot", icon: "✓", label: "Headshot", state: "done", tone: "done" });
    if (planned && task !== undefined) {
      rows.push(task ? { id: "envelope", icon: "✓", label: "Secret envelope", state: "picked", tone: "done", onOpen: () => setOpen("envelope") }
        : { id: "envelope", icon: "✉", label: "Secret envelope", state: "to do", tone: envelopeCard || showEnvelope ? "next" : undefined, onOpen: () => setOpen("envelope") });
    }
    if (prizeOn) {
      rows.push({
        id: "prize", icon: "🎁", label: "Prize photos",
        state: presented ? "🔒 presented" : saved.length ? "✓ sent" : later ? "optional" : "to do",
        tone: showPrize ? "next" : presented || saved.length || later ? "done" : undefined,
        onOpen: () => setOpen("prize"),
      });
    }
  }

  return (
    <GuestContext.Provider value={{ task: taskOn(session), left }}>
      <main className="phone guest">
        {waiting ? (
          <>
            <NameTag name={name} mine />
            <p className="muted party-line">{partyLine}</p>
          </>
        ) : <GuestHead title={name} line={partyLine} />}
        {status}
        {/* The same paper task card as on the host's phone: its own heading, the words as written, no name. */}
        {phoneWords && !checkingIn && <TaskTextCard key="phone-words" type={phoneWords.type} text={phoneWords.text} />}
        {checkingIn && rulesToDo && (
          <>
            <RulesCard rules={rules!} small />
            <button className="big" onClick={() => { const c = { ...checkin!, rules: false }; saveCheckIn(c); setCheckin(c); }}>Got it →</button>
          </>
        )}
        {checkingIn && !rulesToDo && !needsHeadshot && !envelopeDue && arrivalToDo && (
          <>
            <TaskTextCard type={arrival!.type!} text={arrival!.text!} />
            <button className="big" onClick={() => { const c = { ...checkin!, arrival: false }; saveCheckIn(c); setCheckin(c); }}>Got it: make my entrance →</button>
          </>
        )}
        {checkingIn && !rulesToDo && needsHeadshot && <Headshot key="headshot" code={code} uid={uid} id={id!} session={session} />}
        {/* Kept mounted while a row is open, so a photo on its way up isn't dropped. */}
        {game && !watching && (
          <div key="game" className="game-slot" hidden={!showGame}>
            <game.Player key={game.id} code={code} uid={uid} session={session} />
          </div>
        )}
        {envelopeCard && (
          <GuestCard key="envelope-todo" label="To do now" title="Pick your secret envelope">
            <button className="big" onClick={() => setOpen("envelope")}>✉ Pick an envelope →</button>
          </GuestCard>
        )}
        {showEnvelope && <SecretEnvelope key="envelope" code={code} uid={uid} session={session} onPicked={() => setOpen("envelope")} />}
        {prizeOn && (
          <PrizeArea key="prize" code={code} uid={uid} id={id!} session={session} shown={showPrize} onBusy={setPrizeBusy}
            onLater={() => { store.set(`${LATER_KEY}.${code}`, "1"); setLater(true); setOpen(undefined); }}
            onSent={() => setOpen("prize")} />
        )}
        {open === "rules" && rules && <RulesCard key="rules" rules={rules} small />}
        {open && !prizeBusy && <button key="back" className="link back" onClick={() => setOpen(undefined)}>← Back</button>}
        <TodoList rows={rows} />
        {/* Disconnects this phone only, back to the join screen to pick a name or a different code: the player's tile and entries stay. Only the host removes players. */}
        <div className="run-links"><button className="link" onClick={onLeave}>Not {name}? Not the right party?</button></div>
      </main>
    </GuestContext.Provider>
  );
}

/** Where a guest's name tag lands on the pile: two to a row in name order, each a little off and gently tilted. */
function tagSpot(id: string, i: number): CSSProperties {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const right = i % 2 === 1;
  return {
    left: `${right ? 50 + (h % 5) : 1 + (h % 6)}%`,
    top: `${Math.floor(i / 2) * 8 + (right ? 1.1 : 0) + ((h >> 4) % 3) * 0.25}rem`,
    ["--r" as string]: `${(((h >> 8) % 2) ? 1 : -1) * (2 + ((h >> 9) % 4))}deg`,
  };
}

function Join({ notice, onJoined }: { notice?: string; onJoined: (code: string) => void }) {
  const [code, setCode] = useState(() => (new URLSearchParams(location.search).get("code") ?? "").toUpperCase().slice(0, 4));
  const [name, setName] = useState(() => store.get(NAME_KEY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);
  // Arrived from the big screen's QR: the code is already right, so show it as a fact, not a field.
  const [editingCode, setEditingCode] = useState(() => code.length !== 4);
  // Someone here already has this name: maybe this guest, on a new phone.
  const [clash, setClash] = useState<string>();
  const [moving, setMoving] = useState(false);
  const clashes = !!clash && sameName(name, clash);
  // A party with a guest list: guests tap their name. Typing one is the rare way in for anyone not on it.
  const party = useSession(code.length === 4 ? code : undefined);
  const guests = Object.entries(party?.scoreboard?.contestants ?? {}).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  const [typing, setTyping] = useState(false);
  const [tapped, setTapped] = useState<string>();
  const listed = !editingCode && !typing && guests.length > 0;

  async function askMove() {
    setBusy(true);
    setError(undefined);
    try { await askToMove(code, name); setMoving(true); }
    catch (err) { setError(err instanceof JoinError ? err.message : "Something went wrong. Try again."); }
    finally { setBusy(false); }
  }

  if (moving) return <MoveWait code={code} onJoined={(c) => { store.set(NAME_KEY, name.trim()); onJoined(c); }} onBack={() => setMoving(false)} />;

  async function checkIn(id: string, guestName: string) {
    setBusy(true);
    setError(undefined);
    try {
      const c = await joinAsContestant(code, id);
      store.set(NAME_KEY, guestName);
      // This guest's own steps, counted once: "You're Sam?" (just done), the rules if the party has them, the headshot if none is on file, the envelope if Secret Tasks is planned.
      saveCheckIn({ code: c, confirmed: true, rules: !!party && !!rulesOf(party), headshot: !party?.scoreboard?.contestants?.[id]?.photo, envelope: !!party && secretTasksPlanned(party) });
      onJoined(c);
    } catch (err) {
      // Checked in on another phone: maybe theirs, so ask the host to move them here.
      if (err instanceof TakenError) {
        setName(guestName);
        try { await askToMove(code, guestName); setMoving(true); }
        catch (e2) { setError(e2 instanceof JoinError ? e2.message : "Something went wrong. Try again."); }
        return;
      }
      setError(err instanceof JoinError ? err.message : "Something went wrong. Try again.");
    } finally { setBusy(false); }
  }

  const tappedGuest = tapped ? party?.scoreboard?.contestants?.[tapped] : undefined;
  if (listed && tapped && tappedGuest) {
    return <ConfirmGuest guest={tappedGuest} session={party} party={party?.name} code={code} busy={busy} error={error}
      onYes={() => void checkIn(tapped, tappedGuest.name)} onNo={() => { setTapped(undefined); setError(undefined); }} />;
  }

  if (listed) {
    return (
      <main className="phone guest">
        <GuestHead title="Taskmaster" line={`Joining ${party?.name ?? "party"} · ${code}`} />
        {notice && <p className="notice">{notice}</p>}
        <Status>Find your name tag and tap it</Status>
        {/* Name tags scattered on the curtain, two to a row in name order; checked-in guests' are faded but still tappable (a guest moving phones). */}
        <div className="tag-pile" style={{ height: `${Math.ceil(guests.length / 2) * 8 + 2}rem` }}>
          {guests.map(([id, g], i) => <NameTag key={id} name={g.name} here={!!g.uid} style={tagSpot(id, i)} onClick={() => { setTapped(id); setError(undefined); }} />)}
        </div>
        <div className="run-links">
          <button className="link" onClick={() => setTyping(true)}>Not on the list? Type your name</button>
          <button className="link" onClick={() => setEditingCode(true)}>Wrong party? Enter a different code</button>
        </div>
      </main>
    );
  }

  // First the code alone; the name comes after, from the party's list (or typed, if it has none).
  if (editingCode) {
    const ready = code.length === 4;
    const next = (e: React.FormEvent) => {
      e.preventDefault();
      if (!ready || party === undefined) return;
      if (party === null) { setError(`No session found for code ${code}.`); return; }
      setError(undefined);
      setTyping(false);
      setEditingCode(false);
    };
    return (
      <main className="join">
        <h1>Taskmaster</h1>
        {notice && <p className="notice">{notice}</p>}
        <form onSubmit={next}>
          <label>Party code
            <div className="row">
              <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase().slice(0, 4)); setError(undefined); }}
                maxLength={4} autoCapitalize="characters" autoComplete="off" placeholder="ABCD" required />
              <button type="button" aria-label="Scan QR code" onClick={() => setScanning(true)}>📷</button>
            </div>
          </label>
          <p className="muted small join-hint">It's on the big screen.</p>
          <button type="submit" className="big" disabled={!ready || party === undefined}>{ready && party === undefined ? "Finding the party…" : "Next"}</button>
          {error && <p className="error">{error}</p>}
        </form>
        {scanning && <QrScannerModal onClose={() => setScanning(false)} onScan={(t) => {
          setScanning(false);
          const c = extractCode(t);
          if (c) { setCode(c); setError(undefined); }
        }} />}
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const c = await joinSession(code, name);
      store.set(NAME_KEY, name.trim());
      onJoined(c);
    } catch (err) {
      // Same name: not an error, a question (shown under the field).
      if (err instanceof SameNameError) { setClash(err.taken); return; }
      // A wrong code needs the code field back to fix it.
      if (err instanceof JoinError && err.message.startsWith("No session found")) setEditingCode(true);
      setError(err instanceof JoinError ? err.message : "Something went wrong. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="join">
      <h1>Taskmaster</h1>
      {notice && <p className="notice">{notice}</p>}
      <form onSubmit={(e) => void submit(e)}>
        <p className="joining">Joining {party?.name ? <strong className="party-name">{party.name}</strong> : <>party <strong>{code}</strong></>}</p>
        <label>Your first name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20}
            autoCapitalize="words" autoComplete="given-name" placeholder="e.g. Alex" required />
        </label>
        {clashes ? (
          <div className="same-name">
            <p>There's already a {clash} here. Is that you on another phone?</p>
            <button type="button" disabled={busy} onClick={() => void askMove()}>That's me, move me here</button>
            <p className="muted small">Someone else? Add your last initial, like "{clash} B".</p>
          </div>
        ) : <p className="muted small join-hint">This is how you'll appear on the big screen.</p>}
        <button type="submit" className="big" disabled={busy || clashes}>{busy ? "Joining…" : "Join"}</button>
        {error && <p className="error">{error}</p>}
      </form>
      {typing && guests.length > 0 && <button className="link" onClick={() => { setTyping(false); setError(undefined); }}>Back to the list</button>}
      <button className="link" onClick={() => setEditingCode(true)}>Wrong party? Enter a different code</button>
    </main>
  );
}

/**
 * After tapping a name: "You're Alex?" on the "To do now" card, with the headshot the host set for them (so a
 * mis-tap is obvious) and the Headshot task's words under it. Guests can't replace that photo, so this is the
 * headshot step too. A guest with none on file adds theirs right after.
 */
function ConfirmGuest({ guest, session, party, code, busy, error, onYes, onNo }: {
  guest: ScoreboardContestant; session: Session | null | undefined; party?: string; code: string; busy: boolean; error?: string; onYes: () => void; onNo: () => void;
}) {
  const steps = 1 + Number(!!session && !!rulesOf(session)) + Number(!guest.photo) + Number(!!session && secretTasksPlanned(session));
  return (
    <main className="phone guest">
      <GuestHead title="Taskmaster" line={`Joining ${party ?? "party"} · ${code}`} />
      <Status>Checking in · step 1 of {steps}</Status>
      <GuestCard label="On the guest list" title={`You're ${guest.name}?`}>
        {guest.photo ? <img className="headshot" src={guest.photo} alt="" /> : <div className="ph headshot">No headshot yet</div>}
        <HeadshotCaption session={session} />
        <button className="big" disabled={busy} onClick={onYes}>{busy ? "Checking in…" : "That's me"}</button>
        {error && <p className="error">{error}</p>}
      </GuestCard>
      <div className="run-links"><button className="link" onClick={onNo}>Not me</button></div>
    </main>
  );
}

/**
 * A new phone waiting for the host to allow a move. The host's phone shows a card; once allowed, this
 * phone becomes the player (entries and all) and the old phone says it has moved.
 */
function MoveWait({ code, onJoined, onBack }: { code: string; onJoined: (code: string) => void; onBack: () => void }) {
  const uid = useUid();
  const session = useSession(code);
  const status = uid ? session?.moves?.[uid]?.status : undefined;
  const moved = status === "allowed" && !!uid && !!session?.players?.[uid];
  useEffect(() => { if (moved) onJoined(code); }, [moved]);
  const back = () => { void cancelMove(code); onBack(); };

  return (
    <main className="join">
      <h1>Taskmaster</h1>
      <section className="slot waiting">
        {status === "declined" ? (
          <>
            <h2>The host said no.</h2>
            <p className="slot-hint">If that's a mistake, have a word with them.</p>
            <button className="link" onClick={back}>Back</button>
          </>
        ) : (
          <>
            <h2>Asked the host to move you here.</h2>
            <p className="slot-hint">Waiting for their OK…</p>
            <button className="link" onClick={back}>Cancel</button>
          </>
        )}
      </section>
    </main>
  );
}

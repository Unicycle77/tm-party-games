import { useEffect, useRef, useState } from "react";
import { activeGame } from "./games";
import { prizePlanned } from "./games/prize/data";
import { PrizeArea } from "./games/prize/PlayerView";
import { secretTasksPlanned } from "./games/secretTasks/data";
import { SecretTaskArea } from "./games/secretTasks/PlayerView";
import { QrScannerModal } from "./QrScannerModal";
import { Headshot } from "./scoreboard/Headshot";
import { JoinError, SameNameError, TakenError, askToMove, cancelMove, extractCode, joinAsContestant, joinSession, sameName, store, useSession, useUid } from "./session";
import type { ScoreboardContestant } from "./types";

const CODE_KEY = "ba.playCode";
const NAME_KEY = "ba.playName";

export function Play() {
  const uid = useUid();
  const [code, setCode] = useState(() => store.get(CODE_KEY));
  const session = useSession(code || undefined);

  // Why this phone was dropped back to the join form, if it didn't choose to leave.
  const [dropped, setDropped] = useState<string>();
  const leave = (why?: string) => { store.set(CODE_KEY, ""); setCode(""); setDropped(why); };
  // Only the first wait is a welcome; once a game has been on, the card just says another is coming.
  const hadGame = useRef(false);

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

  // Players only ever see the game the host has made active.
  const game = activeGame(session);
  if (game) hadGame.current = true;
  const name = session.players[uid]!.name;

  // On the guest list with no headshot yet: adding one finishes checking in.
  const guest = Object.entries(session.scoreboard?.contestants ?? {}).find(([, c]) => c.uid === uid);
  if (guest && !guest[1].photo) {
    return (
      <main className="phone">
        <header><strong>{name}</strong><span className="muted"> · {code}</span></header>
        <Headshot code={code} uid={uid} id={guest[0]} name={name} />
        <button className="link" onClick={() => leave()}>Not {name}? Switch player</button>
      </main>
    );
  }

  const gameCard = game ? <game.Player key={game.id} code={code} uid={uid} session={session} /> : hadGame.current ? (
      <section className="slot waiting">
        <h2>Waiting for the next game.</h2>
        <p className="slot-hint">When the host picks it, it'll show up here.</p>
      </section>
    ) : (
      <section className="slot waiting">
        <span className="stamp">✓ You're in</span>
        <h2>Welcome, {name}!</h2>
        <p className="slot-hint">Look for your name on the big screen.</p>
        <p className="slot-hint">When the host picks a game, it'll show up here.</p>
      </section>
    );

  // The prize task: a guest on the guest list can send their prize from check-in onwards, whatever is on.
  const content = guest && prizePlanned(session)
    ? <>{gameCard}<PrizeArea code={code} uid={uid} id={guest[0]} session={session} /></> : gameCard;

  return (
    <main className="phone">
      <header><strong>{name}</strong><span className="muted"> · {code}</span></header>
      {/* When the party plays Secret Tasks, a player picks their envelope on arrival and can pull it up any time, whatever the game. */}
      {game?.id === "secretTasks" || !secretTasksPlanned(session) ? content
        : <SecretTaskArea code={code} uid={uid} session={session}>{content}</SecretTaskArea>}
      {/* Disconnects this phone only: the player's tile and entries stay. Only the host removes players. */}
      <button className="link" onClick={() => leave()}>Not {name}? Switch player</button>
    </main>
  );
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
    return <ConfirmGuest guest={tappedGuest} busy={busy} error={error}
      onYes={() => void checkIn(tapped, tappedGuest.name)} onNo={() => { setTapped(undefined); setError(undefined); }} />;
  }

  if (listed) {
    return (
      <main className="join">
        <h1>Taskmaster</h1>
        {notice && <p className="notice">{notice}</p>}
        <p className="joining">Joining {party?.name ? <strong className="party-name">{party.name}</strong> : <>party <strong>{code}</strong></>}</p>
        <h2 className="tap-name">Tap your name</h2>
        <div className="choices two guest-list">
          {guests.map(([id, g]) => <button key={id} onClick={() => { setTapped(id); setError(undefined); }}>{g.name}</button>)}
        </div>
        <button className="link" onClick={() => setTyping(true)}>Not on the list? Type your name</button>
        <button className="link" onClick={() => setEditingCode(true)}>Wrong party? Enter a different code</button>
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
          <label>Game code
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

/** After tapping a name: "You're Alex?", with their headshot if the host added one, so a mis-tap is obvious. */
function ConfirmGuest({ guest, busy, error, onYes, onNo }: {
  guest: ScoreboardContestant; busy: boolean; error?: string; onYes: () => void; onNo: () => void;
}) {
  return (
    <main className="join">
      <h1>Taskmaster</h1>
      <section className="slot waiting">
        {guest.photo && <img className="guest-photo" src={guest.photo} alt="" />}
        <h2>You're {guest.name}?</h2>
        <button className="big" disabled={busy} onClick={onYes}>{busy ? "Checking in…" : "That's me"}</button>
        {error && <p className="error">{error}</p>}
        <button className="link" onClick={onNo}>Not me</button>
      </section>
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

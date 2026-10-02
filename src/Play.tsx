import { useEffect, useRef, useState } from "react";
import { activeGame } from "./games";
import { QrScannerModal } from "./QrScannerModal";
import { JoinError, extractCode, joinSession, store, useSession, useUid } from "./session";

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
    else if (!session.players?.[uid]) leave("You were removed from the party.");
  }, [uid, session]);

  if (!code) return <Join notice={dropped} onJoined={(c) => { store.set(CODE_KEY, c); setCode(c); setDropped(undefined); }} />;
  if (!uid || !session?.players?.[uid]) return <main className="center"><p>Loading…</p></main>;

  // Players only ever see the game the host has made active.
  const game = activeGame(session);
  if (game) hadGame.current = true;
  const name = session.players[uid]!.name;
  return (
    <main className="phone">
      <header><strong>{name}</strong><span className="muted"> · {code}</span></header>
      {game ? <game.Player key={game.id} code={code} uid={uid} session={session} /> : hadGame.current ? (
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
      )}
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const c = await joinSession(code, name);
      store.set(NAME_KEY, name.trim());
      onJoined(c);
    } catch (err) {
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
        {editingCode ? (
          <label>Game code
            <div className="row">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                maxLength={4} autoCapitalize="characters" autoComplete="off" placeholder="ABCD" required />
              <button type="button" aria-label="Scan QR code" onClick={() => setScanning(true)}>📷</button>
            </div>
          </label>
        ) : (
          <p className="joining">Joining party <strong>{code}</strong></p>
        )}
        <label>Your first name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20}
            autoCapitalize="words" autoComplete="given-name" placeholder="e.g. Alex" required />
        </label>
        <p className="muted small join-hint">This is how you'll appear on the big screen.</p>
        <button type="submit" className="big" disabled={busy || code.length !== 4}>{busy ? "Joining…" : "Join"}</button>
        {error && <p className="error">{error}</p>}
      </form>
      {!editingCode && <button className="link" onClick={() => setEditingCode(true)}>Wrong party? Enter a different code</button>}
      {scanning && <QrScannerModal onClose={() => setScanning(false)} onScan={(t) => {
        setScanning(false);
        const c = extractCode(t);
        if (c) { setCode(c); setError(undefined); }
      }} />}
    </main>
  );
}

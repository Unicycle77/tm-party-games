import { useState } from "react";
import type { BoxKey, BoxRound, Display, Session } from "../../types";
import { decider, holderOf, newRound, openBox, roundOf, startRound, useBoxSecret } from "./data";
import { OBJECTS, findObject } from "./objects";

/** Not used: this game never shows one player on their own. */
export const HostPlayer = () => null;

/** The host's phone, above the player list: set up a round, then follow it and open the boxes. */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const round = roundOf(session);
  return round
    ? <RoundControls code={code} session={session} display={display} round={round} />
    : <Setup code={code} session={session} />;
}

function Setup({ code, session }: { code: string; session: Session }) {
  const players = Object.entries(session.players ?? {}).sort(([, x], [, y]) => (x.joinedAt ?? 0) - (y.joinedAt ?? 0));
  const nameOf = (uid: string) => session.players?.[uid]?.name ?? "?";
  const played = session.games?.box?.played ?? {};
  const [object, setObject] = useState(OBJECTS[0]?.id);
  // The two players, left then right on the stage. Picking a third replaces the earlier pick.
  const [chosen, setChosen] = useState<string[]>([]);
  const [peeker, setPeeker] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const here = chosen.filter((uid) => session.players?.[uid]);
  const toggle = (uid: string) => setChosen((c) => (c.includes(uid) ? c.filter((x) => x !== uid) : [...c, uid].slice(-2)));
  const [a, b] = here;
  const ready = !!object && !!a && !!b && !!peeker && here.includes(peeker);
  const objectName = findObject(object)?.name ?? "[BLANK]";

  // Two at random, preferring people who haven't played yet; then the peeker at random too.
  function pickRandom() {
    const shuffle = (ids: string[]) => ids.map((id) => [Math.random(), id] as const).sort(([x], [y]) => x - y).map(([, id]) => id);
    const ids = players.map(([uid]) => uid);
    const pair = [...shuffle(ids.filter((uid) => !played[uid])), ...shuffle(ids.filter((uid) => played[uid]))].slice(0, 2);
    setChosen(pair);
    setPeeker(pair[Math.random() < 0.5 ? 0 : 1]);
  }

  async function start() {
    if (!ready || !object || !a || !b || !peeker) return;
    // Always a random box: the host must not know where it is (only the peeker finds out).
    const inBox: BoxKey = Math.random() < 0.5 ? "L" : "R";
    setBusy(true);
    setError(undefined);
    try { await startRound(code, { object, players: { a, b }, peeker }, inBox); }
    catch { setError("Couldn't start the round. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="box-setup">
      <h3>1. What's in the box?</h3>
      <div className="choices two">
        {OBJECTS.map((o) => (
          <button key={o.id} className={o.id === object ? "active box-object" : "box-object"} aria-pressed={o.id === object} onClick={() => setObject(o.id)}>
            <img src={o.url} alt="" />{o.name}
          </button>
        ))}
      </div>
      <div className="remote-head">
        <h3>2. Who plays?</h3>
        <button className="link" disabled={players.length < 2} onClick={pickRandom}>🎲 Pick two at random</button>
      </div>
      {players.length < 2 && <p className="muted small">Waiting for at least two contestants to join…</p>}
      <div className="choices two">
        {players.map(([uid, p]) => (
          <button key={uid} className={here.includes(uid) ? "active" : ""} aria-pressed={here.includes(uid)} onClick={() => toggle(uid)}>
            {p.name}{played[uid] && <span className="played">played</span>}
          </button>
        ))}
      </div>
      <h3>3. Who can look inside their box?</h3>
      <div className="choices two">
        {a && b ? [a, b].map((uid) => (
          <button key={uid} className={uid === peeker ? "active" : ""} aria-pressed={uid === peeker} onClick={() => setPeeker(uid)}>👀 {nameOf(uid)}</button>
        )) : <p className="muted small">Pick two first.</p>}
      </div>
      <button className="big" disabled={!ready || busy} onClick={() => void start()}>{busy ? "Starting…" : `Start ${objectName} in a Box`}</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/**
 * A round in play. The host's phone reads which box holds the object (it has to, to open the boxes)
 * but never shows it: only the peeker should know.
 */
function RoundControls({ code, session, round }: { code: string; session: Session; display: Display; round: BoxRound }) {
  const nameOf = (uid: string) => session.players?.[uid]?.name ?? "?";
  const secret = useBoxSecret(code, true);
  const who = nameOf(decider(round));
  // The boxes in the order they stand on the stage now (left, right).
  const leftKey: BoxKey = round.decision === "swap" ? "R" : "L";
  const keys: BoxKey[] = [leftKey, leftKey === "L" ? "R" : "L"];
  const allOpen = !!round.revealed?.L && !!round.revealed?.R;

  return (
    <div className="box-setup">
      <h3>{nameOf(round.players.a)} and {nameOf(round.players.b)}</h3>
      <p className="muted small">👀 {nameOf(round.peeker)} can look inside.</p>
      <p className="box-wait">
        {round.decision
          ? (round.decision === "swap" ? `${who} swapped!` : `${who} kept their box.`)
          : `Waiting for ${who} to swap or keep…`}
      </p>
      <div className="steps two">
        {keys.map((key) => (
          <button key={key} disabled={!round.decision || !!round.revealed?.[key] || !secret}
            onClick={() => secret && void openBox(code, key, secret.inBox)}>
            {round.revealed?.[key] ? "✓ Opened" : `Open ${nameOf(holderOf(round, key))}'s box`}
          </button>
        ))}
      </div>
      {/* Ends the round: the stage shows the empty curtain until the next one starts. */}
      <button className="lower" onClick={() => { if (allOpen || confirm("Lower the curtain? This round hasn't finished.")) void newRound(code); }}>
        Lower the curtain
      </button>
    </div>
  );
}

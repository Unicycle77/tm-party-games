import { useState } from "react";
import type { Display, SecretReveal, Session } from "../../types";
import { bringUp, currentOf, endReveal, nextEnvelope, pointsOf, revealOf, setDone, setGuessed, startReveal, unseal, useSecretTasks } from "./data";
import { Tally } from "./Tally";

/** "Priya", "Priya and Mei", "Priya, Mei and Jo". */
const names = (list: string[]) => list.length < 2 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;

/** What the host phone's status line says the big screen shows during the reveal. */
export function onScreen(session: Session, _display: Display): string | undefined {
  const reveal = revealOf(session);
  if (!reveal) return undefined;
  const current = currentOf(session, reveal);
  if (!current) return "That's everyone! (the envelopes and tallies)";
  const name = session.players?.[current.uid]?.name ?? "?";
  return reveal.task === undefined ? `What was ${name}'s secret?` : `${name}'s secret, "${reveal.task}"`;
}

/**
 * The host's phone while Secret Tasks is the game: start the reveal, then for each player (in random order,
 * or whoever the host taps) unseal their envelope on the big screen and score the turn, then move on. The
 * gold button stays in one place and changes job. Scores are kept here and show on the big screen only at
 * the end, as tally marks. The pile of tasks is in the ✉ page.
 */
export function HostLobby({ code, session }: { code: string; session: Session; display: Display }) {
  const tasks = useSecretTasks(code);
  const reveal = revealOf(session);
  const nameOf = (uid: string) => session.players?.[uid]?.name ?? "?";
  const players = Object.entries(session.players ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);

  if (!reveal) {
    const without = players.filter(([uid]) => !tasks?.assigned?.[uid]).map(([, p]) => p.name);
    const dealt = players.length - without.length;
    const ready = tasks === undefined ? "Loading…"
      : dealt === 0 ? "No one has a secret yet. Add tasks in ✉ at the top."
      : without.length === 0 ? `Everyone has a secret (${dealt}).`
      : `${dealt} of ${players.length} have a secret. ${names(without)} ${without.length === 1 ? "sits" : "sit"} this one out.`;
    return (
      <>
        <p className="muted small">{ready}</p>
        <button className="big" disabled={!tasks || dealt === 0} onClick={() => void startReveal(code, session, tasks)}>Start the reveal →</button>
        <h2>Contestants ({players.length})</h2>
        <ul className="picker running">
          {players.map(([uid, p]) => (
            <li key={uid}>
              <button disabled><span>{p.name}</span><span className="muted small">{tasks?.assigned?.[uid] ? "✉ sealed" : "no task"}</span></button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const current = currentOf(session, reveal);
  if (!current) return <Finish code={code} session={session} reveal={reveal} />;

  const task = tasks?.assigned?.[current.uid];
  const sealed = reveal.task === undefined;
  const points = pointsOf(reveal);
  const up = reveal.order.filter((uid) => session.players?.[uid]);
  const place = up.indexOf(current.uid);
  const nextUid = up[place + 1];
  const name = nameOf(current.uid);

  return (
    <>
      <h2 className="contestant">{name}<span className="muted">, {place + 1} of {up.length}</span></h2>
      {/* One gold button, in one place: unseal, then move on. */}
      {sealed
        ? <button className="big" disabled={!task} onClick={() => task && void unseal(code, current.uid, task)}>Unseal {name}'s envelope</button>
        : <button className="big" onClick={() => void nextEnvelope(code, current.pos + 1)}>{nextUid ? `Next: ${nameOf(nextUid)} →` : "That's everyone →"}</button>}
      <Turn code={code} session={session} reveal={reveal} owner={current.uid} disabled={sealed} />
      <h2>Running order</h2>
      <ul className="picker running">
        {up.map((uid, i) => (
          <li key={uid} className={i < place ? "shown" : i === place + 1 ? "next" : ""}>
            {/* While the envelope is sealed, anyone still to come can be brought up instead. */}
            <button disabled={!sealed || i <= place} onClick={() => void bringUp(code, reveal, uid, current.pos)}>
              <span>{nameOf(uid)}</span>
              <Tally n={points[uid] ?? 0} />
              {i === place && <span className="muted small">now</span>}
            </button>
          </li>
        ))}
      </ul>
      <button className="lower" onClick={() => { if (confirm("End the reveal? The envelopes you haven't opened stay secret, and the scores are cleared.")) void endReveal(code); }}>
        Lower the curtain
      </button>
    </>
  );
}

/** Scoring one turn: did the owner do it, and who guessed it. Scoring is optional and never holds up the show. */
function Turn({ code, session, reveal, owner, disabled = false }: { code: string; session: Session; reveal: SecretReveal; owner: string; disabled?: boolean }) {
  const turn = reveal.scores?.[owner];
  const name = session.players?.[owner]?.name ?? "?";
  const others = Object.entries(session.players ?? {}).filter(([uid]) => uid !== owner).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
  const mark = (on: boolean, label: string) => (on ? `✓ ${label}` : label);
  return (
    <div className="turn">
      <h3>Did {name} do it?</h3>
      <div className="choices marks two">
        {([true, false] as const).map((v) => (
          <button key={String(v)} disabled={disabled} aria-pressed={turn?.done === v} onClick={() => void setDone(code, owner, turn?.done === v ? null : v)}>
            {mark(turn?.done === v, v ? "Yes" : "No")}
          </button>
        ))}
      </div>
      <h3>Who guessed it?</h3>
      <div className="choices marks">
        {others.map(([uid, p]) => {
          const on = !!turn?.guessed?.[uid];
          return <button key={uid} disabled={disabled} aria-pressed={on} onClick={() => void setGuessed(code, owner, uid, !on)}>{mark(on, p.name)}</button>;
        })}
      </div>
    </div>
  );
}

/** After the last turn: who has the most points, the final scores, and fixing any turn. */
function Finish({ code, session, reveal }: { code: string; session: Session; reveal: SecretReveal }) {
  const [fixing, setFixing] = useState<string>();
  const points = pointsOf(reveal);
  const players = Object.entries(session.players ?? {})
    .sort(([a, x], [b, y]) => (points[b] ?? 0) - (points[a] ?? 0) || x.joinedAt - y.joinedAt);
  const top = Math.max(0, ...players.map(([uid]) => points[uid] ?? 0));
  const leaders = players.filter(([uid]) => top > 0 && (points[uid] ?? 0) === top).map(([, p]) => p.name);
  return (
    <>
      <h2 className="contestant">{leaders.length ? `Most points: ${names(leaders)}, ${top}` : "No points scored."}</h2>
      <button className="big" onClick={() => void endReveal(code)}>Lower the curtain</button>
      <h2>Final scores</h2>
      <ul className="picker running">
        {players.map(([uid, p]) => (
          <li key={uid} className="stacked">
            {/* Only players whose envelope was opened had a turn to fix. */}
            <button disabled={!reveal.shown?.[uid]} aria-expanded={fixing === uid} onClick={() => setFixing(fixing === uid ? undefined : uid)}>
              <span>{p.name}</span>
              <Tally n={points[uid] ?? 0} />
            </button>
            {fixing === uid && <Turn code={code} session={session} reveal={reveal} owner={uid} />}
          </li>
        ))}
      </ul>
      <p className="muted small">Tap a name to fix their turn.</p>
    </>
  );
}

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { joinUrlFor } from "./firebase";
import { PICKER_GAMES, activeGame } from "./games";
import { noBigScreen, removePlayer, setDisplay, setGame, setShowQr, setUnlocked, showContestant } from "./session";
import type { Display, Session } from "./types";

/** How the status line names what a contestant has on the big screen. */
const SHOWING: Partial<Record<Display["step"], string>> = {
  before: "Before", after: "After", both: "Before and After", video: "video", photo: "photo",
};

/**
 * The host's phone during the show: one line saying what the big screen shows, then the one next
 * action in gold, then the contestants in join order. While entries come in, the list carries their
 * stamps and the 🔒/🔓 resubmit column; once the curtain is down between contestants it becomes the
 * running order (shown ones dimmed, the next one outlined). Removing people sits behind
 * "Manage contestants", so it can't be hit mid-show.
 */
export function HostRemote({ code, session, onRunOfShow }: { code: string; session: Session; onRunOfShow: () => void }) {
  return (
    <>
      <RemoteBody code={code} session={session} onRunOfShow={onRunOfShow} />
      <JoinQr code={code} session={session} />
    </>
  );
}

/**
 * For anyone who arrives late: the join code, on the host's phone to hold up. While it's open the big screen
 * shows it too, above its corner code (on the curtain and while entries come in), and closing it hides both.
 */
export function JoinQr({ code, session }: { code: string; session: Session }) {
  const close = () => void setShowQr(code, false);
  return (
    <>
      <button className="link" onClick={() => void setShowQr(code, true)}>Show QR code</button>
      {session.showQr && (
        <div className="qr-overlay" onClick={close}>
          <figure className="join-qr">
            <QRCodeSVG value={joinUrlFor(code)} size={300} bgColor="#fff" marginSize={2} />
            <figcaption>Scan to join</figcaption>
          </figure>
          <p className="code">{code}</p>
          <button type="button" onClick={close}>Close</button>
        </div>
      )}
    </>
  );
}

function RemoteBody({ code, session, onRunOfShow }: { code: string; session: Session; onRunOfShow: () => void }) {
  const game = activeGame(session);
  const [managing, setManaging] = useState(false);
  const players = Object.entries(session.players ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
  const display = session.display ?? { step: "list" as const };
  const current = display.uid ? session.players?.[display.uid] : undefined;

  const remove = (uid: string, name: string) => {
    if (confirm(`Remove ${name} and everything they submitted? They can then rejoin fresh.`)) void removePlayer(code, uid);
  };
  const removeButton = (uid: string, name: string) =>
    managing && <button className="x" aria-label={`Remove ${name}`} onClick={() => remove(uid, name)}>×</button>;
  const manageLink = players.length > 0 && (
    <button className="link" onClick={() => setManaging(!managing)}>{managing ? "Done" : "Manage contestants"}</button>
  );
  const plainList = (
    <>
      {players.length === 0 && <p className="muted">No contestants yet.</p>}
      <ul className="picker">
        {players.map(([uid, p]) => (
          <li key={uid}>
            <button disabled><span>{p.name}</span></button>
            {removeButton(uid, p.name)}
          </li>
        ))}
      </ul>
    </>
  );

  // The scoreboard (and the prize haul) belong to no game; they're run from 🏆, and lowering goes back to the curtain.
  if (display.step === "scoreboard" || display.step === "haul") {
    return (
      <section className="remote">
        <p className="on-screen">On the big screen: {display.step === "haul" ? "the prize haul" : "the scoreboard"}</p>
        <p className="muted small">Update the scores from 🏆.</p>
        <button className="big" onClick={() => void setDisplay(code, { step: "curtain" })}>Lower the curtain</button>
      </section>
    );
  }

  // A game that's not on the run of show, played ad hoc: picked here, reached from the run of show's link.
  if (!game) {
    return (
      <section className="remote">
        <div className="remote-head">
          <h2>Play a game</h2>
          <button className="link" onClick={onRunOfShow}>← Run of show</button>
        </div>
        <p className="muted small">For a game that's not on the run of show. It won't be scored unless you add it to the list.</p>
        <div className="steps">
          {PICKER_GAMES.map((g) => <button key={g.id} onClick={() => void setGame(code, g.id)}>{g.name}</button>)}
        </div>
      </section>
    );
  }

  const gameLine = (
    <div className="remote-head">
      {/* Several photo tasks a night: say whose photos these are. */}
      <h2>{game.name}{game.id === "photos" && taskName(session) && `: ${taskName(session)}`}</h2>
      {/* Ends the game (the big screen goes back to the curtain); 🏆 visits the run of show without ending it. */}
      <button className="link" onClick={() => { void setGame(code, null); onRunOfShow(); }}>← Run of show</button>
    </div>
  );

  const status = game.status;
  const data = session.games?.[game.id];
  const shown = (data && "shown" in data && data.shown) || {};
  const unlockedOf = (uid: string) => !!(data && "unlocked" in data && data.unlocked?.[uid]);
  const ready = status ? players.filter(([uid]) => status(session, uid) === "submitted") : [];
  const show = (uid: string) => void showContestant(code, game.id, { uid, step: game.firstStep });

  // A contestant on the big screen: their controls, and the way back to the curtain.
  if (display.uid && current && SHOWING[display.step]) {
    const place = ready.findIndex(([uid]) => uid === display.uid) + 1;
    return (
      <section className="remote">
        {gameLine}
        <p className="on-screen">
          On the big screen: {current.name}'s {SHOWING[display.step]}{display.step === "video" && display.playing === false && " (paused)"}
        </p>
        <h2 className="contestant">{current.name}{place > 0 && <span className="muted">, {place} of {ready.length}</span>}</h2>
        <game.HostPlayer code={code} session={session} display={display} uid={display.uid} />
        {/* Back to the empty curtain, never straight to the next contestant: the running order picks who's next. */}
        <button className="lower" onClick={() => void setDisplay(code, { step: "curtain" })}>Lower the curtain</button>
      </section>
    );
  }

  // Games the host runs (Box): no entries to collect.
  if (!status) {
    const head = (
      <>
        {gameLine}
        <p className="on-screen">On the big screen: {game.onScreen?.(session, display) ?? (display.step === "boxes" ? "the boxes" : display.step === "soundboard" ? "the soundboard" : display.step === "envelopes" ? "the envelopes" : "the curtain")}</p>
      </>
    );
    return (
      <section className="remote">
        {!game.headInLobby && head}
        <game.HostLobby code={code} session={session} display={display} head={game.headInLobby ? head : undefined} />
        {/* The setup already lists everyone; the plain list is only for removing people. */}
        {managing && plainList}
        {manageLink}
      </section>
    );
  }

  const collecting = display.step === "list";
  const shownCount = ready.filter(([uid]) => shown[uid]).length;
  const next = ready.find(([uid]) => !shown[uid]);
  const line = collecting ? `On the big screen: the task, ${ready.length} of ${players.length} submitted`
    : display.step === "curtain" ? `The curtain is down. ${shownCount} of ${ready.length} shown.`
    : "On the big screen: everyone's entries";

  return (
    <section className="remote">
      {gameLine}
      <p className="on-screen">{line}</p>
      {/* Always rendered, so the gold button never moves: disabled with a reason when there's no one to show. */}
      <button className="big" disabled={!next} onClick={() => next && show(next[0])}>
        {next ? `${shownCount === 0 ? "First up" : "Next"}: ${next[1].name} →`
          : ready.length === 0 ? "Waiting for entries" : "Everyone has been shown"}
      </button>
      {players.length === 0 && <p className="muted">No contestants yet.</p>}
      <ul className={collecting ? "picker running intake" : "picker running"}>
        {players.map(([uid, p]) => {
          const s = status(session, uid);
          const unlocked = unlockedOf(uid);
          const cls = shown[uid] ? "shown" : next?.[0] === uid ? "next" : "";
          return (
            <li key={uid} className={cls}>
              {/* Any name can be shown out of turn (the room's mood, a funny one again); "Next" stays put. */}
              <button disabled={s !== "submitted"} onClick={() => show(uid)}>
                <span>{p.name}</span>
                {collecting && s === "submitted" ? <span className="stamp">✓ Submitted</span>
                  : <span className="muted small">
                      {s === "sending" ? "sending…" : s === "waiting" ? (collecting ? "waiting" : "no entry") : shown[uid] ? "shown" : ""}
                    </span>}
                {collecting && unlocked && <span className="muted small">🔓 may resubmit</span>}
              </button>
              {collecting && (s === "submitted"
                ? <button className="lock" aria-label={unlocked ? `Lock ${p.name}'s entry` : `Let ${p.name} resubmit`}
                    onClick={() => void setUnlocked(code, game.id, uid, !unlocked)}>{unlocked ? "🔓" : "🔒"}</button>
                : <span className="lock" aria-hidden />)}
              {removeButton(uid, p.name)}
            </li>
          );
        })}
      </ul>
      <game.HostLobby code={code} session={session} display={display} />
      {manageLink}
    </section>
  );
}

/** The name the host gave the scoreboard task whose photos are on, if any. */
const taskName = (session: Session) => {
  const task = session.games?.photos?.task;
  return task ? session.scoreboard?.tasks?.[task]?.name : undefined;
};

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, type ReactNode } from "react";
import { ClockStrip } from "./clock/ClockStrip";
import { asList, asNums, fmt } from "./JukeboxRemote";
import { stingFiles } from "./sting";
import { joinUrlFor } from "./firebase";
import { activeGame } from "./games";
import { partsOf, wordsOfTask } from "./scoreboard/TaskText";
import { list, pendingIds, sorted, titleOf } from "./scoreboard/tasks";
import { endSting, noBigScreen, setDisplay, setJukeboxState, setShowQr, setUnlocked, showContestant } from "./session";
import type { Display, Session } from "./types";

/** How the status line names what a contestant has on the big screen. */
const SHOWING: Partial<Record<Display["step"], string>> = {
  before: "Before", after: "After", both: "Before and After", video: "video", photo: "photo", portrait: "portrait",
};

/**
 * What follows "On the big screen:" on every page of the host's phone: the one line that says what the room is
 * looking at. While the scores are up it names the tasks the next update adds ("the scores, before Photos").
 */
export function onScreenLine(session: Session): string {
  const display = session.display ?? { step: "list" as const };
  const board = session.scoreboard;
  const game = activeGame(session);
  if (noBigScreen(session)) return "not connected yet";
  const sting = stingFiles(session);
  const stingTask = sting && board?.tasks?.[sting.task];
  if (stingTask && sting.video) return `${titleOf(stingTask)}'s transition video`;
  if (stingTask && sting?.picture) return `${titleOf(stingTask)}'s transition picture`;
  if (session.conversion) return "a useless conversion";
  if (session.clock?.shown) return "the clock";
  if (display.step === "scoreboard") {
    const pending = pendingIds(board).map((id) => board?.tasks?.[id]).filter((t) => !!t).map(titleOf);
    return pending.length ? `the scores, before ${list(pending)}` : "the scores";
  }
  if (display.step === "haul") return "the prize haul";
  if (display.step === "tasktext") return partsOf(wordsOfTask(board, display.task)).length > 1 ? `the task, part ${(display.part ?? 0) + 1}` : "the task";
  if (!game) return display.step === "curtain" || session.begun ? "the curtain" : "the welcome";
  const players = Object.keys(session.players ?? {});
  const current = display.uid ? session.players?.[display.uid] : undefined;
  if (display.uid && current && SHOWING[display.step]) {
    return `${current.name}'s ${SHOWING[display.step]}${display.step === "video" && display.playing === false ? " (paused)" : ""}`;
  }
  // Games the host runs (Box): no entries to collect.
  if (!game.status) {
    return game.onScreen?.(session, display) ?? (display.step === "boxes" ? "the boxes" : display.step === "soundboard" ? "the soundboard"
      : display.step === "envelopes" ? "the envelopes" : "the curtain");
  }
  const ready = players.filter((uid) => game.status!(session, uid) === "submitted");
  const data = session.games?.[game.id];
  const shown = (data && "shown" in data && data.shown) || {};
  if (display.step === "list" && game.holdsScreen?.(session)) return "the clock";
  if (display.step === "list") return `the task, ${ready.length} of ${players.length} submitted`;
  if (display.step === "curtain") return `the curtain, ${ready.filter((uid) => shown[uid]).length} of ${ready.length} shown`;
  return "everyone's entries";
}

/**
 * The status line opening every page, and under it, while a song plays, the "now playing" strip: one tap pauses it
 * wherever you are. It's pressed in, never gold, so the gold stays on the next thing to do.
 */
export function OnScreen({ code, session, chip, noClock }: { code: string; session: Session; chip?: ReactNode; noClock?: boolean }) {
  return (
    <>
      <p className="on-screen">On the big screen: {onScreenLine(session)}</p>
      {chip}
      {!noClock && <ClockStrip code={code} session={session} />}
      <TransitionStrip code={code} session={session} />
      <NowPlaying code={code} session={session} />
    </>
  );
}

/**
 * While a task's transition is on: the now-playing strip's shape, "⏹ Task fanfare" and the time left (none for a picture on its own).
 * One tap ends it, never pauses it: a half-played sting is never wanted back. A video that has finished holds its last frame on the
 * big screen, and the strip says "last frame" until the host puts something else up or taps it.
 */
function TransitionStrip({ code, session }: { code: string; session: Session }) {
  const sting = session.sting;
  const files = stingFiles(session);
  const [, tick] = useState(0);
  const timed = !!files && !!(files.video || files.music);
  useEffect(() => {
    if (!timed) return;
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [timed]);
  if (!files || !sting) return null;
  const jukebox = session.jukebox;
  const [name, length] = files.video
    ? [files.video.replace(/\.[^.]+$/, ""), asNums(jukebox?.transitionVideoDurations)[asList(jukebox?.transitionVideos).indexOf(files.video)]]
    : files.music
      ? [files.music, asNums(jukebox?.transitionDurations)[asList(jukebox?.transitions).indexOf(files.music)]]
      : [`${(files.picture ?? "").replace(/\.[^.]+$/, "")} picture`, undefined];
  const left = length && sting.at ? Math.max(1, Math.round(length - (Date.now() - sting.at) / 1000)) : undefined;
  return (
    <button className="sb-song now-playing-strip" aria-label={`End ${name}`} onClick={() => void endSting(code)}>
      <span className="title">⏹ {name}</span>
      {sting.held ? <span className="dur">last frame</span> : left && <span className="dur">{fmt(left)} left</span>}
    </button>
  );
}

function NowPlaying({ code, session }: { code: string; session: Session }) {
  const jukebox = session.jukebox;
  const state = jukebox?.state ?? {};
  const title = state.current === undefined ? undefined : asList(jukebox?.tracks)[state.current];
  const playing = state.playing === true && !!title;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [playing]);
  if (!playing) return null;
  const length = asNums(jukebox?.durations)[state.current!];
  const clock = jukebox?.clock;
  const elapsed = clock && clock.pos + (clock.running ? Math.max(0, (Date.now() - clock.at) / 1000) : 0);
  const left = length && elapsed !== undefined ? Math.max(1, Math.round(length - elapsed)) : undefined;
  return (
    <button className="sb-song now-playing-strip" aria-label={`Pause ${title}`} onClick={() => void setJukeboxState(code, { playing: false })}>
      <span className="title">⏸ {title}</span>
      <span className="dur">{left ? `${fmt(left)} left` : fmt(length)}</span>
    </button>
  );
}

/**
 * For anyone who arrives late: the join code, on the host's phone to hold up. A small chip beside the code on Run of show. While it's open the big screen
 * shows it too, above its corner code (on the curtain and while entries come in), and closing it hides both.
 */
export function JoinQr({ code, session }: { code: string; session: Session }) {
  const close = () => void setShowQr(code, false);
  return (
    <>
      <button className="line-chip-button" onClick={() => void setShowQr(code, true)}>Show QR</button>
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

/**
 * The game in progress, in the middle of its task page: the one next action in gold, then the contestants in
 * join order. While entries come in, the list carries their stamps and the 🔒/🔓 resubmit column; once the curtain
 * is down between contestants it becomes the running order (shown ones dimmed, the next one outlined). A contestant
 * on the big screen gets their own controls, a step inside, and lowering the curtain comes back to the list.
 * `quiet`: the next action is paper, while the task's words are still to go up (gold is on "Show the task").
 * `head`: the page's top, for games that lay it out themselves (Noisemaster's columns).
 */
export function GameControls({ code, session, quiet, head }: { code: string; session: Session; quiet?: boolean; head?: ReactNode }) {
  const game = activeGame(session);
  if (!game) return null;
  const players = Object.entries(session.players ?? {}).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
  const display = session.display ?? { step: "list" as const };
  const current = display.uid ? session.players?.[display.uid] : undefined;
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
      <>
        {head}
        <h2 className="contestant">{current.name}{place > 0 && <span className="muted">, {place} of {ready.length}</span>}</h2>
        <game.HostPlayer code={code} session={session} display={display} uid={display.uid} />
        {/* Back to the empty curtain, never straight to the next contestant: the running order picks who's next. */}
        <button className="lower" onClick={() => void setDisplay(code, { step: "curtain" })}>Lower the curtain</button>
      </>
    );
  }

  // Games the host runs (Box): no entries to collect, and the game lays out its own setup.
  if (!status) {
    return game.headInLobby ? <game.HostLobby code={code} session={session} display={display} head={head} />
      : <>{head}<game.HostLobby code={code} session={session} display={display} /></>;
  }

  const collecting = display.step === "list";
  const shownCount = ready.filter(([uid]) => shown[uid]).length;
  const next = ready.find(([uid]) => !shown[uid]);
  const everyone = !collecting && ready.length > 0 && !next;
  // A timed round (Flipchart) has its own gold control until it's over, and nobody is shown before then.
  const hold = game.canShow?.(session) === false;

  return (
    <>
      {head}
      {/* Once everyone has been shown the game is one line, and the gold moves to the points. Until then it's
          always rendered, so the gold button never moves: disabled with a reason when there's no one to show. */}
      {game.Round && <game.Round code={code} session={session} />}
      {everyone ? <p className="muted">All {ready.length} shown.</p> : (
        <button className={quiet || hold ? undefined : "big"} disabled={!next || hold} onClick={() => next && show(next[0])}>
          {next ? `${shownCount === 0 ? "First up" : "Next"}: ${next[1].name} →` : "Waiting for entries"}
        </button>
      )}
      {players.length === 0 && <p className="muted">No contestants yet.</p>}
      <ul className={collecting ? "picker running intake" : "picker running"}>
        {players.map(([uid, p]) => {
          const s = status(session, uid);
          const unlocked = unlockedOf(uid);
          const cls = shown[uid] ? "shown" : next?.[0] === uid ? "next" : "";
          return (
            <li key={uid} className={cls}>
              {/* Any name can be shown out of turn (the room's mood, a funny one again); "Next" stays put. */}
              <button disabled={s !== "submitted" || hold} onClick={() => show(uid)}>
                <span>{p.name}</span>
                {collecting && s === "submitted" ? <span className="stamp">✓ Submitted</span>
                  : <span className="muted small">
                      {s === "sending" ? "sending…" : s === "waiting" ? (collecting ? "waiting" : "no entry") : shown[uid] ? "shown" : ""}
                    </span>}
                {collecting && unlocked && <span className="muted small">🔓 may resubmit</span>}
              </button>
              {collecting && !game.Round && (s === "submitted"
                ? <button className="lock" aria-label={unlocked ? `Lock ${p.name}'s entry` : `Let ${p.name} resubmit`}
                    onClick={() => void setUnlocked(code, game.id, uid, !unlocked)}>{unlocked ? "🔓" : "🔒"}</button>
                : <span className="lock" aria-hidden />)}
            </li>
          );
        })}
      </ul>
      <game.HostLobby code={code} session={session} display={display} />
    </>
  );
}

/** The run-of-show tasks in order, for anything that needs a task's number ("Task 3 of 8"). */
export const placeOf = (session: Session, id: string) => {
  const tasks = sorted(session.scoreboard?.tasks);
  return { place: tasks.findIndex(([t]) => t === id) + 1, of: tasks.length };
};

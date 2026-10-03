import { onChildAdded, ref } from "firebase/database";
import { useEffect, useRef } from "react";
import { Curtain } from "../../Curtain";
import { db } from "../../firebase";
import { setDisplay } from "../../session";
import { useStageBarVisible } from "../../stageBar";
import type { Display, NoisemasterPress, NoisemasterRound, Session } from "../../types";
import { elapsedOf, formatTime, recordPress, restartRound, roundOf, useNoisemasterSecret, useServerNow, useServerOffset } from "./data";
import { Soundboard } from "./Soundboard";
import { playSound, prepareSounds, useSoundCount } from "./sounds";

/**
 * Main screen: a picture of the soundboard lighting up with each press, and the
 * clock. The main screen (not an extra one) is also the referee: it plays each press and checks it.
 */
export function Stage({ code, session, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const round = roundOf(session);
  useReferee(code, round, !viewOnly);
  const sounds = useSoundCount();
  const controls = !viewOnly && <StageControls code={code} round={round} />;
  // the curtain while the host sets up: the room looks at the host
  if (!round) return <Curtain code={code} session={session}>{controls}</Curtain>;

  const progress = round.progress ?? 0;
  const done = !!round.doneAt;
  const mistakes = round.mistakes ?? 0;
  return (
    <main className="stage soundboard-stage">
      <div className="soundboard-floor">
        <Soundboard last={round.last} />
        <div className="soundboard-side">
          <p className="soundboard-player">{session.players?.[round.player]?.name ?? "?"}</p>
          <Clock round={round} />
          <p className="soundboard-mistakes">{progress} of {round.phrase.length} words</p>
          <p className="soundboard-mistakes">{mistakes === 1 ? "1 restart" : `${mistakes} restarts`}</p>
          {done && <span className="stamp">✓ Done</span>}
        </div>
      </div>
      {/* keyed by the press, so each mistake gets its own announcement */}
      {round.last && !round.last.ok && !done && <div key={round.last.key} className="start-again">Start again!</div>}
      {!viewOnly && sounds === 0 && <p className="sound-hint">🔇 No sound files on this computer, so the words are spoken by its voice (click this screen once, or the browser keeps it silent). For recordings, put them in a "Noisemaster" folder inside the music folder.</p>}
      {controls}
    </main>
  );
}

/** The time so far, ticking until the last word is said. */
function Clock({ round }: { round: NoisemasterRound }) {
  const now = useServerNow(!!round.firstAt && !round.doneAt);
  return <p className="soundboard-clock">{formatTime(elapsedOf(round, now))}</p>;
}

/**
 * The main screen's referee: plays each press of the round and checks it against the phrase. A wrong
 * press starts the phrase again (and counts, if it's the phrase's first word, as the first word of the
 * new go). It works it all out again from the first press after a refresh, without replaying old sounds.
 */
function useReferee(code: string, round: NoisemasterRound | undefined, enabled: boolean) {
  const board = useNoisemasterSecret(code, enabled && !!round)?.board;
  const offset = useRef(0);
  offset.current = useServerOffset();
  const boardKey = board?.join("\n");
  useEffect(() => { if (board) prepareSounds(board); }, [boardKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const phrase = round?.phrase;
  useEffect(() => {
    if (!enabled || !board || !phrase) return;
    let progress = 0;
    let mistakes = 0;
    let firstAt: number | undefined;
    let doneAt: number | undefined;
    return onChildAdded(ref(db(), `sessions/${code}/games/noisemaster/round/presses`), (s) => {
      const p = s.val() as NoisemasterPress;
      const word = board[p.i];
      if (doneAt !== undefined || word === undefined) return;
      firstAt ??= p.at;
      const ok = word === phrase[progress];
      if (ok) progress++;
      else { mistakes++; progress = word === phrase[0] ? 1 : 0; }
      if (progress === phrase.length) doneAt = p.at;
      // Only presses from the last couple of seconds: not the whole round again after a refresh.
      if (p.at > Date.now() + offset.current - 2000) void playSound(word);
      void recordPress(code, { progress, mistakes, firstAt, doneAt: doneAt ?? null, last: { key: s.key!, i: p.i, ok } }).catch(() => {});
    });
  }, [code, enabled, boardKey, round?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Backup controls for the main screen (the host phone does the same). Keys:
 *   R = restart the attempt     Esc or Backspace = back to players
 */
function StageControls({ code, round }: { code: string; round: NoisemasterRound | undefined }) {
  const visible = useStageBarVisible();
  const restart = () => { if (round) void restartRound(code, round); };
  const back = () => void setDisplay(code, { step: "list" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "r": case "R": restart(); break;
        case "Escape": case "Backspace": back(); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const tab = visible ? 0 : -1;
  return (
    <div className={visible ? "stage-controls show" : "stage-controls"} aria-hidden={!visible}>
      {round && <button onClick={restart} tabIndex={tab}>↺ Restart</button>}
      <button onClick={back} tabIndex={tab}>← Players</button>
    </div>
  );
}

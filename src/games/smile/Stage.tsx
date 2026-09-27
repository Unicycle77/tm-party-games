import { onDisconnect, ref } from "firebase/database";
import { useEffect, useRef } from "react";
import { db } from "../../firebase";
import { setDisplay } from "../../session";
import { useStageBarVisible } from "../../stageBar";
import type { Display, Session, SmileGame } from "../../types";
import { Bulb } from "./Bulb";
import { playBuzz, useSoundBlocked } from "./buzzer";
import { ANSWER, ON_MS, TITLE, buzzLater, buzzNow, cameraText, isArmed, setArmed, setCamera, smileOf, useLit } from "./data";
import { SmileCamera } from "./SmileCamera";

/**
 * Main screen: the light bulb, which lights up (with the buzzer) for a second at a time. Only the
 * main screen watches the camera; extra screens just light up and buzz along.
 */
export function Stage({ code, session, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const game = smileOf(session);
  const soundBlocked = useSoundBlocked();
  const lit = useLit(game.buzzAt, () => playBuzz(ON_MS));
  return (
    <main className={lit ? "stage light on" : "stage light"}>
      <h1 className="light-title">{TITLE}</h1>
      <Bulb lit={lit} />
      {game.revealed && <div className="light-answer">{ANSWER}</div>}
      {soundBlocked && <div className="sound-hint">🔇 Click anywhere on this screen once to turn the sound on</div>}
      {!viewOnly && <Watcher code={code} armed={isArmed(game)} />}
      {!viewOnly && <StageControls code={code} game={game} />}
    </main>
  );
}

/** Runs the camera and sets the buzzer off a few seconds after each smile ends (unless the host has paused it). */
function Watcher({ code, armed }: { code: string; armed: boolean }) {
  const armedNow = useRef(armed);
  armedNow.current = armed;
  const timers = useRef<number[]>([]);

  useEffect(() => {
    // If this screen closes, the host phone stops showing what the camera saw.
    const camera = ref(db(), `sessions/${code}/games/smile/camera`);
    void onDisconnect(camera).remove();
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      void onDisconnect(camera).cancel();
      void setCamera(code, null);
    };
  }, [code]);

  return (
    <SmileCamera
      onStopSmiling={() => { if (armedNow.current) timers.current.push(buzzLater(code)); }}
      onStatus={(status) => void setCamera(code, status)} />
  );
}

/**
 * Backup controls for the main screen (the host phone does the same). Keys:
 *   B = buzz now (a test)     P = pause / resume the camera     Esc or Backspace = back to players
 */
function StageControls({ code, game }: { code: string; game: SmileGame }) {
  const visible = useStageBarVisible();
  const armed = isArmed(game);
  const back = () => void setDisplay(code, { step: "list" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "b": case "B": void buzzNow(code); break;
        case "p": case "P": void setArmed(code, !armed); break;
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
      <span className="light-camera">{cameraText(game, true)}</span>
      <button onClick={() => void buzzNow(code)} tabIndex={tab}>Buzz now</button>
      <button className={armed ? undefined : "active"} onClick={() => void setArmed(code, !armed)} tabIndex={tab}>
        {armed ? "⏸ Pause camera" : "▶ Resume camera"}
      </button>
      <button onClick={back} tabIndex={tab}>← Players</button>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import {
  DELAY_MS, cameraText, clock, isArmed, lightLater, lightNow, resetTimer, setArmed, setRevealed, smileOf, startTimer, stopTimer, useElapsed,
} from "./data";

/** Not used: this game never shows one player on their own. */
export const HostPlayer = () => null;

/** The host's phone, above the player list: the secret, what the camera sees, the task's clock and a manual light. */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const game = smileOf(session);
  const armed = isArmed(game);
  const onStage = display.step === "light";
  const elapsed = useElapsed(game.timer);
  const running = elapsed !== undefined && !game.timer?.stoppedAt;
  // Manual lights counting down (for someone the camera missed).
  const [pending, setPending] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function lightSoon() {
    setPending((n) => n + 1);
    timers.current.push(lightLater(code), window.setTimeout(() => setPending((n) => n - 1), DELAY_MS));
  }

  return (
    <div className="smile-host">
      <p className="muted small">
        Only you know: the light goes on {DELAY_MS / 1000} seconds after anyone stops smiling.
        The main screen's camera watches for it; the picture is never shown or saved.
      </p>
      <p>{cameraText(game, onStage)}</p>
      <button onClick={() => void setDisplay(code, onStage ? { step: "list" } : { step: "light" })}>
        {onStage ? "Show the players on the main screen" : "Show the light bulb on the main screen"}
      </button>
      <p className="muted small">Clock: <span className="light-host-clock">{elapsed === undefined ? "not started" : clock(elapsed)}</span></p>
      <div className="steps two">
        <button className={running ? "active" : undefined} disabled={elapsed !== undefined && !running}
          onClick={() => void (running ? stopTimer(code) : startTimer(code))}>
          {running ? "⏸ Stop the clock" : "▶ Start the clock"}
        </button>
        <button disabled={elapsed === undefined} onClick={() => void resetTimer(code)}>↺ Reset the clock</button>
      </div>
      <div className="steps two">
        <button disabled={pending > 0} onClick={lightSoon}>{pending > 0 ? "Lighting…" : `Light in ${DELAY_MS / 1000} s`}</button>
        <button onClick={() => void lightNow(code)}>Light it now</button>
      </div>
      <p className="muted small">"Light in {DELAY_MS / 1000} s" is for a smile the camera missed; "Light it now" is a test.</p>
      <div className="steps two">
        <button className={armed ? undefined : "active"} onClick={() => void setArmed(code, !armed)}>
          {armed ? "⏸ Pause camera" : "▶ Resume camera"}
        </button>
        <button className={game.revealed ? "active" : undefined} onClick={() => void setRevealed(code, !game.revealed)}>
          {game.revealed ? "Hide the answer" : "Reveal the answer"}
        </button>
      </div>
    </div>
  );
}

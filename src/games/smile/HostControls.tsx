import { useEffect, useRef, useState } from "react";
import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import { DELAY_MS, buzzLater, buzzNow, cameraText, isArmed, setArmed, setRevealed, smileOf } from "./data";

/** Not used: this game never shows one player on their own. */
export const HostPlayer = () => null;

/** The host's phone, above the player list: the secret, what the camera sees, and a manual buzzer. */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const game = smileOf(session);
  const armed = isArmed(game);
  const onStage = display.step === "light";
  // Manual buzzes counting down (for someone the camera missed).
  const [pending, setPending] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function buzzSoon() {
    setPending((n) => n + 1);
    timers.current.push(buzzLater(code), window.setTimeout(() => setPending((n) => n - 1), DELAY_MS));
  }

  return (
    <div className="smile-host">
      <p className="muted small">
        Only you know: the light and buzzer go on {DELAY_MS / 1000} seconds after anyone stops smiling.
        The main screen's camera watches for it; the picture is never shown or saved.
      </p>
      <p>{cameraText(game, onStage)}</p>
      <button onClick={() => void setDisplay(code, onStage ? { step: "list" } : { step: "light" })}>
        {onStage ? "Show the players on the main screen" : "Show the light bulb on the main screen"}
      </button>
      <div className="steps two">
        <button disabled={pending > 0} onClick={buzzSoon}>{pending > 0 ? "Buzzing…" : `Buzz in ${DELAY_MS / 1000} s`}</button>
        <button onClick={() => void buzzNow(code)}>Buzz now</button>
      </div>
      <p className="muted small">"Buzz in {DELAY_MS / 1000} s" is for a smile the camera missed; "Buzz now" is a test.</p>
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

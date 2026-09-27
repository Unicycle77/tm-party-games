import type { SmileGame } from "../../types";
import { ANSWER, BRIEF, clock, useElapsed } from "./data";

/** The task card: the brief, the clock once the host starts it, and the answer once it's revealed. */
export function Task({ game }: { game: SmileGame }) {
  const elapsed = useElapsed(game.timer);
  return (
    <div className="light-task">
      <p className="light-brief">{BRIEF}</p>
      {elapsed !== undefined && (
        <p className={game.timer?.stoppedAt ? "light-clock stopped" : "light-clock"}>
          {game.timer?.stoppedAt ? "⏸ " : ""}{clock(elapsed)}
        </p>
      )}
      {game.revealed && <p className="light-answer">{ANSWER}</p>}
    </div>
  );
}

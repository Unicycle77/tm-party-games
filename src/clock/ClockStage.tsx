import type { Session } from "../types";
import { contestantsOf, useClock } from "./data";
import { FlipClock } from "./FlipClock";

/**
 * The big screen while the host shows the ⏱ clock: the show's clock alone, the one focus, over whatever was on. Timing one player
 * at a time, the stage's paper label under it names whose turn it is.
 */
export function ClockStage({ session }: { session: Session }) {
  const view = useClock(session);
  const who = contestantsOf(session).find((c) => c.id === session.clock?.who);
  return (
    <main className="clock-stage">
      <FlipClock ms={view.ms} up={view.up} width="93vh" className="tv" />
      {who && !view.owner && <div className="stage-label"><span>{who.name}</span>'s turn</div>}
    </main>
  );
}

import type { Session } from "../types";
import { useClock } from "./data";
import { FlipClock } from "./FlipClock";

/** The big screen while the host shows the ⏱ clock: the show's clock alone, the one focus, over whatever was on. */
export function ClockStage({ session }: { session: Session }) {
  const view = useClock(session);
  return (
    <main className="clock-stage">
      <FlipClock ms={view.ms} up={view.up} width="93vh" className="tv" />
    </main>
  );
}

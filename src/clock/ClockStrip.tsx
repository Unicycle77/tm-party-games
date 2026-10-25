import { createContext, useContext } from "react";
import { useServerOffset } from "../games/noisemaster/data";
import type { Session } from "../types";
import { clockText, startClock, stopClock, useClock, watchLabel } from "./data";

/** How a page opens ⏱ (the host's phone provides it): the strip below opens it from anywhere. */
export const OpenClock = createContext<() => void>(() => {});

/**
 * The clock's strip under "On the big screen", on every page while it's set going, shown or Flipchart's: the same shape and
 * place as the song strip. Tapping the strip opens ⏱ (it never changes what the room sees); the ⏸ beside it, a separate
 * button, holds the clock and ▶ carries on.
 */
export function ClockStrip({ code, session }: { code: string; session: Session }) {
  const view = useClock(session);
  const offset = useServerOffset();
  const open = useContext(OpenClock);
  const state = session.clock;
  if (!view.owner && !state?.begun && !view.shown) return null;
  const face = view.up ? watchLabel(view.ms) : clockText(view.ms);
  const label = view.owner ? `${face} left`
    : view.phase === "done" ? "time's up"
    : view.phase === "idle" ? `ready · ${face}`
    : view.phase === "held" ? `held · ${view.up ? face : `${face} left`}`
    : view.up ? face : `${face} left`;
  const hold = view.phase === "running" && !view.owner;
  const carryOn = view.phase === "held" && !state?.stopped && !view.owner;
  return (
    <div className="clock-strip">
      <button className="sb-song" onClick={open}>
        <span className="title">⏱ {view.owner ? "Flipchart's clock" : "The clock"} →</span>
        <span className="dur">{label}</span>
      </button>
      {hold && <button className="clock-hold" aria-label="Stop the clock" onClick={() => void stopClock(code, view, offset)}>⏸</button>}
      {carryOn && <button className="clock-hold" aria-label="Start the clock" onClick={() => void startClock(code, view, offset)}>▶</button>}
    </div>
  );
}

/** ⏱ in the header: glows while the clock counts, the same as 💡 does while the light is on. */
export function ClockIcon({ session, icon }: { session: Session; icon: (v: "clock", label: string, glyph: string, lit: boolean) => React.ReactNode }) {
  const view = useClock(session);
  const lit = view.phase === "running";
  return <>{icon("clock", lit ? "The clock (running)" : "The clock", "⏱", lit)}</>;
}

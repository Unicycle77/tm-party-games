import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import { addFiveMinutes, closed, dataOf, endNow, flipchartStatus, running, sentCount, startClock, started, useRemaining } from "./data";
import { FlipClock } from "./FlipClock";
import { useServerOffset } from "../noisemaster/data";

/**
 * The host's phone, with a guest's portrait on screen: the pages land one at a time, so the only control is
 * skipping to the finished portrait. "Lower the curtain" (below) leads back to the running order and its "Next".
 */
export function HostPlayer({ code, display, uid }: { code: string; session: Session; display: Display; uid: string }) {
  if (display.settled) return null;
  return <button className="link" onClick={() => void setDisplay(code, { ...display, uid, settled: true })}>Skip to the portrait</button>;
}

/** The host's phone, above the guest list: everyone's portrait on one screen, once the time is up. */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const everyone = display.step === "portraits";
  return (
    <div className="steps">
      <button
        className={everyone ? "step active" : "step"}
        disabled={!closed(session) || !Object.keys(session.players ?? {}).some((uid) => flipchartStatus(session, uid) === "submitted")}
        onClick={() => void setDisplay(code, everyone ? { step: "list" } : { step: "portraits" })}
      >
        {everyone ? "✕ Close" : "◫ Show everyone"}
      </button>
    </div>
  );
}

/**
 * The round, where the gold "next thing" sits on the task page: before the start the clock at its limit and gold "Your time
 * starts now"; while it runs the same clock, with "+5 minutes" and "End now"; after it, nothing (the running order has the gold).
 */
export function Round({ code, session }: { code: string; session: Session }) {
  const offset = useServerOffset();
  const remaining = useRemaining(session);
  const data = dataOf(session);
  if (closed(session)) return null;
  const live = running(session);
  const players = Object.keys(session.players ?? {}).length;
  return (
    <div className="fc-round">
      <FlipClock ms={remaining} width="215px" />
      {live ? (
        <div className="row fc-round-links">
          <button className="link" onClick={() => void addFiveMinutes(code, data.endsAt!)}>+5 minutes</button>
          <button className="link" onClick={() => {
            const drawing = players - sentCount(session);
            if (confirm(`Send everyone's portraits now?${drawing ? ` ${drawing} ${drawing === 1 ? "is" : "are"} still drawing.` : ""}`)) void endNow(code, offset);
          }}>End now: send everyone's</button>
        </div>
      ) : <button className="big" disabled={started(session)} onClick={() => void startClock(code, session, offset)}>Your time starts now</button>}
    </div>
  );
}

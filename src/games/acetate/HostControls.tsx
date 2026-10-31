import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import { FlipClock } from "../../clock/FlipClock";
import { useServerOffset } from "../noisemaster/data";
import { acetateStatus, closed, endNow, running, sentCount, startClock, started, useRemaining } from "./data";

/**
 * The host's phone, with a guest's acetate on screen: the hand puts it down, so the only control is skipping to the
 * settled acetate. "Lower the curtain" (below) leads back to the running order and its "Next".
 */
export function HostPlayer({ code, display, uid }: { code: string; session: Session; display: Display; uid: string }) {
  if (display.settled) return null;
  return <button className="link" onClick={() => void setDisplay(code, { ...display, uid, settled: true })}>Skip to the acetate</button>;
}

/** The host's phone, above the guest list: everyone's acetate on one screen, once the time is up. */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const everyone = display.step === "acetates";
  return (
    <div className="steps">
      <button
        className={everyone ? "step active" : "step"}
        disabled={!closed(session) || !Object.keys(session.players ?? {}).some((uid) => acetateStatus(session, uid) === "submitted")}
        onClick={() => void setDisplay(code, everyone ? { step: "list" } : { step: "acetates" })}
      >
        {everyone ? "✕ Close" : "◫ Show everyone"}
      </button>
    </div>
  );
}

/**
 * The round, where the gold "next thing" sits on the task page: before the start the clock at its limit and gold "Your time
 * starts now"; while it runs the same clock and "End now". No extra time: it's a live task. After it, nothing (the running
 * order has the gold).
 */
export function Round({ code, session }: { code: string; session: Session }) {
  const offset = useServerOffset();
  const remaining = useRemaining(session);
  if (closed(session)) return null;
  const live = running(session);
  const players = Object.keys(session.players ?? {}).length;
  return (
    <div className="fc-round">
      <FlipClock ms={remaining} width="215px" />
      {live ? (
        <div className="row fc-round-links">
          <button className="link" onClick={() => {
            const drawing = players - sentCount(session);
            if (confirm(`Send everyone's acetates now?${drawing ? ` ${drawing} ${drawing === 1 ? "is" : "are"} still drawing.` : ""}`)) void endNow(code, offset);
          }}>End now: send everyone's</button>
        </div>
      ) : <button className="big" disabled={started(session)} onClick={() => void startClock(code, session, offset)}>Your time starts now</button>}
    </div>
  );
}

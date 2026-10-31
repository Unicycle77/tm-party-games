import { useEffect, type CSSProperties } from "react";
import { GameBar } from "../../StageBar";
import { setDisplay, showContestant } from "../../session";
import { useStageBarVisible } from "../../useStageBarVisible";
import { TaskCard } from "../../TaskCard";
import type { Display, Session } from "../../types";
import { FlipClock } from "../../clock/FlipClock";
import { acetateStatus, acetateTask, acetateWords, closed, drawOf, running, sheetOf, useRemaining } from "./data";
import { Projector } from "./Projector";

/** Players with an acetate to show, in the order they joined (as on the "everyone" screen). */
export const acetatesOf = (session: Session) =>
  Object.entries(session.players ?? {}).filter(([uid]) => acetateStatus(session, uid) === "submitted")
    .sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0)).map(([uid]) => uid);

/**
 * While the guests draw: the show's clock, the big screen's one focus. Nothing of anyone's acetate, and nothing projector-like:
 * the room going dark is saved for the first reveal. Before the clock and after it, the task's words as on every task.
 */
export function Collecting({ session }: { code: string; session: Session; viewOnly: boolean }) {
  const remaining = useRemaining(session);
  if (running(session)) return <FlipClock ms={remaining} width="93vh" className="tv" />;
  const words = acetateTask(session)?.text ?? acetateWords(drawOf(acetateTask(session)));
  return <TaskCard lines={["", words]}>{closed(session) && <span className="stamp all-in">✓ All submitted</span>}</TaskCard>;
}

/** Main screen: one guest's acetate on the overhead projector, put down by hand, or everyone's in a row of projectors. */
export function Stage({ code, session, display, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const controls = viewOnly ? null : <StageControls code={code} session={session} display={display} />;

  if (display.step === "acetates" || !display.uid) {
    const order = acetatesOf(session);
    const cols = order.length <= 5 ? Math.max(1, order.length) : Math.ceil(order.length / 2);
    const rows = Math.ceil(order.length / cols) || 1;
    return (
      <main className="stage ohp-stage">
        <div className="ohp-row" style={{ "--cols": cols, "--rows": rows } as CSSProperties}>
          {order.map((uid) => (
            <figure key={uid}>
              <Projector uid={uid} strokes={sheetOf(session, uid)} small />
              <figcaption><span>acetate</span> · {session.players?.[uid]?.name ?? ""}</figcaption>
            </figure>
          ))}
        </div>
        {controls}
      </main>
    );
  }

  const name = session.players?.[display.uid]?.name ?? "";
  return (
    <main className="stage ohp-stage">
      {/* keyed by guest (and skip), so each acetate is put down fresh */}
      <Projector key={`${display.uid}-${display.settled ? "settled" : "landing"}`} uid={display.uid} strokes={sheetOf(session, display.uid)} landing={!display.settled} />
      <div className="stage-label"><span>acetate</span> · {name}</div>
      {controls}
    </main>
  );
}

/**
 * Backup controls for the main screen (see Photos' StageControls). Keys:
 *   ← → = previous / next guest's acetate     Esc or Backspace = lower the curtain
 */
function StageControls({ code, session, display }: { code: string; session: Session; display: Display }) {
  const visible = useStageBarVisible();
  const uid = display.uid;
  const order = acetatesOf(session);
  const at = uid ? order.indexOf(uid) : -1;
  const prev = at > 0 ? order[at - 1] : undefined;
  const next = at >= 0 ? order[at + 1] : undefined;
  const show = (target: string | undefined) => { if (target) void showContestant(code, "acetate", { uid: target, step: "acetate" }); };
  const back = () => void setDisplay(code, { step: "curtain" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight": case "PageDown": show(next); break;
        case "ArrowLeft": case "PageUp": show(prev); break;
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
    <GameBar>
      {uid && display.step === "acetate" && (
        <>
          <button disabled={!prev} onClick={() => show(prev)} tabIndex={tab}>Previous</button>
          <button disabled={!next} onClick={() => show(next)} tabIndex={tab}>Next</button>
          <button onClick={() => void setDisplay(code, { step: "acetates" })} tabIndex={tab}>◫ Everyone</button>
        </>
      )}
    </GameBar>
  );
}

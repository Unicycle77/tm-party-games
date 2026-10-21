import { useEffect } from "react";
import { Framed } from "../../Framed";
import { Review } from "../../Review";
import { setDisplay, showContestant } from "../../session";
import { useStageBarVisible } from "../../stageBar";
import { TaskCard } from "../../TaskCard";
import type { Display, Session } from "../../types";
import { FlipClock } from "./FlipClock";
import { closed, drawOf, flipchartStatus, flipchartTask, flipchartWords, running, useCloser, useRemaining } from "./data";
import { Portrait } from "./Portrait";
import { PORTRAIT_RATIO, pagesOf } from "./strokes";

/** Players with a portrait to show, in the order they joined (as on the "everyone" screen). */
const portraitsOf = (session: Session) =>
  Object.entries(session.players ?? {}).filter(([uid]) => flipchartStatus(session, uid) === "submitted")
    .sort(([, a], [, b]) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0)).map(([uid]) => uid);

/**
 * While the guests draw: the show's clock, the big screen's one focus, with the usual tally beside it (see Screen). Before the
 * clock starts and after it stops, the task's words as on every task, with the stamp once everyone's portrait is in.
 */
export function Collecting({ code, session, viewOnly }: { code: string; session: Session; viewOnly: boolean }) {
  const remaining = useRemaining(session);
  useCloser(code, session, !viewOnly);
  if (running(session)) return <FlipClock ms={remaining} width="93vh" className="tv" />;
  const words = flipchartTask(session)?.text ?? flipchartWords(drawOf(flipchartTask(session)));
  return <TaskCard lines={["", words]}>{closed(session) && <span className="stamp all-in">✓ All submitted</span>}</TaskCard>;
}

/** Main screen: one guest's portrait in a gold frame, the pages landing one at a time, or everyone's on one screen. */
export function Stage({ code, session, display, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const controls = viewOnly ? null : <StageControls code={code} session={session} display={display} />;

  if (display.step === "portraits" || !display.uid) {
    return (
      <Review players={session.players ?? {}} photosOf={() => []} labels={["portrait"]}
        art={{ ratio: PORTRAIT_RATIO, slot: [2.4, 3.4], has: (uid) => flipchartStatus(session, uid) === "submitted", render: (uid) => <Portrait pages={pagesOf(session, uid)} /> }}>
        {controls}
      </Review>
    );
  }

  const name = session.players?.[display.uid]?.name ?? "";
  return (
    <main className="stage">
      {/* keyed by guest, so each portrait is hung fresh and its pages land again */}
      <Framed key={display.uid}>
        {(setRatio) => <Fit setRatio={setRatio}><Portrait key={display.settled ? "settled" : "landing"} pages={pagesOf(session, display.uid!)} landing={!display.settled} /></Fit>}
      </Framed>
      <div className="stage-label"><span>portrait</span> · {name}</div>
      {controls}
    </main>
  );
}

/** Tells the frame the portrait's shape, so it's as big as the screen allows. */
function Fit({ setRatio, children }: { setRatio: (r: number) => void; children: React.ReactNode }) {
  useEffect(() => setRatio(PORTRAIT_RATIO), [setRatio]);
  return <>{children}</>;
}

/**
 * Backup controls for the main screen (see Photos' StageControls). Keys:
 *   ← → = previous / next guest's portrait     Esc or Backspace = lower the curtain
 */
function StageControls({ code, session, display }: { code: string; session: Session; display: Display }) {
  const visible = useStageBarVisible();
  const uid = display.uid;
  const order = portraitsOf(session);
  const at = uid ? order.indexOf(uid) : -1;
  const prev = at > 0 ? order[at - 1] : undefined;
  const next = at >= 0 ? order[at + 1] : undefined;
  const show = (target: string | undefined) => { if (target) void showContestant(code, "flipchart", { uid: target, step: "portrait" }); };
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
    <div className={visible ? "stage-controls show" : "stage-controls"} aria-hidden={!visible}>
      {uid && display.step === "portrait" && (
        <>
          <button disabled={!prev} onClick={() => show(prev)} tabIndex={tab}>Previous</button>
          <button disabled={!next} onClick={() => show(next)} tabIndex={tab}>Next</button>
          <button onClick={() => void setDisplay(code, { step: "portraits" })} tabIndex={tab}>◫ Everyone</button>
        </>
      )}
      <button onClick={back} tabIndex={tab}>Lower the curtain</button>
    </div>
  );
}

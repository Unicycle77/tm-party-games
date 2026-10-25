import { GameBar } from "../../StageBar";
import { useEffect } from "react";
import { Framed } from "../../Framed";
import { Review } from "../../Review";
import { SafeImg } from "../../SafeImg";
import { setDisplay } from "../../session";
import { useStageBarVisible } from "../../useStageBarVisible";
import type { Display, Session } from "../../types";
import { asPlayers, neighbour, showEveryone, showHeadshot } from "./data";

/** Main screen: one contestant's headshot in a gold frame, or everyone's on one screen (as Photos). */
export function Stage({ code, session, display, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const controls = viewOnly ? null : <StageControls code={code} session={session} display={display} />;
  const contestants = session.scoreboard?.contestants ?? {};
  const id = display.contestant;

  if (display.step === "grid" || !id || !contestants[id]?.photo) {
    return <Review players={asPlayers(session)} photosOf={(c) => [contestants[c]?.photo]} labels={["headshot"]}>{controls}</Review>;
  }

  const { name, photo } = contestants[id]!;
  return (
    <main className="stage">
      <Framed key={id}>
        {(setRatio) => (
          <SafeImg src={photo ?? ""} alt={`${name} headshot`}
            onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
            onFail={() => setRatio(4 / 3)} />
        )}
      </Framed>
      <div className="stage-label"><span>headshot</span> · {name}</div>
      {controls}
    </main>
  );
}

/**
 * Backup controls for the main screen (as Photos'). Keys:
 *   ← → = previous / next headshot     Esc or Backspace = lower the curtain
 */
function StageControls({ code, session, display }: { code: string; session: Session; display: Display }) {
  const visible = useStageBarVisible();
  const id = display.step === "grid" ? undefined : display.contestant;
  const prev = id ? neighbour(session, id, -1) : undefined;
  const next = id ? neighbour(session, id, 1) : undefined;
  const show = (target: string | undefined) => { if (target) void showHeadshot(code, target); };
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
      {id && (
        <>
          <button disabled={!prev} onClick={() => show(prev)} tabIndex={tab}>Previous</button>
          <button disabled={!next} onClick={() => show(next)} tabIndex={tab}>Next</button>
          <button onClick={() => void showEveryone(code)} tabIndex={tab}>◫ Everyone</button>
        </>
      )}
    </GameBar>
  );
}

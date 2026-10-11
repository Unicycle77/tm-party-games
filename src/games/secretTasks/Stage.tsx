import { useEffect } from "react";
import { setDisplay } from "../../session";
import { useStageBarVisible } from "../../stageBar";
import type { Display, Session } from "../../types";
import { currentOf, revealOf } from "./data";
import { Envelope, Letter } from "./PlayerView";

/**
 * Main screen: "What was [NAME]'s secret?" over a sealed envelope. When the host unseals it the envelope
 * opens and the task is typed out. Between reveals (or before one starts) it's just a sealed envelope.
 */
export function Stage({ code, session, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const reveal = revealOf(session);
  const current = reveal && currentOf(session, reveal);
  return (
    <main className="stage envelopes">
      {reveal && current
        // A new envelope starts sealed, with the new name.
        ? <Opening key={`${reveal.startedAt}-${current.pos}`} name={session.players?.[current.uid]?.name ?? "?"} task={reveal.task} />
        : (
          <>
            <h1 className="box-title">{reveal ? "That's everyone!" : "Secret Tasks"}</h1>
            <Envelope />
          </>
        )}
      {!viewOnly && <StageControls code={code} />}
    </main>
  );
}

function Opening({ name, task }: { name: string; task?: string }) {
  return (
    <>
      <h1 className="box-title">What was {name}'s secret?</h1>
      <div className="env-stack">
        <Envelope open={task !== undefined} />
        {task !== undefined && <Letter task={task} big />}
      </div>
    </>
  );
}

/** Backup controls for the main screen (the host phone does the same). Keys: Esc or Backspace = back to the curtain. */
function StageControls({ code }: { code: string }) {
  const visible = useStageBarVisible();
  const back = () => void setDisplay(code, { step: "list" });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "Escape" && e.key !== "Backspace")) return;
      e.preventDefault();
      back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className={visible ? "stage-controls show" : "stage-controls"} aria-hidden={!visible}>
      <button onClick={back} tabIndex={visible ? 0 : -1}>← Players</button>
    </div>
  );
}

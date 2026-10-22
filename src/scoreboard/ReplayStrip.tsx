import { startSting } from "./data";
import { endSting as end } from "../session";
import { transitionLine } from "./TransitionField";
import type { ScoreboardTask, Session } from "../types";

/**
 * A task's transition on its page, always there, played or not: the song strip's shape. One tap plays it again on the big screen
 * (a transition that went wrong, or that the host wants a second time), pressed in while it's on, and tapping then ends it. Disabled, with
 * the reason, while the main screen's music folder isn't open or none of its files are in the folder any more.
 */
export function ReplayStrip({ code, session, id, task }: { code: string; session: Session; id: string; task: ScoreboardTask }) {
  const info = transitionLine(session, task);
  if (!info) return null;
  const on = session.sting?.task === id;
  const play = () => void startSting(code, id, session.jukebox?.state?.playing === true);
  return (
    <button className={`sb-song${on ? " pressed-in" : ""}`} disabled={!!info.problem} onClick={on ? () => void end(code) : play}
      aria-label={on ? "End the transition" : "Play the transition again"}>
      <span className="title">{on ? "⏹ " : ""}{info.line}</span>
      <span className="dur">{info.problem ? "" : on ? "" : "▶"}</span>
    </button>
  );
}

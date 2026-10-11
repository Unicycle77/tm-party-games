import type { Display, Session } from "../../types";
import { currentOf, endReveal, nextEnvelope, revealOf, startReveal, unseal, useSecretTasks } from "./data";

/**
 * The host's phone while Secret Tasks is the game: start the reveal, then for each player (in random
 * order) unseal their envelope on the big screen and move on. The pile of tasks is in the ✉ tab.
 */
export function HostLobby({ code, session }: { code: string; session: Session; display: Display }) {
  const tasks = useSecretTasks(code);
  const reveal = revealOf(session);
  const nameOf = (uid: string) => session.players?.[uid]?.name ?? "?";

  if (!reveal) {
    const dealt = Object.keys(session.players ?? {}).filter((uid) => tasks?.assigned?.[uid]).length;
    return (
      <div className="box-setup">
        <p className="muted small">Everyone's secret task is in their envelope on their phone. Add tasks in the ✉ tab at the top.</p>
        <button className="big" disabled={dealt === 0} onClick={() => void startReveal(code, session, tasks)}>
          {dealt === 0 ? "No one has a task yet" : `What was everyone's secret? (${dealt})`}
        </button>
      </div>
    );
  }

  const current = currentOf(session, reveal);
  if (!current) {
    return (
      <div className="box-setup">
        <h3>That's everyone.</h3>
        <button className="lower" onClick={() => void endReveal(code)}>Lower the curtain</button>
      </div>
    );
  }
  const task = tasks?.assigned?.[current.uid];
  const sealed = reveal.task === undefined;
  const following = reveal.order.slice(current.pos + 1).filter((uid) => session.players?.[uid]);
  const nextUid = following[0];

  return (
    <div className="box-setup">
      <h3>What was {nameOf(current.uid)}'s secret?</h3>
      <p className="muted small">{following.length} more after this.</p>
      <button className="big" disabled={!sealed || !task} onClick={() => task && void unseal(code, current.uid, task)}>
        {sealed ? "Unseal the envelope" : "✓ Unsealed"}
      </button>
      {nextUid
        ? <button disabled={sealed} onClick={() => void nextEnvelope(code, current.pos + 1)}>Next: {nameOf(nextUid)} →</button>
        : <button disabled={sealed} onClick={() => void nextEnvelope(code, current.pos + 1)}>That's everyone</button>}
      <button className="lower" onClick={() => { if (!sealed || confirm("End the reveal? The envelopes you haven't opened stay secret.")) void endReveal(code); }}>
        Lower the curtain
      </button>
    </div>
  );
}

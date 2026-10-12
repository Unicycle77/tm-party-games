import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import { headshots, showEveryone, showHeadshot, shownOf } from "./data";

/** Unused: a headshot on screen is handled in HostLobby, since contestants aren't players. */
export function HostPlayer(_: { code: string; session: Session; display: Display; uid: string }) {
  return null;
}

/**
 * The host's phone: Photos' running order, over the scoreboard's headshots instead of submissions.
 * Contestants without a headshot are listed, greyed, so a missing one is noticed.
 */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const ready = headshots(session);
  const shown = shownOf(session);
  const all = Object.entries(session.scoreboard?.contestants ?? {}).sort(([, a], [, b]) => a.order - b.order);
  const up = display.step === "photo" ? display.contestant : undefined;
  const current = up ? session.scoreboard?.contestants?.[up] : undefined;

  if (up && current) {
    const place = ready.findIndex(([id]) => id === up) + 1;
    return (
      <>
        <h2 className="contestant">{current.name}{place > 0 && <span className="muted">, {place} of {ready.length}</span>}</h2>
        <button className="lower" onClick={() => void setDisplay(code, { step: "curtain" })}>Lower the curtain</button>
      </>
    );
  }

  const next = ready.find(([id]) => !shown[id]);
  const shownCount = ready.filter(([id]) => shown[id]).length;
  return (
    <>
      <button className="big" disabled={!next} onClick={() => next && void showHeadshot(code, next[0])}>
        {next ? `${shownCount === 0 ? "First up" : "Next"}: ${next[1].name} →`
          : ready.length === 0 ? "No headshots yet" : "Everyone has been shown"}
      </button>
      {all.length === 0 && <p className="muted">No contestants on the scoreboard yet.</p>}
      <ul className="picker running">
        {all.map(([id, c]) => (
          <li key={id} className={shown[id] ? "shown" : next?.[0] === id ? "next" : ""}>
            <button disabled={!c.photo} onClick={() => void showHeadshot(code, id)}>
              <span>{c.name}</span>
              <span className="muted small">{!c.photo ? "no headshot" : shown[id] ? "shown" : ""}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="steps">
        <button className={display.step === "grid" ? "step active" : "step"} disabled={ready.length === 0}
          onClick={() => void (display.step === "grid" ? setDisplay(code, { step: "curtain" }) : showEveryone(code))}>
          {display.step === "grid" ? "✕ Close" : "◫ Show everyone"}
        </button>
      </div>
    </>
  );
}

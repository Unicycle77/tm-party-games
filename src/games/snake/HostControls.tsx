import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import { FlipClock } from "../../clock/FlipClock";
import { enterPoints } from "../../scoreboard/data";
import { useServerNow, useServerOffset } from "../noisemaster/data";
import { closed, endNow, inchesText, lengthOf, running, sentCount, sheetsText, startClock, started, useRemaining } from "./data";
import { longestFirst, standingsOf } from "./standings";

/** No one-at-a-time look: the race is the whole reveal. */
export function HostPlayer() { return null; }
export function HostLobby() { return null; }

/** Host: puts every measure on the task's Points (so 5 and 0 are already there), and starts the race on the TV. */
function unroll(code: string, session: Session, offset: number) {
  const board = session.scoreboard;
  const entry = Object.entries(board?.tasks ?? {}).find(([, t]) => t.game === "snake");
  if (entry) {
    const [id] = entry;
    const results: Record<string, number> = {}, sheets: Record<string, number> = {};
    for (const r of standingsOf(session)) {
      if (!r.contestant) continue;
      const m = lengthOf(session, r.uid);
      results[r.contestant] = m.inches;
      sheets[r.contestant] = m.sheets;
    }
    if (Object.keys(results).length) void enterPoints(code, board, session.display?.step === "scoreboard", id, { results, sheets });
  }
  return setDisplay(code, { step: "snakes", revealAt: Date.now() + offset });
}

/**
 * The round, where the gold "next thing" sits on the task page. Before and during: the clock, "Your time starts now" and
 * "End now". After: one gold button that changes with the moment ("▶ Unroll the snakes", then "Show the lengths", pressed
 * in while they're up), and the lengths to read out, longest first, each filling in as that roll stops on the TV.
 */
export function Round({ code, session }: { code: string; session: Session }) {
  const offset = useServerOffset();
  const remaining = useRemaining(session);
  const display = session.display ?? { step: "list" as const };
  const racing = display.step === "snakes" && display.revealAt !== undefined;
  const now = useServerNow(racing);

  if (!closed(session)) {
    const live = running(session);
    const players = Object.keys(session.players ?? {}).length;
    return (
      <div className="fc-round">
        <FlipClock ms={remaining} width="215px" />
        {live ? (
          <div className="row fc-round-links">
            <button className="link" onClick={() => {
              const drawing = players - sentCount(session);
              if (confirm(`Tear everyone's roll now?${drawing ? ` ${drawing} ${drawing === 1 ? "is" : "are"} still drawing.` : ""}`)) void endNow(code, offset);
            }}>End now: tear everyone's</button>
          </div>
        ) : <button className="big" disabled={started(session)} onClick={() => void startClock(code, session, offset)}>Your time starts now</button>}
      </div>
    );
  }

  const rows = standingsOf(session);
  const since = racing ? now - display.revealAt! : -1;
  const stopped = (at: number) => racing && since >= at;
  const allStopped = racing && rows.every((r) => stopped(r.stopsAt));
  const ranked = longestFirst(rows.filter((r) => !r.dq));
  const rankOf = (uid: string) => ranked.findIndex((r) => r.uid === uid);
  const two = ranked.length <= 2;
  const go = (d: Display) => void setDisplay(code, d);
  const withoutCircle = ({ circle: _, ...d }: Display) => d;
  const withoutNumbers = ({ numbers: _, ...d }: Display) => d;
  return (
    <div className="snake-round">
      {!racing ? <button className="big" disabled={!rows.length} onClick={() => void unroll(code, session, offset)}>▶ Unroll the snakes</button>
        : <button className={display.numbers ? "big pressed" : "big"} aria-pressed={!!display.numbers} disabled={!allStopped}
            onClick={() => go(display.numbers ? withoutNumbers(display) : { ...display, numbers: true })}>Show the lengths</button>}
      {racing && (
        <ul className="ranked-list">
          {longestFirst(rows).flatMap((r) => {
            const done = stopped(r.stopsAt);
            const at = rankOf(r.uid);
            const outcome = r.dq ? "DQ" : `${at === 0 ? "longest · " : at === 1 && !two ? "2nd longest · " : ""}${r.won ? 5 : 0}`;
            const circled = display.circle === r.uid;
            const thin = done && (r.thinAll || r.thin > 0);
            return [
              <li key={r.uid} className={done ? undefined : "waiting"}>
                <span className="who">
                  {r.name}
                  {done && r.torn && <span className="sub">✂ Torn piece not counted</span>}
                  {done && r.shapes > 1 && <span className="sub">{r.shapes} shapes: measured the longest</span>}
                  {thin && <span className="sub warn">{r.thinAll ? "Under ½ inch wide all along" : `Under ½ inch wide in ${r.thin} ${r.thin === 1 ? "spot" : "spots"}`}</span>}
                </span>
                <span className="len">
                  <b>{done ? `${inchesText(r.inches)} · ${sheetsText(r.sheets)}` : "unrolling…"}</b>
                  {done && <span className={r.won ? "rank win" : "rank"}>{outcome}</span>}
                </span>
              </li>,
              ...(thin ? [
                <li key={`${r.uid}-thin`} className="chip-row">
                  <button className={circled ? "line-chip-button pressed-in" : "line-chip-button"} aria-pressed={circled}
                    onClick={() => go(circled ? withoutCircle(display) : { ...display, circle: r.uid })}>
                    ◯ Circle {r.name}'s {r.thinAll ? "snake" : r.thin === 1 ? "thin spot" : "thin spots"} on the TV
                  </button>
                </li>,
              ] : []),
            ];
          })}
        </ul>
      )}
    </div>
  );
}

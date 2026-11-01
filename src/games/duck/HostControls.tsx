import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import { FlipClock } from "../../clock/FlipClock";
import { enterPoints } from "../../scoreboard/data";
import { useServerNow, useServerOffset } from "../noisemaster/data";
import { closed, endNow, running, sentCount, sizeOf, slideAt, startClock, started, useRemaining } from "./data";
import { duckStandings } from "./standings";

/** No one-at-a-time look: the line-up is the whole reveal. */
export function HostPlayer() { return null; }
export function HostLobby() { return null; }

/** Host: puts every size on the task's Points (so 5 and 0 are already there), and hangs the ducks on the TV. */
function lineUp(code: string, session: Session, offset: number) {
  const board = session.scoreboard;
  const entry = Object.entries(board?.tasks ?? {}).find(([, t]) => t.game === "duck");
  if (entry) {
    const results: Record<string, number> = {};
    for (const r of duckStandings(session).rows) if (r.contestant) results[r.contestant] = sizeOf(session, r.uid).sqIn;
    if (Object.keys(results).length) void enterPoints(code, board, session.display?.step === "scoreboard", entry[0], { results });
  }
  return setDisplay(code, { step: "ducks", revealAt: Date.now() + offset, out: 0 });
}

/**
 * The round, where the gold "next thing" sits on the task page. Before and during: the clock, "Your time starts now" and
 * "End now". After: one gold button that changes with the moment: "▶ Line up the ducks", then a knock-out per tap ("Out:
 * the smallest and the biggest", and with an even number "Out: the one further from the average"), then "Show the sizes",
 * pressed in while they're up. Under it the sizes to read out, smallest first (the TV's order), the median marked.
 */
export function Round({ code, session }: { code: string; session: Session }) {
  const offset = useServerOffset();
  const remaining = useRemaining(session);
  const display = session.display ?? { step: "list" as const };
  const up = display.step === "ducks" && display.revealAt !== undefined;
  const now = useServerNow(up);

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
              if (confirm(`Send everyone's ducks now?${drawing ? ` ${drawing} ${drawing === 1 ? "is" : "are"} still drawing.` : ""}`)) void endNow(code, offset);
            }}>End now: send everyone's</button>
          </div>
        ) : <button className="big" disabled={started(session)} onClick={() => void startClock(code, session, offset)}>Your time starts now</button>}
      </div>
    );
  }

  const { rows, lineUp: order, steps } = duckStandings(session);
  const out = display.out ?? 0;
  const slid = up && now - display.revealAt! >= slideAt(rows.length);
  const go = (d: Display) => void setDisplay(code, d);
  const withoutNumbers = ({ numbers: _, ...d }: Display) => d;
  const byOrder = [...order.map((uid) => rows.find((r) => r.uid === uid)!), ...rows.filter((r) => r.dq)];
  return (
    <div className="snake-round">
      {!up ? <button className="big" disabled={!rows.length} onClick={() => void lineUp(code, session, offset)}>▶ Line up the ducks</button>
        : out < steps.length ? <button className="big" disabled={!slid} onClick={() => go({ ...display, out: out + 1 })}>{steps[out]!.label}</button>
        : <button className={display.numbers ? "big pressed" : "big"} aria-pressed={!!display.numbers}
            onClick={() => go(display.numbers ? withoutNumbers(display) : { ...display, numbers: true })}>Show the sizes</button>}
      {up && (
        <ul className="ranked-list">
          {byOrder.map((r) => (
            <li key={r.uid}>
              <span className="who">
                {r.name}
                {r.sqIn === 0 && r.shapes === 0 && <span className="sub">Blank page</span>}
                {r.shapes > 1 && <span className="sub">{r.shapes} shapes: measured the largest</span>}
              </span>
              <span className="len">
                <b>{r.sqIn} sq in</b>
                <span className={r.won ? "rank win" : "rank"}>{r.dq ? "DQ" : r.won ? "median · 5" : "0"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

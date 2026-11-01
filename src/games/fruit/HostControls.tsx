import { useState } from "react";
import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import { FlipClock } from "../../clock/FlipClock";
import { list } from "../../scoreboard/tasks";
import { useServerNow, useServerOffset } from "../noisemaster/data";
import { Answer } from "./PlayerView";
import {
  answer, answerOf, ask, closed, dataOf, elapsed, endNow, endOne, fruitStatus, hold, inOrder, limitOf, running, shortest, startClock,
  started, tell, timeText, timeUp,
} from "./data";

/** No controls while one picture is up: "Lower the curtain" (below) leads back to the running order and its "Next". */
export function HostPlayer() { return null; }

/** Everyone's picture on one screen, once every time is up (the flipchart's "◫ Show everyone"). */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const everyone = display.step === "selfies";
  return (
    <div className="steps">
      <button className={everyone ? "step active" : "step"}
        disabled={!closed(session) || !Object.keys(session.players ?? {}).some((uid) => fruitStatus(session, uid) === "submitted")}
        onClick={() => void setDisplay(code, everyone ? { step: "list" } : { step: "selfies" })}>
        {everyone ? "✕ Close" : "◫ Show everyone"}
      </button>
    </div>
  );
}

/** A confirm inside the page (the flipchart's): the question, a paper way back and the gold way on. */
function Confirm({ question, rest, no, yes, onNo, onYes }: { question: string; rest: string; no: string; yes: string; onNo: () => void; onYes: () => void }) {
  return (
    <div className="fc-confirm">
      <p><b>{question}</b> {rest}</p>
      <div className="row">
        <button onClick={onNo}>{no}</button>
        <button className="big" onClick={onYes}>{yes}</button>
      </div>
    </div>
  );
}

/**
 * The task page until every time is up, holding its own list (shortest time first, as on the TV). Before: gold "Show part
 * 1", then who's answered and gold "Show part 2", then everyone's time and gold "Your time starts now" (asking first when
 * someone hasn't answered: they'd get the shortest time). While they draw: the clock counting up with ⏸, each name stamped as
 * its time passes, the next to go outlined in gold, a name tapped to end that guest's time, and "End it now" for everyone left.
 * After: nothing (the running order has the gold).
 */
export function Round({ code, session }: { code: string; session: Session }) {
  const offset = useServerOffset();
  const data = dataOf(session);
  const go = running(session);
  const now = useServerNow(go && data.heldAt === undefined);
  const [typing, setTyping] = useState<string>();
  const [asking, setAsking] = useState<"start" | "all" | string>();
  if (closed(session)) return null;
  const players = session.players ?? {};
  const order = inOrder(session).filter((uid) => players[uid]);
  const nameOf = (uid: string) => players[uid]?.name ?? "";

  if (!data.asked) {
    return (
      <div className="fruit-round">
        <p className="muted small">Part 1 asks everyone how long it takes them to eat an orange, on their phones, before anyone knows why.</p>
        <button className="big" onClick={() => void ask(code)}>Show part 1: the question</button>
      </div>
    );
  }

  if (!data.told && !started(session)) {
    const joined = Object.entries(players).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
    const answered = joined.filter(([uid]) => answerOf(session, uid) !== undefined).length;
    return (
      <div className="fruit-round">
        <button className={answered === joined.length && joined.length ? "big" : undefined} onClick={() => void tell(code)}>Show part 2: the task</button>
        <p className="muted small">{answered} of {joined.length} answered. Their times stay hidden until part 2.</p>
        <ul className="picker running">
          {joined.map(([uid, p]) => (
            <li key={uid}><button disabled>
              <span>{p.name}</span>
              {answerOf(session, uid) !== undefined ? <span className="stamp">✓ Submitted</span> : <span className="muted small">waiting</span>}
            </button></li>
          ))}
        </ul>
      </div>
    );
  }

  if (!started(session)) {
    const missing = order.filter((uid) => answerOf(session, uid) === undefined);
    const fallback = shortest(session);
    const start = () => { setAsking(undefined); void startClock(code, session, offset); };
    return (
      <div className="fruit-round">
        <ul className="picker running">
          {order.map((uid) => {
            const mine = answerOf(session, uid);
            return (
              <li key={uid} className={typing === uid ? "up stacked" : "stacked"}>
                <button aria-pressed={typing === uid} onClick={() => mine === undefined && setTyping(typing === uid ? undefined : uid)}>
                  <span>{nameOf(uid)}</span>
                  <span className="muted small">{mine !== undefined ? timeText(mine) : "no answer · tap to type one"}</span>
                </button>
                {typing === uid && (
                  <div className="turn">
                    <Answer label={`${nameOf(uid)}'s answer, said out loud`} button={`Save ${nameOf(uid)}'s time`}
                      onSend={(ms) => { setTyping(undefined); void answer(code, uid, ms); }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {asking === "start" && missing.length ? (
          <Confirm question={`${list(missing.map(nameOf))} ${missing.length === 1 ? "hasn't" : "haven't"} answered.`}
            rest={fallback !== undefined ? `Start now and ${missing.length === 1 ? nameOf(missing[0]!) : "they"} ${missing.length === 1 ? "gets" : "get"} the shortest time: ${timeText(fallback)}.` : "Nobody has, so there's no time to give them."}
            no="Wait" yes="Start anyway" onNo={() => setAsking(undefined)} onYes={start} />
        ) : (
          <button className="big" disabled={fallback === undefined} onClick={() => missing.length ? setAsking("start") : start()}>Your time starts now</button>
        )}
      </div>
    );
  }

  // While they draw.
  const still = order.filter((uid) => !timeUp(session, uid, now));
  const nextTime = still.length ? limitOf(session, still[0]!) : undefined;
  const next = new Set(still.filter((uid) => limitOf(session, uid) === nextTime));
  const held = data.heldAt !== undefined;
  const one = asking && asking !== "start" && asking !== "all" ? asking : undefined;
  return (
    <div className="fruit-round">
      <div className="row">
        <FlipClock ms={elapsed(session, now)} up width="215px" />
        <button className="clock-hold" aria-label={held ? "Carry on" : "Pause everyone's time"} onClick={() => void hold(code, session, offset)}>{held ? "▶" : "⏸"}</button>
      </div>
      {held && <p className="muted small">Paused: nobody's time is passing. Their pages stay open.</p>}
      <ul className="picker running">
        {order.map((uid) => {
          const up = timeUp(session, uid, now);
          return (
            <li key={uid} className={one === uid ? "up" : next.has(uid) ? "next" : ""}>
              <button disabled={up} aria-pressed={one === uid} onClick={() => setAsking(one === uid ? undefined : uid)}>
                <span>{nameOf(uid)}</span>
                {up ? <span className="stamp">✓ Time's up</span>
                  : <span className="muted small">{timeText(limitOf(session, uid) ?? 0)}{next.has(uid) ? " · next" : ""}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {one ? (
        <Confirm question={`End ${nameOf(one)}'s time?`} rest="The picture goes in as drawn." no="Keep going" yes="Yes, end it"
          onNo={() => setAsking(undefined)} onYes={() => { setAsking(undefined); void endOne(code, session, one, offset); }} />
      ) : asking === "all" ? (
        <Confirm question={`End it for ${list(still.map(nameOf))}?`} rest={still.length === 1 ? "The picture goes in as drawn." : "Their pictures go in as drawn."}
          no="Keep going" yes="Yes, end it" onNo={() => setAsking(undefined)} onYes={() => { setAsking(undefined); void endNow(code, offset); }} />
      ) : still.length > 0 && (
        <>
          <button onClick={() => setAsking("all")}>End it now</button>
          <p className="muted small">Ends {list(still.map(nameOf))}'s time together.</p>
        </>
      )}
    </div>
  );
}

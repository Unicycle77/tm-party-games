import { useEffect } from "react";
import { Framed } from "../../Framed";
import { Review } from "../../Review";
import { TaskCard } from "../../TaskCard";
import type { Display, Session } from "../../types";
import { FlipClock } from "../../clock/FlipClock";
import { SheetStrokes } from "../../drawing/surfaces/Sheet";
import { useServerNow } from "../noisemaster/data";
import { PALETTE, WIDTH, answerOf, closed, dataOf, elapsed, fruitStatus, inOrder, limitOf, pageOf, running, started, timeText, timeUp, wordsOf } from "./data";

/** A4's shape. */
const RATIO = 1 / 1.414;

/**
 * The middle of the big screen. Before part 1: the task's name. Part 1: its card (the question). Part 2: its card. While they
 * draw: the show's clock counting up (a stopwatch), in the card's place, so the names stay beside it. After: part 2's card
 * with the stamp.
 */
export function Collecting({ session }: { code: string; session: Session; viewOnly: boolean }) {
  const data = dataOf(session);
  const now = useServerNow(running(session) && data.heldAt === undefined);
  const [one, two] = wordsOf(session);
  if (running(session)) return <FlipClock ms={elapsed(session, now)} up width="min(56vw, 88vh)" className="tv" />;
  if (data.told || closed(session)) {
    return <TaskCard lines={["", two]}>{closed(session) && <span className="stamp all-in">✓ All submitted</span>}</TaskCard>;
  }
  if (data.asked) return <TaskCard lines={["", one]} />;
  return <h1 className="collecting-title">Fruit selfie</h1>;
}

/**
 * The names on the right. Part 1: who has answered, stamped, never the times (nobody copies). From part 2: "Time to eat an
 * orange", each name with their time, shortest first ("?" for no answer yet); as the clock passes a time, "✓ Time's up" takes its place.
 */
export function Side({ session }: { code: string; session: Session; viewOnly: boolean }) {
  const data = dataOf(session);
  const now = useServerNow(running(session) && data.heldAt === undefined);
  const players = session.players ?? {};
  if (!data.told && !started(session)) {
    const joined = Object.entries(players).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
    const answered = joined.filter(([uid]) => answerOf(session, uid) !== undefined).length;
    return (
      <>
        <h2>{data.asked ? `${answered} of ${joined.length} submitted` : `${joined.length} contestants`}</h2>
        <ul className="tiles">
          {joined.map(([uid, p]) => (
            <li key={uid}>
              <button className="tile static" tabIndex={-1} disabled={data.asked && answerOf(session, uid) === undefined}>
                <span className="name">{p.name}</span>
                {data.asked && (answerOf(session, uid) !== undefined ? <span className="stamp">✓ Submitted</span> : <span className="status">… waiting</span>)}
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <>
      <h2>Time to eat an orange</h2>
      <ul className="tiles">
        {inOrder(session).filter((uid) => players[uid]).map((uid) => {
          const limit = limitOf(session, uid);
          return (
            <li key={uid}>
              <button className="tile static" tabIndex={-1}>
                <span className="name">{players[uid]!.name}</span>
                {started(session) && timeUp(session, uid, now) ? <span className="stamp">✓ Time's up</span>
                  : <span className="time">{answerOf(session, uid) !== undefined ? timeText(answerOf(session, uid)!) : started(session) && limit !== undefined ? timeText(limit) : "?"}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** "Greg · 0:45": a picture's label, the name then the time. */
const labelOf = (session: Session, uid: string) => {
  const t = limitOf(session, uid);
  return `${session.players?.[uid]?.name ?? ""}${t !== undefined ? ` · ${timeText(t)}` : ""}`;
};

/** One guest's picture in the gold frame, labelled with their name and time, or everyone's, shortest time first. */
export function Stage({ session, display }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  if (display.step === "selfies" || !display.uid) {
    return (
      <Review players={session.players ?? {}} photosOf={() => []} labels={["picture"]} order={inOrder(session)} nameOf={(uid) => labelOf(session, uid)}
        art={{ ratio: RATIO, slot: [2.4, 3.4], has: (uid) => fruitStatus(session, uid) === "submitted" && !!session.players?.[uid], render: (uid) => <Paper session={session} uid={uid} /> }} />
    );
  }
  const uid = display.uid;
  const t = limitOf(session, uid);
  return (
    <main className="stage">
      <Framed key={uid}>{(setRatio) => <Fit setRatio={setRatio}><Paper session={session} uid={uid} /></Fit>}</Framed>
      <div className="stage-label"><span>{session.players?.[uid]?.name ?? ""}</span>{t !== undefined && ` · ${timeText(t)}`}</div>
    </main>
  );
}

function Paper({ session, uid }: { session: Session; uid: string }) {
  return <div className="fruit-paper"><SheetStrokes strokes={pageOf(session, uid)} palette={PALETTE} width={WIDTH} /></div>;
}

/** Tells the frame the page's shape, so it's as big as the screen allows. */
function Fit({ setRatio, children }: { setRatio: (r: number) => void; children: React.ReactNode }) {
  useEffect(() => setRatio(RATIO), [setRatio]);
  return <>{children}</>;
}

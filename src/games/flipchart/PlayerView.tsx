import { ref, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { GuestCard, Quote, Status, afterwards, useGuest } from "../../guest";
import { store } from "../../session";
import type { Session } from "../../types";
import { closed, dataOf, drawOf, flipchartTask, started, useRemaining } from "./data";
import { PageSvg } from "./Portrait";
import { MARKERS } from "../../drawing/palettes";
import { Pens } from "../../drawing/Pens";
import { encodePage, type Stroke } from "../../drawing/strokes";
import { boxAt, usePen } from "../../drawing/usePen";
import { PAGES, PAGE_H, PAGE_W, PATTERN, UPSIDE_DOWN, pageKey, pagesOf } from "./strokes";

const SHEET_KEY = "ba.flipchart.page";
const path = (code: string) => `sessions/${code}/games/flipchart`;

/**
 * The guest's flipchart. Before the host starts the clock they have the task's words and the front page (the pattern the
 * pages will be laid out in), and can't turn it over. Then the clock runs: 16 pages, one at a time, turned with ← and →,
 * and never a page number. Send is only on the last page, and asks first. When the time is up, whatever is drawn goes in
 * on its own. Once sent the card stays as the receipt until the host starts the next task.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const data = dataOf(session);
  const { task, left } = useGuest();
  const remaining = useRemaining(session);
  const label = task?.label ?? "Flipchart";
  const draw = drawOf(flipchartTask(session));
  const title = task?.title ?? draw[0]!.toUpperCase() + draw.slice(1);
  const live = started(session) && !closed(session) && remaining > 0;
  const over = started(session) && !live;
  const sent = !!data.submitted?.[uid];
  const again = sent && !!data.unlocked?.[uid] && live;

  if ((sent && !again) || over) return <Receipt code={code} uid={uid} sent={sent} label={label} title={title} left={left} />;
  return (
    <>
      <Status>{live ? "It's task time." : "Your time starts when the host says."}</Status>
      <GuestCard label={label} title={title}>
        <Flipchart key={again ? "again" : "first"} code={code} uid={uid} session={session} live={live} words={task?.text} again={again} />
      </GuestCard>
    </>
  );
}

/** The front page: the pattern the pages will be laid out in, with 3, 9, 10 and 16 printed upside down, as on the show. */
function FrontPage() {
  return (
    <div className="fc-grid">
      {PATTERN.flatMap((row) => row.map((n) => <span key={n} className={UPSIDE_DOWN.has(n) ? "turned" : undefined}>{n}</span>))}
    </div>
  );
}

/** A flipchart: its binding and one page of paper. */
function Paper({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return (
    <div className={small ? "flipchart small" : "flipchart"}>
      <div className="bar" />
      <div className="page">{children}</div>
    </div>
  );
}

function Flipchart({ code, uid, session, live, words, again }: { code: string; uid: string; session: Session; live: boolean; words?: string; again: boolean }) {
  const [pages, setPages] = useState(() => pagesOf(session, uid));
  // 0 is the front page, 1 to 16 the pages in order. A reloaded phone is back on the page it was on.
  const [sheet, setSheet] = useState(() => (live ? Math.min(PAGES, Math.max(0, Number(store.get(`${SHEET_KEY}.${code}`)) || 0)) : 0));
  const [marker, setMarker] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const dirty = useRef(new Set<number>());
  const timer = useRef<number>();
  const latest = useRef(pages);
  latest.current = pages;

  // Pages are saved a moment after each stroke, and when turned, so a reloaded or swapped phone has them all.
  const flush = (extra: Record<string, unknown> = {}) => {
    window.clearTimeout(timer.current);
    const patch: Record<string, unknown> = { ...extra };
    for (const n of dirty.current) patch[`pages/${uid}/${pageKey(n)}`] = encodePage(latest.current[n - 1] ?? []) || null;
    dirty.current.clear();
    if (Object.keys(patch).length) update(ref(db(), path(code)), patch).catch(() => { /* the time ran out first: the portrait is what was saved */ });
  };
  const changed = (n: number, next: Stroke[]) => {
    latest.current = latest.current.map((p, i) => (i === n - 1 ? next : p));
    setPages(latest.current);
    dirty.current.add(n);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => flush(), 350);
  };
  useEffect(() => () => flush(), []);
  useEffect(() => { if (live) store.set(`${SHEET_KEY}.${code}`, String(sheet)); }, [live, sheet]);

  const pen = usePen({
    live: live && sheet > 0, marker, at: (e) => boxAt(surface.current, PAGE_W, PAGE_H)(e),
    onStroke: (st) => changed(sheet, [...latest.current[sheet - 1]!, st]),
  });
  const turn = (by: 1 | -1) => { flush(); pen.cancel(); setConfirming(false); setSheet((s) => s + by); };
  const undo = () => changed(sheet, latest.current[sheet - 1]!.slice(0, -1));
  const send = () => { flush({ [`submitted/${uid}`]: true, [`unlocked/${uid}`]: null }); };

  const page = pages[sheet - 1] ?? [];
  return (
    <>
      {sheet === 0 && words && <Quote text={words} />}
      <Paper>
        {sheet === 0 ? <FrontPage /> : (
          <div ref={surface} className="fc-surface" {...pen.handlers}>
            <PageSvg strokes={page} draft={pen.draft} />
          </div>
        )}
      </Paper>
      {live && sheet > 0 && <Pens palette={MARKERS} marker={marker} onMarker={setMarker} canUndo={page.length > 0} onUndo={undo} />}
      <div className="fc-flips">
        <button disabled={!live || sheet === 0} aria-label="Previous page" onClick={() => turn(-1)}>←</button>
        <span />
        <button disabled={!live || sheet === PAGES} aria-label="Next page" onClick={() => turn(1)}>→</button>
      </div>
      {again && sheet === 0 && <p className="slot-hint">🔓 The host has let you send again.</p>}
      {live && sheet === PAGES && (confirming ? (
        <div className="fc-confirm">
          <p><b>Send your portrait?</b> You can't change it after.</p>
          <div className="row">
            <button onClick={() => setConfirming(false)}>Keep drawing</button>
            <button className="big" onClick={send}>Yes, send it</button>
          </div>
        </div>
      ) : <button className="big" onClick={() => setConfirming(true)}>Send my portrait</button>)}
    </>
  );
}

/** Sent, or the time ran out (which sends whatever is drawn): the card stays, with the front page closed and the stamp. */
function Receipt({ code, uid, sent, label, title, left }: { code: string; uid: string; sent: boolean; label: string; title: string; left: number }) {
  const timesUp = useRef(!sent).current;
  useEffect(() => {
    if (!sent) update(ref(db(), path(code)), { [`submitted/${uid}`]: true }).catch(() => { /* already final: the round is closed */ });
  }, [sent]);
  return (
    <>
      <Status>{afterwards(timesUp ? "Time's up. Portrait sent." : "Portrait sent.", left)}</Status>
      <GuestCard label={label} title={title}>
        <Paper small><FrontPage /></Paper>
        <span className="stamp">✓ Submitted</span>
        <p className="slot-hint">🔒 Your portrait is locked in. You'll see it on the big screen.</p>
      </GuestCard>
    </>
  );
}

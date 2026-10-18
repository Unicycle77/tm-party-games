import { useEffect, useMemo, useState } from "react";
import { showConversion } from "../session";
import type { Scoreboard, Session } from "../types";
import { matchFor, rank, say, toAnchor, working, type Match } from "./convert";

/**
 * "📏 Read it out", on a measured task's points page: pick a contestant (the one whose number was typed last is
 * already picked), get the useless unit closest to their result, and put it on the big screen. "Surprise me again"
 * steps down the ranking; while it's up, picking another contestant swaps the big screen to theirs.
 */
export function ReadOut({ code, session, board, id, last }: { code: string; session: Session; board: Scoreboard | undefined; id: string; last?: string }) {
  const task = board?.tasks?.[id];
  const unit = task?.unit;
  const measured = Object.entries(board?.contestants ?? {})
    .sort(([, a], [, b]) => a.order - b.order)
    .filter(([c]) => task?.results?.[c] !== undefined && !task.dq?.[c]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string>();
  const who = picked && measured.some(([c]) => c === picked) ? picked : last && measured.some(([c]) => c === last) ? last : measured.at(-1)?.[0];
  const result = who ? task?.results?.[who] : undefined;
  const amount = result ?? NaN;
  const anchor = unit ? toAnchor(amount * unit.amount, unit.unit) : NaN;
  const ready = !!unit && amount > 0 && isFinite(anchor);
  const ranked = useMemo(() => (ready ? rank(unit!.kind, anchor) : []), [unit?.kind, anchor, ready]);
  const [at, setAt] = useState(0);
  const [other, setOther] = useState<Match>();
  useEffect(() => { setAt(0); setOther(undefined); }, [who, anchor]);
  const match = other ?? ranked[at];
  const said = match && unit && say(unit.kind, amount, unit.name, match);
  const onScreen = !!session.conversion;
  // While it's on the big screen, the big screen follows the host's pick.
  useEffect(() => {
    if (onScreen && said && (said.main !== session.conversion?.main || said.lead !== session.conversion?.lead)) void showConversion(code, said);
  }, [onScreen, said?.lead, said?.main]);
  if (!unit || !measured.length) return null;
  if (!open && !onScreen) return <button className="link read-out-open" onClick={() => setOpen(true)}>📏 Read it out</button>;

  const nameOf = (c: string) => board?.contestants?.[c]?.name ?? "";
  return (
    <section className="read-out">
      <h3>📏 Read it out</h3>
      <div className="choices marks read-out-who">
        {measured.map(([c, con]) => (
          <button key={c} aria-pressed={who === c} onClick={() => setPicked(c)}>{con.name}</button>
        ))}
      </div>
      {said && match && who && (
        <div className="slot conversion">
          <p className="lead">{said.lead}</p>
          <p className="main">{said.main}</p>
          <p className="lead">{said.how}</p>
          <p className="small">{working(unit.kind, anchor, `${result} ${unit.name}`, match)}</p>
          <button className="link" onClick={() => { setOther(undefined); setAt((a) => (a + 1) % ranked.length); }}>Surprise me again</button>
        </div>
      )}
      <button className={onScreen ? "pressed-in" : undefined} disabled={!said && !onScreen} aria-pressed={onScreen}
        onClick={() => void showConversion(code, onScreen ? null : said ?? null)}>
        {onScreen ? `On the big screen · ${nameOf(who ?? "")}` : "Show on the big screen"}
      </button>
    </section>
  );
}

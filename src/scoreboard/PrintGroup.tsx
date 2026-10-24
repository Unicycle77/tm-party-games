import { useState } from "react";
import { usePileCount } from "../games/secretTasks/TaskPile";
import { Toggle } from "../Toggle";
import type { Session } from "../types";
import type { SecretLayout } from "./taskCardsPdf";
import { sorted, titleOf } from "./tasks";
import { partsOf, tiebreakerWords } from "./TaskText";

/**
 * SKETCH: "Print" on Plan the party, one group for everything printed before the night. A switch per item, in the
 * order the PDF prints them, and one Download PDF for whatever is on.
 */
export function PrintGroup({ code, session }: { code: string; session: Session }) {
  const [sign, setSign] = useState(true);
  const [pages, setPages] = useState(true);
  const [secret, setSecret] = useState(true);
  const [layout, setLayout] = useState<SecretLayout>("cut");
  const pile = usePileCount(code);
  const board = session.scoreboard;
  // Tasks (and the tiebreaker) with any words, not pages: a task in two parts still counts once.
  const worded = [
    ...sorted(board?.tasks).map(([id, t], i) => ({ id, label: `${i + 1} ${titleOf(t)}`, t })),
    ...(board?.tiebreaker ? [{ id: "tiebreaker", label: "Tiebreaker", t: tiebreakerWords(board.tiebreaker) }] : []),
  ].filter(({ t }) => partsOf(t).length);
  const n = worded.length;
  const [left, setLeft] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const picked = n - left.length;
  return (
    <section className="task-cards">
      <div className="summary-line">
        <span>Print</span>
        <button className="link">Download PDF</button>
      </div>
      <p className="muted small">Opens in a new tab: one PDF of what's on, in this order, to print.</p>
      <div className="toggles">
        <Toggle label="Check-in sign" on={sign} onChange={setSign} />
        <Toggle label="Task pages" on={pages} onChange={setPages} />
      </div>
      {pages && !picking && (
        <div className="summary-line">
          <span className="muted small">{left.length ? `${picked} of ${n}` : `All ${n}`} with task text</span>
          <button type="button" className="link" onClick={() => setPicking(true)}>Change</button>
        </div>
      )}
      {pages && picking && (
        <section className="extra-open">
          <span className="muted small">{picked} of {n} with task text</span>
          <div className="choices two marks">
            {worded.map(({ id, label }) => {
              const on = !left.includes(id);
              return <button key={id} type="button" aria-pressed={on} onClick={() => setLeft(on ? [...left, id] : left.filter((x) => x !== id))}>{on ? "✓ " : ""}{label}</button>;
            })}
          </div>
          <div className="row"><button type="button" onClick={() => setPicking(false)}>Done</button></div>
        </section>
      )}
      <div className="toggles">
        <Toggle label={<>Secret tasks<span className="muted small"> · {pile ?? "…"} in the pile</span></>} on={secret} onChange={setSecret} />
      </div>
      {secret && (
        <div className="choices marks" role="radiogroup" aria-label="Secret task sheets">
          <button type="button" role="radio" aria-checked={layout === "cut"} onClick={() => setLayout("cut")}>8 to cut</button>
          <button type="button" role="radio" aria-checked={layout === "fold"} onClick={() => setLayout("fold")}>4 to fold</button>
        </div>
      )}
    </section>
  );
}

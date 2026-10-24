import { useState } from "react";
import { usePileCount } from "../games/secretTasks/TaskPile";
import { Toggle } from "../Toggle";
import type { Session } from "../types";
import type { SecretLayout } from "./taskCardsPdf";
import { pagesOf } from "./TaskCards";

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
  const n = pagesOf(session.scoreboard).length;
  return (
    <section className="task-cards">
      <div className="summary-line">
        <span>Print</span>
        <button className="link">Download PDF</button>
      </div>
      <p className="muted small">Opens in a new tab: one PDF of what's on, in this order, to print.</p>
      <div className="toggles">
        <Toggle label="Check-in sign" on={sign} onChange={setSign} />
        <Toggle label={<>Task pages<span className="muted small"> · all {n}</span></>} on={pages} onChange={setPages} />
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

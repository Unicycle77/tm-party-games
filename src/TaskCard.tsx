import type { ReactNode } from "react";

/**
 * The task card: aged, torn paper in typewriter with the red TM seal; the first line is its label. The big
 * screen shows it while entries come in (`children`: the stamp that lands once everyone is in), and a
 * phone can show it too (`small`).
 */
export function TaskCard({ lines, small = false, children }: { lines: readonly string[]; small?: boolean; children?: ReactNode }) {
  const [label, ...body] = lines;
  return (
    <div className={small ? "task-card small" : "task-card"}>
      <p className="task-label">{label}</p>
      {body.map((line) => <p key={line}>{line}</p>)}
      <span className="wax-seal" aria-hidden="true">TM</span>
      {children}
    </div>
  );
}

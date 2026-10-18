import type { ReactNode } from "react";

/**
 * The task card: aged, torn paper in typewriter with the red TM seal; the first line is its label. The big
 * screen shows it while entries come in (`children`: the stamp that lands once everyone is in), and a
 * phone can show it too (`small`). A task's text has its type centred at the top (`centred`), or no label
 * at all when the first line is empty.
 */
export function TaskCard({ lines, small = false, centred = false, className, children }: {
  lines: readonly string[]; small?: boolean; centred?: boolean; className?: string; children?: ReactNode;
}) {
  const [label, ...body] = lines;
  return (
    <div className={["task-card", small && "small", centred && "centred", className].filter(Boolean).join(" ")}>
      {label && <p className="task-label">{label}</p>}
      {body.map((line, i) => <p key={i}>{line}</p>)}
      <span className="wax-seal" aria-hidden="true">TM</span>
      {children}
    </div>
  );
}

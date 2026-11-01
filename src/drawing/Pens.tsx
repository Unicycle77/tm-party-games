import type { Palette } from "./strokes";

/**
 * The marker row under a surface: a round swatch per marker in the task's palette, the chosen one ringed in gold, and
 * ↶ Undo at the end. Four markers sit in one row; more wrap into rows of five (the duck's ten). No fill tool: these are markers.
 */
export function Pens({ palette, marker, onMarker, canUndo, onUndo }: {
  palette: Palette; marker: number; onMarker: (i: number) => void; canUndo: boolean; onUndo: () => void;
}) {
  const swatches = palette.map((m, i) => (
    <button key={m.name} className={i === marker ? "ink on" : "ink"} style={{ background: m.colour }} aria-label={m.name} aria-pressed={i === marker} onClick={() => onMarker(i)} />
  ));
  return (
    <div className={palette.length > 5 ? "fc-tools rows" : "fc-tools"}>
      {palette.length > 5 ? <div className="swatches">{swatches}</div> : swatches}
      <button className="undo" disabled={!canUndo} onClick={onUndo}>↶ Undo</button>
    </div>
  );
}

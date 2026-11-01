import { useRef } from "react";
import type { Surface } from "../measure";
import type { Palette, Stroke } from "../strokes";
import { StrokesSvg } from "../StrokesSvg";
import { boxAt, usePen } from "../usePen";

/**
 * One sheet, three looks: a flipchart page, plain paper, an acetate. They're the same shape (A1 and A4 share 1 : 1.414), take
 * ink the same way, and are drawn back the same way; only the look and the real size differ. An acetate isn't turned on the
 * phone (the guest draws it upside down); only the projector and the download turn it over. The game places the marker
 * row, the send button and anything else around the sheet.
 */
export type SheetLook = "flipchart" | "paper" | "acetate";

/** A sheet in surface units: 1000 across, A-paper's shape. */
export const SHEET_W = 1000;
export const SHEET_H = 1414;

/** How wide each sheet really is, in inches: a flipchart page is A1, paper and acetate A4. */
const INCHES_ACROSS: Record<SheetLook, number> = { flipchart: 23.39, paper: 8.27, acetate: 8.27 };

/** Surface units to the inch, for measuring a drawing on this sheet. */
export const unitsPerInch = (look: SheetLook) => SHEET_W / INCHES_ACROSS[look];

/** The sheet to measure on. */
export const sheetSurface = (look: SheetLook): Surface & { h: number } => ({ w: SHEET_W, h: SHEET_H, unitsPerInch: unitsPerInch(look) });

/**
 * The sheet's look around what's on it. Flipchart: an off-white page under a grey binding strip. Paper: plain white with a
 * soft shadow. Acetate: clear, with a faint glare and the card's paper showing through. `small` on the receipt.
 */
export function Sheet({ look, small = false, children }: { look: SheetLook; small?: boolean; children?: React.ReactNode }) {
  const size = small ? " small" : "";
  if (look === "flipchart") {
    return (
      <div className={`flipchart${size}`}>
        <div className="bar" />
        <div className="page">{children}</div>
      </div>
    );
  }
  return <div className={`${look}-sheet${size}`}>{children}</div>;
}

/** A sheet's strokes, filling whatever box it's in: on the guest's card, the receipt, the TV and the download's sketches. */
export function SheetStrokes({ strokes, draft, palette }: { strokes: Stroke[]; draft?: Stroke; palette: Palette }) {
  return <StrokesSvg w={SHEET_W} h={SHEET_H} strokes={strokes} draft={draft} palette={palette} />;
}

/**
 * The sheet taking ink: the finger on it, the stroke being drawn, and the strokes so far. `live` false: it shows the ink but
 * takes none (before the clock, after it). Goes inside `Sheet`. To drop a stroke in progress (a page turned under it), give
 * the pad a new `key`.
 */
export function SheetPad({ live, marker, palette, strokes, onStroke }: {
  live: boolean; marker: number; palette: Palette; strokes: Stroke[]; onStroke: (s: Stroke) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const pen = usePen({ live, marker, at: (e) => boxAt(el.current, SHEET_W, SHEET_H)(e), onStroke });
  return (
    <div ref={el} className={live ? "sheet-pad live" : "sheet-pad"} {...pen.handlers}>
      <SheetStrokes strokes={strokes} draft={pen.draft} palette={palette} />
    </div>
  );
}

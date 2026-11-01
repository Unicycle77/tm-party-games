import { useRef, useState } from "react";
import { MIN_STEP, type Stroke } from "./strokes";

/**
 * A finger on a surface, turned into strokes: the point under the finger (in the surface's units, from `at`), a new point
 * every `MIN_STEP`, the stroke so far as `draft`, and the finished stroke handed to `onStroke` when the finger lifts.
 * `live` false: the surface takes no ink (before the clock, after it). Spread `handlers` on the surface's element.
 * One touch at a time: while a stroke is going, any other touch (a cheek or a chin, drawing with a nose) is ignored.
 */
export function usePen({ live, marker, at, onStroke }: {
  live: boolean;
  marker: number;
  /** Where the pointer is, in surface units; undefined for a point the surface won't take. */
  at: (e: React.PointerEvent<HTMLElement>) => [number, number] | undefined;
  onStroke: (s: Stroke) => void;
}) {
  const [draft, setDraft] = useState<Stroke>();
  const drawing = useRef<Stroke>();
  const pointer = useRef<number>();
  const down = (e: React.PointerEvent<HTMLElement>) => {
    if (!live || drawing.current) return;
    const p = at(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = e.pointerId;
    drawing.current = { c: marker, p };
    setDraft(drawing.current);
  };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const s = drawing.current;
    if (!s || e.pointerId !== pointer.current) return;
    const p = at(e);
    if (!p) return;
    const [x, y] = p;
    if (Math.hypot(x - s.p[s.p.length - 2]!, y - s.p[s.p.length - 1]!) < MIN_STEP) return;
    drawing.current = { ...s, p: [...s.p, x, y] };
    setDraft(drawing.current);
  };
  const up = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerId !== pointer.current) return;
    const s = drawing.current;
    drawing.current = undefined;
    pointer.current = undefined;
    setDraft(undefined);
    if (s) onStroke(s);
  };
  /** Drops a stroke in progress (the page turned under it). */
  const cancel = () => { drawing.current = undefined; pointer.current = undefined; setDraft(undefined); };
  return { draft, cancel, handlers: { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up } };
}

/** The usual `at` for a surface filling its element: the pointer in `w` × `h` units, clamped to the edges. */
export function boxAt(el: HTMLElement | null, w: number, h: number) {
  return (e: React.PointerEvent): [number, number] | undefined => {
    if (!el) return undefined;
    const box = el.getBoundingClientRect();
    const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)));
    return [clamp(((e.clientX - box.left) / box.width) * w, w), clamp(((e.clientY - box.top) / box.height) * h, h)];
  };
}

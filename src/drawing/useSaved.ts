import { ref, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import { encodePage, type Stroke } from "./strokes";

/**
 * One surface's strokes, kept on the phone and saved a moment after each change (so a reloaded or swapped phone has
 * them, and whatever's saved at 0:00 is what goes in). `path` is the guest's page in the database, `extra` anything saved
 * beside it (the roll's length out). Writes after the round closed are refused, and that's fine: what was saved stands.
 */
export function useSavedStrokes(code: string, base: string, key: string, initial: Stroke[]) {
  const [strokes, setStrokes] = useState(initial);
  const latest = useRef(strokes);
  latest.current = strokes;
  const dirty = useRef<Record<string, unknown>>({});
  const timer = useRef<number>();

  const flush = () => {
    window.clearTimeout(timer.current);
    const patch = dirty.current;
    if (!Object.keys(patch).length) return;
    dirty.current = {};
    update(ref(db(), base), patch).catch(() => { /* the time ran out first: what was saved stands */ });
  };
  const later = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 350);
  };
  const change = (next: Stroke[]) => {
    latest.current = next;
    setStrokes(next);
    dirty.current[key] = encodePage(next) || null;
    later();
  };
  /** Saves something beside the strokes, with the next save. */
  const keep = (path: string, value: unknown) => { dirty.current[path] = value; later(); };
  useEffect(() => () => flush(), []);
  return { strokes, latest, change, keep, flush };
}

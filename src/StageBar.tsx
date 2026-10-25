import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { StageChips, onScreenLine } from "./HostRemote";
import { endSting, setDisplay } from "./session";
import { stingFiles } from "./sting";
import { useStageBarVisible } from "./useStageBarVisible";
import type { Session } from "./types";

/** Where a game's own backup controls go: after the stage chips, in the one bar. */
const Slot = createContext<HTMLElement | null>(null);

/**
 * The main screen's backup bar, whatever is up: the host phone's stage chips (Task · Scores · Clock · Curtain), then the
 * game's own controls (see `GameBar`). Hidden until the mouse moves, like the cursor. Esc lowers the curtain from anywhere,
 * ending a transition, as the Curtain chip does. Extra screens (`viewOnly`) get neither.
 */
export function StageBar({ code, session, enabled, children }: { code: string; session: Session; enabled: boolean; children: ReactNode }) {
  const visible = useStageBarVisible();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const line = onScreenLine(session);
  const down = line.startsWith("the curtain");
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.metaKey || e.ctrlKey || e.altKey || down) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      void (stingFiles(session) ? endSting(code) : Promise.resolve()).then(() => setDisplay(code, { step: "curtain" }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, down, code, session]);
  return (
    <Slot.Provider value={slot}>
      {children}
      {enabled && (
        <div className={visible ? "stage-controls show" : "stage-controls"} aria-hidden={!visible}>
          <StageChips code={code} session={session} line={line} />
          <span className="game-bar" ref={setSlot} />
        </div>
      )}
    </Slot.Provider>
  );
}

/** A game's own backup controls, placed in the stage bar after the chips. */
export function GameBar({ children }: { children: ReactNode }) {
  const slot = useContext(Slot);
  return slot ? createPortal(children, slot) : null;
}

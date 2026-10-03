import { useState } from "react";
import type { NoisemasterRound } from "../../types";
import { BUTTONS } from "./data";

/** Each button's glow, red to violet across the board, row by row. */
const glowOf = (i: number) => `hsl(${Math.round((i * 280) / (BUTTONS - 1))} 100% 60%)`;

/**
 * The soundboard: "THE NOISEMASTER" on a black label above 4 rows of 4 blank, near-black buttons on
 * Taskmaster red. A pressed button glows round its edge in its own colour of the rainbow. On the
 * player's phone (`onPress`) they're real buttons and glow when tapped. Anywhere else it's a picture of
 * the board that can't be pressed, where the latest press (`last`) glows. The host's copy has each
 * button's word on it (`words`); the stage's stays blank, since the player can see it.
 */
export function Soundboard({ onPress, disabled, last, words }: {
  onPress?: (i: number) => void; disabled?: boolean; last?: NoisemasterRound["last"]; words?: string[];
}) {
  // The phone's own latest tap, counted so tapping the same button again glows again.
  const [tapped, setTapped] = useState<{ i: number; n: number }>();
  return (
    <div className="soundboard">
      <p className="soundboard-label">THE NOISEMASTER</p>
      <div className="soundboard-grid">
        {Array.from({ length: BUTTONS }, (_, i) => {
          const style = { "--glow": glowOf(i) } as React.CSSProperties;
          if (onPress) {
            return (
              <button key={i} className="soundboard-button" style={style} disabled={disabled} aria-label={`Button ${i + 1}`}
                onClick={() => { setTapped((t) => ({ i, n: (t?.n ?? 0) + 1 })); onPress(i); }}>
                {words?.[i]}
                {tapped?.i === i && <span key={tapped.n} className="soundboard-glow" />}
              </button>
            );
          }
          return (
            <span key={i} className="soundboard-button" style={style}>
              {words?.[i]}
              {/* keyed by the press, so pressing the same button again glows again */}
              {last?.i === i && <span key={last.key} className="soundboard-glow" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

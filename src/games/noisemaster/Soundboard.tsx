import type { NoisemasterRound } from "../../types";
import { BUTTONS } from "./data";

/**
 * The soundboard: "THE NOISEMASTER" on a label above 4 rows of 4 blank buttons. On the player's phone
 * (`onPress`) they're real buttons; on the stage it's a picture of the board, where the latest press
 * (`last`) lights up gold if it was right and red if it wasn't.
 */
export function Soundboard({ onPress, disabled, last }: {
  onPress?: (i: number) => void; disabled?: boolean; last?: NoisemasterRound["last"];
}) {
  return (
    <div className="soundboard">
      <p className="soundboard-label">THE NOISEMASTER</p>
      <div className="soundboard-grid">
        {Array.from({ length: BUTTONS }, (_, i) => {
          if (onPress) {
            return <button key={i} className="soundboard-button" disabled={disabled} aria-label={`Button ${i + 1}`} onClick={() => onPress(i)} />;
          }
          const lit = last?.i === i;
          // Keyed by the press, so pressing the same button again lights it up again.
          return <span key={lit ? `${i}-${last.key}` : i} className={lit ? `soundboard-button lit ${last.ok ? "ok" : "wrong"}` : "soundboard-button"} />;
        })}
      </div>
    </div>
  );
}

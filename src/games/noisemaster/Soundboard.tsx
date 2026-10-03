import type { NoisemasterRound } from "../../types";
import { BUTTONS } from "./data";

/**
 * The soundboard: "THE NOISEMASTER" on a label above 4 rows of 4 blank buttons. On the player's phone
 * (`onPress`) they're real buttons. Anywhere else it's a picture of the board that can't be pressed, where
 * the latest press (`last`) lights up gold if it was right and red if it wasn't. The host's copy has
 * each button's word on it (`words`); the stage's stays blank, since the player can see it.
 */
export function Soundboard({ onPress, disabled, last, words }: {
  onPress?: (i: number) => void; disabled?: boolean; last?: NoisemasterRound["last"]; words?: string[];
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
          return <span key={lit ? `${i}-${last.key}` : i} className={lit ? `soundboard-button lit ${last.ok ? "ok" : "wrong"}` : "soundboard-button"}>{words?.[i]}</span>;
        })}
      </div>
    </div>
  );
}

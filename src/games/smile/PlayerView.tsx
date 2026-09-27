import type { Session } from "../../types";
import { Bulb } from "./Bulb";
import { ANSWER, TITLE, smileOf, useLit } from "./data";

/** A player's phone: the light bulb too (silent), and the puzzle. Nothing to press: they tell the host. */
export function PlayerView({ session }: { code: string; uid: string; session: Session }) {
  const game = smileOf(session);
  const lit = useLit(game.buzzAt);
  return (
    <section className="slot">
      <h2>{TITLE}</h2>
      <Bulb lit={lit} />
      {game.revealed
        ? <p className="slot-hint"><strong>{ANSWER}</strong></p>
        : <p className="slot-hint">Every now and then the light and the buzzer go on. Something in the room sets them off. Work out what it is, then tell the host!</p>}
    </section>
  );
}

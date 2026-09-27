import type { Session } from "../../types";
import { Bulb } from "./Bulb";
import { TITLE, smileOf, useLit } from "./data";
import { Task } from "./Task";

/** A player's phone: the light bulb too, and the task. Nothing to press: they tell the host. */
export function PlayerView({ session }: { code: string; uid: string; session: Session }) {
  const game = smileOf(session);
  const lit = useLit(game.litAt);
  return (
    <section className="slot">
      <h2>{TITLE}</h2>
      <Bulb lit={lit} />
      <Task game={game} />
    </section>
  );
}

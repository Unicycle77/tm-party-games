import type { Session } from "../../types";

/** A guest's phone: their headshot went in at check-in, so there's nothing to do but watch. */
export function PlayerView(_: { code: string; uid: string; session: Session }) {
  return (
    <section className="slot waiting">
      <h2>Headshots</h2>
      <p className="slot-hint">Everyone's headshot is going up on the big screen.</p>
    </section>
  );
}

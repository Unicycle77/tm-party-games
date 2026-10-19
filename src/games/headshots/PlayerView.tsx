import { Status } from "../../guest";
import type { Session } from "../../types";

/** A guest's phone: their headshot went in at check-in, so there's nothing to do but watch. */
export function PlayerView(_: { code: string; uid: string; session: Session }) {
  return <Status>Everyone's headshot is going up on the big screen.</Status>;
}

import type { Session } from "../types";
import { ROUNDS } from "./rounds";

/** Main screen: closes a drawing round on time whatever is up, the curtain included (see drawRound's `useCloser`). */
export function RoundCloser({ code, session }: { code: string; session: Session }) {
  ROUNDS.flipchart.useCloser(code, session, true);
  ROUNDS.acetate.useCloser(code, session, true);
  return null;
}

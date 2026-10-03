import { Framed } from "./Framed";
import { PUBLIC_URL } from "./firebase";
import type { Session } from "./types";

/**
 * The curtain with nothing on it: the party's Taskmaster portrait, framed, if it has one, and the code
 * small in the corner. Every moment the big screen would otherwise show a bare curtain uses this.
 */
export function Curtain({ code, session, children }: { code: string; session: Session; children?: React.ReactNode }) {
  const site = PUBLIC_URL.replace(/^https?:\/\//, "");
  return (
    <main className="between-games">
      {session.portrait && (
        <Framed>{(setRatio) => (
          <img src={session.portrait} alt="The Taskmaster" onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />
        )}</Framed>
      )}
      <p className="corner-code">{site}/play · <strong>{code}</strong></p>
      {children}
    </main>
  );
}

import { QRCodeSVG } from "qrcode.react";
import { Framed } from "./Framed";
import { PUBLIC_URL, joinUrlFor } from "./firebase";
import type { Session } from "./types";

/**
 * The curtain with nothing on it: the party's Taskmaster portrait, framed, if it has one, and the code
 * small in the corner. Every moment the big screen would otherwise show a bare curtain uses this.
 */
export function Curtain({ code, session, children }: { code: string; session: Session; children?: React.ReactNode }) {
  return (
    <main className="between-games">
      {session.portrait && (
        <Framed>{(setRatio) => (
          <img src={session.portrait} alt="The Taskmaster" onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />
        )}</Framed>
      )}
      <CornerCode code={code} session={session} />
      {children}
    </main>
  );
}

/**
 * The join address, small in the bottom-right corner for latecomers. While the host remote's "Show QR code" is
 * open, the join QR sits just above it.
 */
export function CornerCode({ code, session }: { code: string; session: Session }) {
  const site = PUBLIC_URL.replace(/^https?:\/\//, "");
  return (
    <div className="corner-code">
      {session.showQr && <QRCodeSVG value={joinUrlFor(code)} size={300} bgColor="#fff" marginSize={2} />}
      <p>{site}/play · <strong>{code}</strong></p>
    </div>
  );
}

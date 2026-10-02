import { useEffect, useState } from "react";
import type { Session } from "../../types";
import { boxOf, decide, decider, roundOf, titleOf, useBoxSecret } from "./data";
import { BOX_ART, findObject } from "./objects";

/**
 * A player's phone. The two players in the round see their box: the peeker holds to look inside (the
 * lid shuts on release, so an open box never sits on the screen), as often as they like until the
 * decision; the decider says swap or keep out loud, then locks it in, once. Nothing is opened until the
 * host does it from their phone, and then the phones step back. Everyone else watches the big screen.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const round = roundOf(session);
  const nameOf = (id: string) => session.players?.[id]?.name ?? "?";
  const isPeeker = !!round && round.peeker === uid;
  // Only the peeker is allowed to read which box holds the object.
  const secret = useBoxSecret(code, isPeeker);
  const [holding, setHolding] = useState(false);
  const [pick, setPick] = useState<"swap" | "keep">();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // A picked-but-not-locked choice never carries over into the next round.
  useEffect(() => { setPick(undefined); setHolding(false); }, [round?.startedAt]);
  // Switching apps mid-hold can swallow the release: shut the lid.
  useEffect(() => {
    const shut = () => setHolding(false);
    document.addEventListener("visibilitychange", shut);
    return () => document.removeEventListener("visibilitychange", shut);
  }, []);

  if (!round) {
    return (
      <section className="slot">
        <h2>{titleOf(round)}</h2>
        <p className="slot-hint">Waiting for the host to pick two players…</p>
      </section>
    );
  }

  const title = titleOf(round);
  const mine = boxOf(round, uid);
  const { a, b } = round.players;
  if (!mine) {
    return (
      <section className="slot">
        <h2>{title}</h2>
        <p className="slot-hint"><strong>{nameOf(a)}</strong> and <strong>{nameOf(b)}</strong> are playing. Watch the big screen!</p>
      </section>
    );
  }

  const object = findObject(round.object);
  const objectName = object?.name ?? "?";
  const other = nameOf(uid === a ? b : a);
  const deciderName = nameOf(decider(round));
  const anyOpened = Object.keys(round.revealed ?? {}).length > 0;
  const hasObject = secret ? secret.inBox === mine : undefined;

  async function lockIn() {
    if (!pick) return;
    setBusy(true);
    setError(undefined);
    try { await decide(code, pick); }
    catch { setError("That didn't go through. Try again."); }
    finally { setBusy(false); }
  }

  // After a box is opened on the big screen, the phones step back: no repeat of what's inside.
  if (anyOpened) {
    return (
      <section className="slot">
        <h2>{title}</h2>
        <p className="slot-hint">The boxes are being opened. Watch the big screen!</p>
      </section>
    );
  }

  // Locked in: the room just heard the choice, so saying it again isn't a spoiler.
  if (round.decision) {
    const who = isPeeker ? deciderName : "You";
    return (
      <section className="slot">
        <h2>{title}</h2>
        <img className="box-art" src={BOX_ART.closed} alt="Your box, closed" />
        <p className="slot-hint">🔒 <strong>{who} {round.decision === "swap" ? "swapped" : "kept"}.</strong> Watch the big screen!</p>
      </section>
    );
  }

  if (isPeeker) {
    const open = holding && hasObject !== undefined;
    const release = () => setHolding(false);
    return (
      <section className="slot">
        <h2>{title}</h2>
        <p className="slot-hint">You're the peeker. Only you can look. {other} decides whether to swap.</p>
        {/* a fixed-size view, so the button never moves under the thumb when the lid opens */}
        <div className="box-view">
          {!open ? <img className="box-art" src={BOX_ART.closed} alt="Your box, closed" />
            : hasObject ? <img className="box-peek" src={object?.url} alt={objectName} />
            : <img className="box-art" src={BOX_ART.open} alt="An empty box" />}
        </div>
        <p className="peek-says" style={{ visibility: open ? "visible" : "hidden" }}>{hasObject ? `The ${objectName.toLowerCase()} is in your box!` : "Your box is empty."}</p>
        <button className="big hold" disabled={hasObject === undefined}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setHolding(true); }}
          onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
          onContextMenu={(e) => e.preventDefault()}>
          👀 Hold to peek
        </button>
        <p className="slot-hint">Let go and the lid closes.</p>
      </section>
    );
  }

  return (
    <section className="slot">
      <h2>{title}</h2>
      <img className="box-art" src={BOX_ART.closed} alt="Your box, closed" />
      {pick ? (
        <>
          <p className="pick">{pick === "swap" ? "Swap" : "Keep"}</p>
          <p className="slot-hint">Say it out loud, then lock it in. You can't change it after this.</p>
          <button className="big" disabled={busy} onClick={() => void lockIn()}>🔒 Lock in: {pick}</button>
          <button className="link" disabled={busy} onClick={() => setPick(undefined)}>Change my mind</button>
        </>
      ) : (
        <>
          <p className="slot-hint">{other} has looked inside their box. The {objectName.toLowerCase()} is in one of the two. Swap boxes with {other}, or keep yours?</p>
          <div className="row">
            <button onClick={() => setPick("swap")}>Swap boxes</button>
            <button onClick={() => setPick("keep")}>Keep my box</button>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

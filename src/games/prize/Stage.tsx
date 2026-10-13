import { useEffect } from "react";
import { Curtain } from "../../Curtain";
import { Framed } from "../../Framed";
import { SafeImg } from "../../SafeImg";
import { setDisplay } from "../../session";
import { useStageBarVisible } from "../../stageBar";
import type { Display, Session } from "../../types";
import { haulWinner, prizePhotos } from "./data";

/** Main screen while the prize task is on: the photo the host put up, or the curtain. */
export function Stage({ code, session, display, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const id = display.contestant;
  const name = id && session.scoreboard?.contestants?.[id]?.name;
  const photo = id ? prizePhotos(session)[id]?.[display.index ?? 0] : undefined;
  if (display.step !== "photo" || !name || !photo) return <Curtain code={code} session={session} />;
  return <PrizePhoto name={name} photo={photo}>{!viewOnly && <StageControls code={code} />}</PrizePhoto>;
}

/** Backup control for the main screen: the host picks every photo, so only Esc or Backspace, to lower the curtain. */
function StageControls({ code }: { code: string }) {
  const visible = useStageBarVisible();
  const back = () => void setDisplay(code, { step: "curtain" });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "Escape" && e.key !== "Backspace")) return;
      e.preventDefault();
      back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className={visible ? "stage-controls show" : "stage-controls"} aria-hidden={!visible}>
      <button onClick={back} tabIndex={visible ? 0 : -1}>Lower the curtain</button>
    </div>
  );
}

/**
 * Main screen: the one photo of a prize the host has put up, hung in the gold frame like a headshot,
 * with the small paper label. The host picks each photo, so there's no running order to step through.
 */
export function PrizePhoto({ name, photo, children }: { name: string; photo: string; children?: React.ReactNode }) {
  return (
    <main className="stage">
      <Framed key={photo}>
        {(setRatio) => (
          <SafeImg src={photo} alt={`${name}'s prize`}
            onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
            onFail={() => setRatio(4 / 3)} />
        )}
      </Framed>
      <div className="stage-label"><span>prize</span> · {name}</div>
      {children}
    </main>
  );
}

/**
 * Main screen, at the end of the party: the winner's prize haul as a gallery wall. The winner's headshot
 * hangs first in the centre, then every prize's ★ photo hangs around it one by one, like pictures going
 * up in a gallery, each with a small paper placard naming who brought it. The winner's own prize is part
 * of the haul. Guests with no prize photo are left out. "Prize Haul" heads the wall, and the winner's
 * portrait has its own, larger placard: "Priya is the winner!".
 */
export function Haul({ winner, headshot, prizes }: { winner: string; headshot?: string; prizes: { from: string; photo: string }[] }) {
  // Two rows of prizes either side of the headshot, filled from the centre outwards, alternating sides,
  // so the wall stays balanced however many prizes there are and each new one hangs on the other side.
  const side = Math.max(1, Math.ceil(prizes.length / 4));
  const place = (k: number) => {
    const ring = Math.floor(k / 4), j = k % 4;
    return { gridRow: Math.floor(j / 2) + 2, gridColumn: j % 2 === 0 ? side - ring : side + 2 + ring };
  };
  return (
    <main className="stage haul" style={{ "--side": side } as React.CSSProperties}>
      <h1 className="haul-title">Prize Haul</h1>
      <figure className="haul-winner" style={{ "--i": 0, gridColumn: side + 1 } as React.CSSProperties}>
        <div className="haul-frame"><SafeImg src={headshot ?? ""} alt={winner} /></div>
        <figcaption>{winner} is the winner!</figcaption>
      </figure>
      {prizes.map((p, i) => (
        <figure key={p.from} className="haul-prize" style={{ "--i": i + 1, ...place(i) } as React.CSSProperties}>
          <div className="haul-frame"><SafeImg src={p.photo} alt={`${p.from}'s prize`} /></div>
          <figcaption>from {p.from}</figcaption>
        </figure>
      ))}
    </main>
  );
}

/** The haul as the big screen shows it: the scoreboard's winner, and every prize's ★ photo in the scoreboard's order. */
export function HaulStage({ code, session }: { code: string; session: Session }) {
  const contestants = session.scoreboard?.contestants ?? {};
  const won = haulWinner(session);
  const winner = won ? contestants[won] : undefined;
  // A tie (or a score changed since) has no winner to show: the curtain until the host calls it again.
  if (!winner) return <Curtain code={code} session={session} />;
  const photos = prizePhotos(session);
  const prizes = Object.entries(contestants).sort(([, a], [, b]) => a.order - b.order)
    .flatMap(([id, c]) => photos[id]?.[0] ? [{ from: c.name, photo: photos[id]![0]! }] : []);
  return <Haul winner={winner.name} headshot={winner.photo} prizes={prizes} />;
}

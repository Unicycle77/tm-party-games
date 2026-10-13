import { Framed } from "../../Framed";
import { SafeImg } from "../../SafeImg";

/**
 * Main screen: the one photo of a prize the host has put up, hung in the gold frame like a headshot,
 * with the small paper label. The host picks each photo, so there's no running order to step through.
 */
export function PrizePhoto({ name, photo }: { name: string; photo: string }) {
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
    </main>
  );
}

/**
 * Main screen, at the end of the party: the winner's prize haul as a gallery wall. The winner's headshot
 * hangs first in the centre, then every prize's ★ photo hangs around it one by one, like pictures going
 * up in a gallery, each with a small paper placard naming who brought it. The winner's own prize is part
 * of the haul. Guests with no prize photo are left out.
 */
export function Haul({ winner, headshot, prizes }: { winner: string; headshot?: string; prizes: { from: string; photo: string }[] }) {
  // Two rows of prizes either side of the headshot, filled from the centre outwards, alternating sides,
  // so the wall stays balanced however many prizes there are and each new one hangs on the other side.
  const side = Math.max(1, Math.ceil(prizes.length / 4));
  const place = (k: number) => {
    const ring = Math.floor(k / 4), j = k % 4;
    return { gridRow: Math.floor(j / 2) + 1, gridColumn: j % 2 === 0 ? side - ring : side + 2 + ring };
  };
  return (
    <main className="stage haul" style={{ "--side": side } as React.CSSProperties}>
      <figure className="haul-winner" style={{ "--i": 0, gridColumn: side + 1 } as React.CSSProperties}>
        <div className="haul-frame"><SafeImg src={headshot ?? ""} alt={winner} /></div>
      </figure>
      {prizes.map((p, i) => (
        <figure key={p.from} className="haul-prize" style={{ "--i": i + 1, ...place(i) } as React.CSSProperties}>
          <div className="haul-frame"><SafeImg src={p.photo} alt={`${p.from}'s prize`} /></div>
          <figcaption>from {p.from}</figcaption>
        </figure>
      ))}
      <div className="stage-label"><span>prize haul</span> · {winner}</div>
    </main>
  );
}

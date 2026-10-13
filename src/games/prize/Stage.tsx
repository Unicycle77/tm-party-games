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

export interface PrizeEntry { id: string; name: string; photos: string[] }

/**
 * The host remote during the prize task. One list of contestants in no set order, since the host talks
 * to whoever they like next: no gold "Next". Tapping a name starts presenting that prize (locking the
 * guest's phone) and opens its previews beside the list, in the guest's order with the ★ on the first.
 * Nothing goes on the big screen until a preview is tapped; the one up is gold, as the stage's current
 * step is. Tapping another name switches straight to them.
 */
export function PrizePresenting({ entries, presenting, presented, up, onPick, onShow, onAdd, onLower }: {
  entries: PrizeEntry[];
  presenting?: string;
  presented: Record<string, boolean>;
  /** The photo on the big screen, if any. */
  up?: { id: string; index: number };
  onPick: (id: string) => void;
  onShow: (id: string, index: number) => void;
  onAdd: (id: string) => void;
  onLower: () => void;
}) {
  const current = entries.find((e) => e.id === presenting);
  const line = up ? `On the big screen: ${entries.find((e) => e.id === up.id)?.name}'s prize, photo ${up.index + 1}` : "The curtain is down.";
  return (
    <div className="prize-host">
      <section className="remote prize-list">
        <div className="remote-head">
          <h2>Prize task</h2>
          <button className="link">← Run of show</button>
        </div>
        <p className="on-screen">{line}</p>
        <ul className="picker running">
          {entries.map((e) => (
            <li key={e.id} className={e.id === presenting ? "up" : presented[e.id] ? "shown" : ""}>
              <button aria-pressed={e.id === presenting} onClick={() => onPick(e.id)}>
                <span>{e.name}</span>
                <span className="muted small">
                  {e.id === presenting ? "presenting" : presented[e.id] ? "presented"
                    : e.photos.length ? `${e.photos.length} ${e.photos.length === 1 ? "photo" : "photos"}` : "no photos yet"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="remote prize-panel">
        {current ? (
          <>
            <h2 className="contestant">{current.name}'s prize</h2>
            {current.photos.length === 0 && <p className="muted">{current.name} hasn't added any photos.</p>}
            <ul className="prize-previews">
              {current.photos.map((url, i) => {
                const isUp = up?.id === current.id && up.index === i;
                return (
                  <li key={url}>
                    <button className={isUp ? "active" : undefined} aria-pressed={isUp} aria-label={`Show photo ${i + 1}`} onClick={() => onShow(current.id, i)}>
                      <img src={url} alt="" />
                      {i === 0 && <span className="star" aria-hidden>★</span>}
                    </button>
                    <span className="muted small">{isUp ? "on the big screen" : " "}</span>
                  </li>
                );
              })}
            </ul>
            <p className="muted small">Tap a photo to put it on the big screen.</p>
            <button onClick={() => onAdd(current.id)}>+ Add photos</button>
            <button className="lower" disabled={!up} onClick={onLower}>Lower the curtain</button>
          </>
        ) : <p className="muted">Tap a name to present their prize.</p>}
      </section>
    </div>
  );
}

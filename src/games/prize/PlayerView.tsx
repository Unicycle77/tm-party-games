import { useEffect, useRef, useState } from "react";

/**
 * The prize task's card on a guest's phone, open from check-in until the host starts presenting their
 * prize. A prize is one or more photos. One paper "Add photos" button: the phone's own picker already
 * offers the library and the camera, so a separate camera button would only save a tap. No gold until
 * something is picked; more can be added, and any removed, before submitting.
 */
export function PrizeCard() {
  const [picked, setPicked] = useState<Picked[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  useEffect(() => () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function add(files: FileList | null) {
    const more = [...(files ?? [])].map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPicked((now) => [...now, ...more]);
  }

  function remove(i: number) {
    URL.revokeObjectURL(picked[i]!.url);
    setPicked((now) => now.filter((_, j) => j !== i));
  }

  const browse = () => input.current?.click();
  return (
    <>
      {picked.length ? <PrizeCheck picked={picked} onAdd={browse} onRemove={remove} onSubmit={() => {}} /> : <PrizeChoose onAdd={browse} />}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    </>
  );
}

const WHO_SEES = "Only the host sees them until your prize is presented. You can change them until then.";

export function PrizeChoose({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="slot task">
      <h2>🎁 Your prize</h2>
      <div className="ph">Your prize</div>
      <p className="slot-hint">Not submitted yet. Add one or more photos of your prize.</p>
      <button onClick={onAdd}>Add photos</button>
      <p className="slot-hint">{WHO_SEES}</p>
    </section>
  );
}

/**
 * Checking the picks before submitting: every photo as a whole thumbnail (never cropped), each with ✕,
 * and "+ Add more" as the last tile, where the next photo will go. Order doesn't matter: the host picks
 * which photo to show. Removing the last photo goes back to the empty card.
 */
export function PrizeCheck({ picked, onAdd, onRemove, onSubmit }: { picked: Picked[]; onAdd: () => void; onRemove: (i: number) => void; onSubmit: () => void }) {
  const n = picked.length;
  return (
    <section className="slot task">
      <h2>🎁 Your prize</h2>
      <ul className="prize-picks">
        {picked.map((p, i) => (
          <li key={p.url}>
            <img src={p.url} alt={`Photo ${i + 1}`} />
            <button className="x" aria-label={`Remove photo ${i + 1}`} onClick={() => onRemove(i)}>✕</button>
          </li>
        ))}
        <li><button className="prize-add" onClick={onAdd}>+ Add more</button></li>
      </ul>
      <p className="slot-hint">{n} {n === 1 ? "photo" : "photos"}, not submitted yet. Are these the right ones?</p>
      <button className="big" onClick={onSubmit}>Submit</button>
      <p className="slot-hint">{WHO_SEES}</p>
    </section>
  );
}

export interface Picked { file: File; url: string }

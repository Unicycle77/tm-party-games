import { useRef } from "react";

/**
 * The prize task's card on a guest's phone, open from check-in until the host starts presenting their
 * prize. A prize is one or more photos. Guests often bring the prize itself, so taking and choosing weigh
 * the same: Photos' two equal paper buttons, and no gold until something is picked. Choosing takes
 * several at once; more can be added before submitting.
 */
export function PrizeCard({ onPick }: { onPick: (files: File[]) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const pick = (input: HTMLInputElement) => { onPick([...(input.files ?? [])]); input.value = ""; };
  return (
    <section className="slot task">
      <h2>🎁 Your prize</h2>
      <div className="ph">Your prize</div>
      <p className="slot-hint">Not submitted yet. Add one or more photos of your prize.</p>
      <div className="row">
        <button onClick={() => camera.current?.click()}>📷 Take a photo</button>
        <button onClick={() => library.current?.click()}>Choose photos</button>
      </div>
      <p className="slot-hint">Only the host sees them until your prize is presented. You can change them until then.</p>
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target)} />
      <input ref={library} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target)} />
    </section>
  );
}

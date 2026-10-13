import { useRef } from "react";

/**
 * The prize task's card on a guest's phone, open from check-in until the host starts presenting their
 * prize. A prize is one or more photos. One paper "Add photos" button: the phone's own picker already
 * offers the library and the camera, so a separate camera button would only save a tap. No gold until
 * something is picked; more can be added before submitting.
 */
export function PrizeCard({ onPick }: { onPick: (files: File[]) => void }) {
  const library = useRef<HTMLInputElement>(null);
  return (
    <section className="slot task">
      <h2>🎁 Your prize</h2>
      <div className="ph">Your prize</div>
      <p className="slot-hint">Not submitted yet. Add one or more photos of your prize.</p>
      <button onClick={() => library.current?.click()}>Add photos</button>
      <p className="slot-hint">Only the host sees them until your prize is presented. You can change them until then.</p>
      <input ref={library} type="file" accept="image/*" multiple hidden onChange={(e) => { onPick([...(e.target.files ?? [])]); e.target.value = ""; }} />
    </section>
  );
}

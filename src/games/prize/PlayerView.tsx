import { useRef } from "react";

/**
 * The prize task's card on a guest's phone, open from check-in until the host starts presenting their
 * prize. A prize is either some photos or one video, never both, so the two pickers are separate equal
 * paper buttons and the rule shows before anything is picked. No gold until something is picked.
 * Prizes are usually photographed at home, so both open the library; the phone's own picker still
 * offers the camera.
 */
export function PrizeCard({ onPick }: { onPick: (files: File[], kind: "photos" | "video") => void }) {
  const photos = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLInputElement>(null);
  return (
    <section className="slot task">
      <h2>🎁 Your prize</h2>
      <div className="ph">Your prize</div>
      <p className="slot-hint">Not submitted yet. Add some photos of your prize, or one video.</p>
      <div className="row">
        <button onClick={() => photos.current?.click()}>Choose photos</button>
        <button onClick={() => video.current?.click()}>Choose a video</button>
      </div>
      <p className="slot-hint">Only the host sees it until your prize is presented. You can change it until then.</p>
      <input ref={photos} type="file" accept="image/*" multiple hidden onChange={(e) => { onPick([...(e.target.files ?? [])], "photos"); e.target.value = ""; }} />
      <input ref={video} type="file" accept="video/*" hidden onChange={(e) => { onPick([...(e.target.files ?? [])], "video"); e.target.value = ""; }} />
    </section>
  );
}

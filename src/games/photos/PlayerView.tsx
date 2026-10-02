import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "../../keepAwake";
import { submitMedia } from "../../media";
import { setUnlocked } from "../../session";
import { isLocked } from "../../submission";
import type { Session } from "../../types";
import { photoOf, photoStatus } from "./data";

/**
 * The same five-step card as Before & After (choose, check, submitting, failed, submitted), for one photo.
 * Photos covers many kinds of task, so taking and choosing a photo weigh the same: two equal paper
 * buttons, and no gold until a photo is picked. Once submitted, the player is locked until the host
 * unlocks them.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const photo = photoOf(session, uid);
  const unlocked = session.games?.photos?.unlocked?.[uid];
  const locked = isLocked(photoStatus(session, uid), unlocked);
  const [picked, setPicked] = useState<Picked>();
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const upload = useRef<AbortController>();
  const pickedRef = useRef<Picked>();
  pickedRef.current = picked;
  const uploading = progress !== undefined;

  // A phone that locks mid-upload can stall it.
  useKeepAwake(uploading);

  useEffect(() => () => { if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url); upload.current?.abort(); }, []);

  // The host re-locked us before we submitted: drop the unsent photo.
  useEffect(() => { if (locked && !uploading) discard(); }, [locked]);

  function discard() {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(undefined);
    setFailed(false);
  }

  function choose(file: File | undefined) {
    if (!file) return;
    discard();
    setPicked({ file, url: URL.createObjectURL(file) });
  }

  async function submit() {
    if (!picked) return;
    const ctl = new AbortController();
    upload.current = ctl;
    setFailed(false);
    setProgress(0);
    try {
      await submitMedia(code, "photos", uid, "photo", picked.file, setProgress, { signal: ctl.signal });
      discard();
      if (unlocked) await setUnlocked(code, "photos", uid, false);
    } catch {
      // Cancelling is a choice, not a failure: back to the check state without the warning.
      if (!ctl.signal.aborted) setFailed(true);
    } finally {
      upload.current = undefined;
      setProgress(undefined);
    }
  }

  const choices = (
    <div className="row">
      <button onClick={() => camera.current?.click()}>📷 Take a photo</button>
      <button onClick={() => library.current?.click()}>Choose a photo</button>
    </div>
  );
  const inputs = (
    <>
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={library} type="file" accept="image/*" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );

  // Submitted and locked: a still receipt, no gold button.
  if (locked && !uploading) {
    return (
      <section className="slot task">
        <span className="stamp">✓ Submitted</span>
        {photo && <img src={photo} alt="Your photo" />}
        <p className="slot-hint">🔒 Your photo is locked in. If you need to change it, ask the host.</p>
        <p className="slot-hint">Your name on the big screen has its stamp too.</p>
      </section>
    );
  }

  return (
    <section className="slot task">
      <h2>Submit your photo</h2>
      {unlocked && !picked && <p className="slot-hint">🔓 The host has let you submit again.</p>}
      {picked ? <img src={picked.url} alt="Your photo" /> : <div className="ph">Your photo</div>}

      {picked ? (
        uploading ? (
          <>
            <div className="sending">
              <progress value={progress} max={1} />
              <span>Submitting… {Math.round((progress ?? 0) * 100)}%</span>
            </div>
            <p className="slot-hint">Keep this screen open until it's done.</p>
            <button className="link" onClick={() => upload.current?.abort()}>Cancel</button>
          </>
        ) : (
          <>
            {failed
              ? <p className="error">Your photo didn't finish sending. Nothing was submitted. Check your Wi-Fi and try again.</p>
              : <p className="slot-hint">Not submitted yet. Is this the right one?</p>}
            <button className="big" onClick={() => void submit()}>{failed ? "Try again" : "Submit"}</button>
            {/* back to the two equal choices: a retake and a different file weigh the same */}
            <button className="link" onClick={discard}>Use a different photo</button>
          </>
        )
      ) : choices}
      {inputs}
    </section>
  );
}

interface Picked { file: File; url: string }

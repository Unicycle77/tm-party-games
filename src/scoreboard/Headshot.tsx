import { useEffect, useRef, useState } from "react";
import { GuestCard } from "../guest";
import { useKeepAwake } from "../keepAwake";
import type { Session } from "../types";
import { uploadHeadshot } from "./data";

/** What a guest reads under their headshot: the Headshot task's words, as written, or what the photo is for. */
export function HeadshotCaption({ session }: { session: Session | null | undefined }) {
  const text = Object.values(session?.scoreboard?.tasks ?? {}).find((t) => t.game === "headshots")?.text?.trim();
  return <p className="caption">{text ? `“${text}”` : "Your headshot for the scoreboard."}</p>;
}

/**
 * Checking in without a headshot on file: the guest adds one, and it goes straight into their frame on
 * the scoreboard. Photos' card step for step (choose, check, sending, failed), with two equal paper
 * buttons since taking and choosing weigh the same, in the same gold frame as "You're Sam?". Required: it's a
 * step of checking in.
 */
export function Headshot({ code, uid, id, session }: { code: string; uid: string; id: string; session: Session }) {
  const [picked, setPicked] = useState<{ file: File; url: string }>();
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  const uploading = progress !== undefined;

  // A phone that locks mid-upload can stall it.
  useKeepAwake(uploading);
  useEffect(() => () => { if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url); }, []);

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
    setFailed(false);
    setProgress(0);
    // Once it lands, the card gives way to the next step of checking in by itself.
    try { await uploadHeadshot(code, uid, id, picked.file, setProgress); }
    catch { setFailed(true); }
    finally { setProgress(undefined); }
  }

  return (
    <GuestCard label="To do now" title="Add your headshot">
      {picked ? <img className="headshot" src={picked.url} alt="Your headshot" /> : <div className="ph headshot">Your headshot</div>}
      <HeadshotCaption session={session} />
      {picked ? (
        uploading ? (
          <>
            <div className="sending">
              <progress value={progress} max={1} />
              <span>Submitting… {Math.round(progress * 100)}%</span>
            </div>
            <p className="slot-hint">Keep this screen open until it's done.</p>
          </>
        ) : (
          <>
            {failed
              ? <p className="error">Your headshot didn't finish sending. Check your Wi-Fi and try again.</p>
              : <p className="slot-hint">Not submitted yet. Is this the right one?</p>}
            <button className="big" onClick={() => void submit()}>{failed ? "Try again" : "Submit"}</button>
            <button className="link" onClick={discard}>Use a different photo</button>
          </>
        )
      ) : (
        <div className="row">
          <button onClick={() => camera.current?.click()}>📷 Take a photo</button>
          <button onClick={() => library.current?.click()}>Choose a photo</button>
        </div>
      )}
      <input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={library} type="file" accept="image/*" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
    </GuestCard>
  );
}

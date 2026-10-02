import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "../../keepAwake";
import { submitMedia } from "../../media";
import { setUnlocked } from "../../session";
import { isLocked } from "../../submission";
import type { Session } from "../../types";
import { mediaOf, submissionStatus } from "./data";
import { FrameError, extractFrames } from "./frames";

/**
 * One card that changes state while the main button stays in the same spot: choose a video, check it,
 * submit it, then a locked receipt. Guests film their video before the party, so choosing a file is the
 * gold action and recording on the spot is a quiet link. The phone never shows the task text.
 *
 * The video's first and last frames become the Before and After (grabbed on the phone the moment a
 * video is chosen). The video can be watched only while deciding; once submitted, the frames are a
 * still receipt. Once submitted, the player is locked until the host unlocks them.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const mine = mediaOf(session, uid);
  const unlocked = session.games?.beforeAfter?.unlocked?.[uid];
  const locked = isLocked(submissionStatus(mine), unlocked);
  const [picked, setPicked] = useState<Picked>();
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string>();
  const [detail, setDetail] = useState<string>();
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const upload = useRef<AbortController>();
  const pickedRef = useRef<Picked>();
  pickedRef.current = picked;
  const uploading = progress !== undefined;

  // A phone that locks mid-upload can stall it.
  useKeepAwake(uploading);

  useEffect(() => () => { if (pickedRef.current) revokePicked(pickedRef.current); upload.current?.abort(); }, []);

  // The host re-locked us before we submitted: drop the unsent video.
  useEffect(() => { if (locked && !uploading) discard(); }, [locked]);

  function discard() {
    if (picked) revokePicked(picked);
    setPicked(undefined);
    setFailed(false);
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    discard();
    setError(undefined);
    setDetail(undefined);
    setChecking(true);
    try {
      const { first, last } = await extractFrames(file);
      setPicked({
        file, first, last,
        videoUrl: URL.createObjectURL(file), firstUrl: URL.createObjectURL(first), lastUrl: URL.createObjectURL(last),
      });
    } catch (e) {
      setError(e instanceof FrameError ? e.message : "We couldn't read that video. Please record it again.");
      setDetail(e instanceof FrameError ? e.detail : undefined);
    } finally {
      setChecking(false);
    }
  }

  async function submit() {
    if (!picked) return;
    const ctl = new AbortController();
    upload.current = ctl;
    setFailed(false);
    setProgress(0);
    try {
      await submitMedia(code, "beforeAfter", uid, "video", picked.file, setProgress, { signal: ctl.signal });
      await Promise.all([
        submitMedia(code, "beforeAfter", uid, "before", picked.first, () => {}, { alreadySized: true, signal: ctl.signal }),
        submitMedia(code, "beforeAfter", uid, "after", picked.last, () => {}, { alreadySized: true, signal: ctl.signal }),
      ]);
      discard();
      if (unlocked) await setUnlocked(code, "beforeAfter", uid, false);
    } catch {
      // Cancelling is a choice, not a failure: back to the check state without the warning.
      if (!ctl.signal.aborted) setFailed(true);
    } finally {
      upload.current = undefined;
      setProgress(undefined);
    }
  }

  // Full screen: the in-card player would push Submit off the screen.
  function watch() {
    const v = player.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!v) return;
    void v.play().catch(() => {});
    if (v.requestFullscreen) void v.requestFullscreen().catch(() => v.webkitEnterFullscreen?.());
    else v.webkitEnterFullscreen?.();
  }
  useEffect(() => {
    const v = player.current;
    if (!v) return;
    const stop = () => { if (!document.fullscreenElement) { v.pause(); v.currentTime = 0; } };
    document.addEventListener("fullscreenchange", stop);
    v.addEventListener("webkitendfullscreen", stop);
    return () => { document.removeEventListener("fullscreenchange", stop); v.removeEventListener("webkitendfullscreen", stop); };
  }, [picked]);

  const submitted = !picked && submissionStatus(mine) === "submitted";
  const beforeUrl = picked ? picked.firstUrl : submitted ? mine.before : undefined;
  const afterUrl = picked ? picked.lastUrl : submitted ? mine.after : undefined;
  const busy = uploading || checking;
  const pick = (input: React.RefObject<HTMLInputElement>) => input.current?.click();

  const frames = (
    <div className="pair-preview">
      {([["Before", beforeUrl], ["After", afterUrl]] as const).map(([label, url]) => (
        <figure key={label}>
          {!url ? <div className="ph">{label}</div>
            : picked && !uploading ? <button className="frame-play" onClick={watch} aria-label="Watch your video"><img src={url} alt={label} /></button>
            : <img src={url} alt={label} />}
          <figcaption>{label}</figcaption>
        </figure>
      ))}
    </div>
  );

  // Submitted and locked: a still receipt, no gold button.
  if (locked && !uploading) {
    return (
      <section className="slot task">
        <span className="stamp">✓ Submitted</span>
        {frames}
        <p className="slot-hint">🔒 Your video is locked in. If you need to change it, ask the host.</p>
        <p className="slot-hint">Your name on the big screen has its stamp too.</p>
      </section>
    );
  }

  return (
    <section className="slot task">
      <h2>Submit your video</h2>
      {unlocked && !picked && <p className="slot-hint">🔓 The host has let you submit again.</p>}
      {frames}

      {picked ? (
        <>
          {!uploading && <button className="link" onClick={watch}>▶ Watch your video</button>}
          <video ref={player} className="offscreen" src={picked.videoUrl} playsInline preload="metadata" />
          {uploading ? (
            <>
              <div className="sending">
                <progress value={progress} max={1} />
                <span>Submitting… {Math.round((progress ?? 0) * 100)}%</span>
              </div>
              <p className="slot-hint">Keep this screen open until it's done. Big videos can take a minute.</p>
              <button className="link" onClick={() => upload.current?.abort()}>Cancel</button>
            </>
          ) : (
            <>
              {failed
                ? <p className="error">Your video didn't finish sending. Nothing was submitted. Check your Wi-Fi and try again.</p>
                : <p className="slot-hint">Not submitted yet. Is this the right one?</p>}
              <button className="big" onClick={() => void submit()}>{failed ? "Try again" : "Submit"}</button>
              <button className="link" onClick={() => pick(library)}>Choose a different video</button>
            </>
          )}
        </>
      ) : (
        <>
          <p className="slot-hint">Pick the video you made for the task. We'll take your Before and After from its first and last frame.</p>
          {checking && <p className="slot-hint">Checking your video…</p>}
          <button className="big" disabled={busy} onClick={() => pick(library)}>Choose your video</button>
          <button className="link" disabled={busy} onClick={() => pick(camera)}>Didn't make one? Record it now</button>
        </>
      )}

      <input ref={camera} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={library} type="file" accept="video/*" hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
      {error && <p className="error">{error}</p>}
      {detail && <p className="muted small tech-detail">Technical details (send to the host): {detail}</p>}
    </section>
  );
}

interface Picked { file: File; first: Blob; last: Blob; videoUrl: string; firstUrl: string; lastUrl: string }
const revokePicked = (p: Picked) => [p.videoUrl, p.firstUrl, p.lastUrl].forEach((u) => URL.revokeObjectURL(u));

import { useEffect, useRef, useState } from "react";
import { endSting, markSting } from "./session";
import { stingMusic, stingVideo } from "./stingPictures";
import type { Session } from "./types";

/**
 * Main screen only (it has the files): plays a task's transition when the host's Start writes `sting`. Its music plays through an
 * audio element of its own (Start has already stopped the jukebox), its video fills the screen with its own sound, and either ends
 * the transition when it finishes. A picture is Screen's to show. A picture on its own has no sound to end it: it goes the moment
 * the host puts anything else on the big screen. Anything the PC can't play ends the transition at once, so Start never hangs.
 */
export function StingDriver({ code, session }: { code: string; session: Session }) {
  const sting = session.sting;
  const task = sting && session.scoreboard?.tasks?.[sting.task];
  const music = task?.transitionVideo ? undefined : task?.transition;
  const video = task?.transitionVideo;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>();
  const on = !!sting;

  // What the big screen showed when the transition began: any change ends it.
  const here = JSON.stringify([session.display, session.conversion, session.clock?.shown, session.game]);
  const began = useRef<string>();
  useEffect(() => {
    if (!on) { began.current = undefined; return; }
    if (began.current === undefined) began.current = here;
    else if (began.current !== here) void endSting(code);
  }, [on, here, code]);

  // The music: from its file, once.
  useEffect(() => {
    const audio = audioRef.current;
    if (!on || !music || !audio) return;
    const handle = stingMusic(music);
    if (!handle) { void endSting(code); return; }
    let url: string | undefined;
    let cancelled = false;
    void handle.getFile().then((file) => {
      if (cancelled) return;
      url = URL.createObjectURL(file);
      audio.src = url;
      return audio.play();
    }).catch(() => { if (!cancelled) void endSting(code); });
    return () => { cancelled = true; audio.pause(); audio.removeAttribute("src"); if (url) URL.revokeObjectURL(url); };
  }, [on, music, code]);

  // The video: from its file, full screen.
  useEffect(() => {
    if (!on || !video) { setVideoUrl(undefined); return; }
    const handle = stingVideo(video);
    if (!handle) { void endSting(code); return; }
    let url: string | undefined;
    let cancelled = false;
    void handle.getFile().then((file) => {
      if (cancelled) return;
      url = URL.createObjectURL(file);
      setVideoUrl(url);
    }).catch(() => { if (!cancelled) void endSting(code); });
    return () => { cancelled = true; setVideoUrl(undefined); if (url) URL.revokeObjectURL(url); };
  }, [on, video, code]);

  return (
    <>
      <audio ref={audioRef} onPlaying={() => void markSting(code, Date.now())} onEnded={() => void endSting(code)} onError={() => { if (audioRef.current?.getAttribute("src")) void endSting(code); }} />
      {videoUrl && (
        <video className="sting-video" src={videoUrl} autoPlay onPlaying={() => void markSting(code, Date.now())} onEnded={() => void endSting(code)} onError={() => void endSting(code)} />
      )}
    </>
  );
}

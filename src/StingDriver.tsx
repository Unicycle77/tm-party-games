import { useEffect, useRef, useState } from "react";
import { endSting, markSting } from "./session";
import { stingFiles } from "./sting";
import { hasStingMusic, hasStingVideo, stingMusicFile, stingVideoFile } from "./stingPictures";
import type { Session } from "./types";

/**
 * Main screen only (it has the files): plays a task's transition when the host's Start writes `sting`. Its music plays through an
 * audio element of its own (Start has already stopped the jukebox), its video fills the screen with its own sound, and either ends
 * the transition when it finishes. A picture is Screen's to show. A picture on its own has no sound to end it: it goes the moment
 * the host puts anything else on the big screen. Anything the PC can't play ends the transition at once, so Start never hangs.
 */
export function StingDriver({ code, session }: { code: string; session: Session }) {
  const sting = session.sting;
  const files = stingFiles(session);
  const music = files?.music;
  const video = files?.video;
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
    if (!hasStingMusic(music)) { void endSting(code); return; }
    let url: string | undefined;
    let cancelled = false;
    void stingMusicFile(music).then((file) => {
      if (cancelled || !file) return;
      url = URL.createObjectURL(file);
      audio.src = url;
      return audio.play();
    }).catch(() => { if (!cancelled) void endSting(code); });
    return () => { cancelled = true; audio.pause(); audio.removeAttribute("src"); if (url) URL.revokeObjectURL(url); };
  }, [on, music, code]);

  // The video: from its file, full screen.
  useEffect(() => {
    if (!on || !video) { setVideoUrl(undefined); return; }
    if (!hasStingVideo(video)) { void endSting(code); return; }
    let url: string | undefined;
    let cancelled = false;
    void stingVideoFile(video).then((file) => {
      if (cancelled || !file) return;
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

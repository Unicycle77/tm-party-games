import { useEffect, useRef, useState } from "react";
import { endSting, holdSting, markSting, publishVideoLength } from "./session";
import { stingFiles } from "./sting";
import { hasStingMusic, hasStingVideo, stingMusicFile, stingVideoFile, warmFor } from "./stingPictures";
import { asList } from "./JukeboxRemote";
import { sorted, upNextOf } from "./scoreboard/tasks";
import type { Session } from "./types";

/**
 * Main screen only (it has the files): plays a task's transition when the host's Start writes `sting`. Its music plays through an
 * audio element of its own (Start has already stopped the jukebox), its video fills the screen with its own sound, and either ends
 * the transition when it finishes (a video holds its last frame instead, until the host puts anything else up or taps the strip). A picture is Screen's to show. A picture on its own has no sound to end it: it goes the moment
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
  const held = !!sting?.held;
  const videoRef = useRef<HTMLVideoElement>(null);
  const wasHeld = useRef(false);

  // Ahead of Start: the next two tasks' music and video are read into memory, after the stage has had a few seconds to load.
  const board = session.scoreboard;
  const next = upNextOf(board)?.id;
  const ahead = sorted(board?.tasks).map(([id, t]) => ({ id, t })).filter((_, i, all) => { const at = all.findIndex((x) => x.id === next); return at >= 0 && i >= at && i < at + 2; });
  const wantedMusic = ahead.map(({ t }) => (t.transitionVideo ? undefined : t.transition)).filter((m): m is string => !!m);
  const wantedVideo = ahead.map(({ t }) => t.transitionVideo).filter((v): v is string => !!v);
  const wanted = JSON.stringify([wantedMusic, wantedVideo, session.jukebox?.tracksAt]);
  const videoList = asList(session.jukebox?.transitionVideos).join("\n");
  useEffect(() => {
    const [m, v] = JSON.parse(wanted) as [string[], string[]];
    const timer = window.setTimeout(() => {
      void warmFor({ music: m, video: v }, (name, seconds) => {
        const i = videoList.split("\n").indexOf(name);
        if (i >= 0) void publishVideoLength(code, i, seconds);
      });
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [wanted, videoList, code]);

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

  // Played again over its own last frame: back to the start. A replay is a fresh `sting` (no `at` yet); a hold that was refused and
  // rolled back still has its `at`, and must not start the video over.
  useEffect(() => {
    const was = wasHeld.current;
    wasHeld.current = held;
    const el = videoRef.current;
    if (was && !held && on && el && !sting?.at) { el.currentTime = 0; void el.play().catch(() => void endSting(code)); }
  }, [held, on, code]);

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
        <video ref={videoRef} className="sting-video" src={videoUrl} autoPlay onPlaying={() => void markSting(code, Date.now())} onEnded={() => void holdSting(code)} onError={() => void endSting(code)} />
      )}
    </>
  );
}

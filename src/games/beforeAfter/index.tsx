import type { Game } from "..";
import { KINDS, allMedia, mediaOf, submissionStatus } from "./data";
import { HostLobby, HostPlayer } from "./HostControls";
import { PlayerView } from "./PlayerView";
import { Stage } from "./Stage";

/** Each player records one video; its first and last frames become their Before and After. */
export const beforeAfter: Game = {
  id: "beforeAfter",
  name: "Before & After",
  blurb: "Everyone films one video, from before to after.",
  heading: () => <>Before <span className="amp">&amp;</span> After</>,
  firstStep: "before",
  // The card guests were sent before the party, minus its deadline.
  task: [
    "Individual task",
    "Record a short video.",
    "The first frame of your video will be your before photo.",
    "The last frame of your video will be your after photo.",
    "The before and after photos that most make the Taskmaster want to see what happened in between wins.",
    "There will be two bonus points for the most unexpected thing that happened between the photos.",
  ],
  status: (session, uid) => submissionStatus(mediaOf(session, uid)),
  photoUrls: (session) => Object.values(allMedia(session)).flatMap((m) => [m.before, m.after]).filter((u): u is string => !!u),
  files: (session, uid) => KINDS.flatMap((kind) => {
    const url = mediaOf(session, uid)[kind];
    return url ? [{ name: kind, url }] : [];
  }),
  Stage,
  Player: PlayerView,
  HostPlayer,
  HostLobby,
};

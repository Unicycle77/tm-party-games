import type { ComponentType, ReactNode } from "react";
import { activeGameId } from "../session";
import type { SubmissionStatus } from "../submission";
import type { Display, GameId, Session, Step } from "../types";
import { acetate } from "./acetate";
import { beforeAfter } from "./beforeAfter";
import { box } from "./box";
import { flipchart } from "./flipchart";
import { noisemaster } from "./noisemaster";
import { headshotsGame } from "./headshots";
import { photos } from "./photos";
import { prize } from "./prize";
import { secretTasks } from "./secretTasks";
import { snake } from "./snake";
import { duck } from "./duck";
import { fruit } from "./fruit";

/**
 * What a game plugs into the shared screens. The session, its players, the lobby, the jukebox and
 * the download-all button are shared; everything a player submits belongs to one game.
 */
export interface Game {
  id: GameId;
  name: string;
  /** What the guest's card names the task by, when it's the thing they draw on ("Task 5 of 8 · Toilet roll"). Default: `name`. */
  medium?: string;
  /**
   * Everyone's entries are revealed together, by the game's own Round (the snake race, the duck line-up): no "Next" and no
   * one-at-a-time look on the host's list, and once the round is over the list gives way to the Round's.
   */
  together?: boolean;
  /** One line on the game picker's card saying what players do. */
  blurb: string;
  /** The lobby's title while this game is on. */
  heading(session: Session): ReactNode;
  /** Where picking a player (in the lobby or on the host phone) starts. */
  firstStep: Step;
  /**
   * Games where each player submits something: that player's status (lobby tiles, host list, lock).
   * Absent for games the host runs (like [BLANK] in a Box): players are then just listed.
   */
  status?(session: Session, uid: string): SubmissionStatus;
  /**
   * The task card the main screen shows while entries come in, one paragraph per line (the first is the
   * card's label). Fixed per game. Absent: the stage shows the game's title instead.
   */
  task?: readonly string[];
  /** Photos the main screen downloads ahead of time, so reveals appear instantly. */
  photoUrls(session: Session): string[];
  /** A player's files for the download-all zip, named without an extension (e.g. "before"). */
  files(session: Session, uid: string): { name: string; url?: string; render?: () => Promise<Blob> }[];
  /** Games with a round the host starts: false until the round is over, and then nobody can be shown (and the TV shows `Collecting`). */
  canShow?(session: Session): boolean;
  /** True while the round holds the main screen, so a pick on it does nothing. */
  holdsScreen?(session: Session): boolean;
  /**
   * The order the host's running order and the "everyone" screen go in (the fruit selfie: shortest time first). Default:
   * the order the guests joined.
   */
  order?(session: Session): string[];
  /** Main screen, collecting: replaces the column of names and stamps on the right (the fruit selfie's times). */
  Side?: ComponentType<{ code: string; session: Session; viewOnly: boolean }>;
  /** Host phone: the Round draws its own list of contestants while the round is on (the fruit selfie's times and stamps), in place of the usual one. */
  ownList?: boolean;
  /** Main screen, collecting: replaces the task card in the middle. */
  Collecting?: ComponentType<{ code: string; session: Session; viewOnly: boolean }>;
  /** Host phone, collecting: the round's own control, above the player list (the gold "next thing" while the round is on). */
  Round?: ComponentType<{ code: string; session: Session }>;
  /** Main screen, for every step but "list". `viewOnly` (an extra screen): no controls, and never writes to the session. */
  Stage: ComponentType<{ code: string; session: Session; display: Display; viewOnly: boolean }>;
  /** The player's phone, below their name. */
  Player: ComponentType<{ code: string; uid: string; session: Session }>;
  /** Host phone: what the main screen shows of the picked player. */
  HostPlayer: ComponentType<{ code: string; session: Session; display: Display; uid: string }>;
  /** Host phone, for games the host runs: what follows "On the big screen:", when the game says more than the step. */
  onScreen?(session: Session, display: Display): string | undefined;
  /** Only on the scoreboard's task list (the Headshot task), never on the game picker. */
  scoreboardOnly?: boolean;
  /** Can be on the run of show more than once (Photos: a general tool, one entry per photo task). Other games go on it once. */
  repeatable?: boolean;
  /**
   * Host phone, for games the host runs: lays out `head` (the game's name, the way back and what's on the
   * big screen) itself, e.g. over one column of two. Otherwise the remote puts it above the lobby.
   */
  headInLobby?: boolean;
  /** Host phone: the buttons above the player list (e.g. show everyone at once). */
  HostLobby: ComponentType<{ code: string; session: Session; display: Display; head?: ReactNode }>;
}

/** In the order the game picker shows them. */
export const GAMES: Record<GameId, Game> = { photos, beforeAfter, box, noisemaster, secretTasks, headshots: headshotsGame, prize, flipchart, acetate, snake, duck, fruit };

/** The games on the game picker (the rest only start from the scoreboard's task list). */
export const PICKER_GAMES = Object.values(GAMES).filter((g) => !g.scoreboardOnly);

/** The game being played; undefined on the game selection screen. */
export const activeGame = (session: Session): Game | undefined => {
  const id = activeGameId(session);
  return id && GAMES[id];
};

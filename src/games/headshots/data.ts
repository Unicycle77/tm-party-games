import { ref, update } from "firebase/database";
import { db } from "../../firebase";
import { setDisplay } from "../../session";
import type { Player, Session } from "../../types";

/**
 * The Headshot task's entries are the scoreboard's headshots: every contestant with a photo in their
 * frame, checked in or not, in the scoreboard's order. Keyed by contestant id, not player uid.
 */
export function headshots(session: Session): [string, { name: string; photo: string }][] {
  return Object.entries(session.scoreboard?.contestants ?? {})
    .sort(([, a], [, b]) => a.order - b.order)
    .filter((e): e is [string, { name: string; photo: string; order: number }] => !!e[1].photo)
    .map(([id, c]) => [id, { name: c.name, photo: c.photo }]);
}

/** For the everyone grid, which lays out players: each headshot as a "player", in the scoreboard's order. */
export const asPlayers = (session: Session): Record<string, Player> =>
  Object.fromEntries(Object.entries(session.scoreboard?.contestants ?? {}).map(([id, c]) => [id, { name: c.name, joinedAt: c.order }]));

export const shownOf = (session: Session): Record<string, boolean> => session.games?.headshots?.shown ?? {};

/** The contestant before / after `id` who has a headshot. */
export function neighbour(session: Session, id: string, dir: 1 | -1): string | undefined {
  const order = headshots(session).map(([c]) => c);
  const i = order.indexOf(id);
  return i < 0 ? undefined : order[i + dir];
}

/** One contestant's headshot on the big screen, ticked off in the running order. */
export const showHeadshot = (code: string, id: string) =>
  update(ref(db(), `sessions/${code}`), { display: { step: "photo", contestant: id }, conversion: null, [`games/headshots/shown/${id}`]: true });

export const showEveryone = (code: string) => setDisplay(code, { step: "grid" });

/** The drawing tasks: guests draw on their phones against one clock the host starts, and whatever's drawn goes in at time. */
export const DRAW_GAMES = ["flipchart", "acetate", "snake", "duck", "fruit"] as const;
export type DrawGame = (typeof DRAW_GAMES)[number];

/** Each guest's part of a drawing round, kept by uid. */
export const GUEST_PARTS = ["pages", "submitted", "unlocked", "shown", "answers"] as const;

import type { Session } from "./types";

/** What's on the big screen as a task's transition: its music, picture or video (a video stands alone). */
export interface StingFiles { task: string; music?: string; picture?: string; video?: string }

/**
 * The transition that's on now, if one is. A real Start plays what the task has saved; "Try it" in ✎ carries what's picked there
 * (`draft`) before it's saved, and that is what plays.
 */
export function stingFiles(session: Session): StingFiles | undefined {
  const s = session.sting;
  if (!s) return undefined;
  const t = session.scoreboard?.tasks?.[s.task];
  const from = s.draft ?? { music: t?.transition, picture: t?.transitionImage, video: t?.transitionVideo };
  return from.video ? { task: s.task, video: from.video } : { task: s.task, music: from.music || undefined, picture: from.picture || undefined };
}

import { createContext, useContext, type ReactNode } from "react";

/**
 * A task's page on a locked party (see LockedSlot on Run of show): its points and entries stay as they are until the
 * host unlocks just this task, here, for as long as the page is open. Leaving the page locks it again.
 */
export interface TaskLock {
  /** The party is locked and this task hasn't been unlocked on this page: taps explain instead of changing anything. */
  locked: boolean;
  /** Unlocked on this page, while the rest of the party stays locked. */
  open: boolean;
  /** The task's name, for "Unlock Dice tower". */
  title: string;
  /** Asks, then unlocks this task on this page. */
  unlock: () => void;
  /** Locks it again ("Lock it"). */
  relock: () => void;
}

export const TaskLockContext = createContext<TaskLock>({ locked: false, open: false, title: "", unlock: () => {}, relock: () => {} });
export const useTaskLock = () => useContext(TaskLockContext);

/**
 * What a tap on a locked control says, where the thumb is: what stayed as it was, and the way to unlock this task.
 * `what` finishes "The party is completed, so …" ("Sam stays on 2").
 */
export function LockedLine({ what, to = "change it" }: { what: ReactNode; to?: string }) {
  const lock = useTaskLock();
  return (
    <p className="muted small locked-line">
      🔒 The party is completed, so {what}. <button className="link" onClick={lock.unlock}>Unlock {lock.title}</button> to {to}.
    </p>
  );
}

/** The end of a task's status line: "· 🔒 locked", or "· 🔓 unlocked · Lock it" once unlocked on this page. */
export function LockState() {
  const lock = useTaskLock();
  if (lock.locked) return <> · 🔒 locked</>;
  if (lock.open) return <> · 🔓 unlocked · <button className="link" onClick={lock.relock}>Lock it</button></>;
  return null;
}

import { useEffect } from "react";

/** Stops the screen going to sleep while `active` (asked again whenever the page comes back). */
export function useKeepAwake(active = true) {
  useEffect(() => {
    if (!active) return;
    let lock: WakeLockSentinel | undefined;
    const request = () => {
      if (document.visibilityState === "visible") navigator.wakeLock?.request("screen").then((l) => { lock = l; }, () => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => { document.removeEventListener("visibilitychange", request); void lock?.release(); };
  }, [active]);
}

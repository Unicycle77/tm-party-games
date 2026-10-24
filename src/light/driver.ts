import { onDisconnect, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import type { LightState } from "../types";
import { isArmed, lightLater, lightOneLater, modeOf, ONE, SPIN_STEP_MS, setCamera, useFlash } from "./data";
import { RED, type HueConfig } from "./hue";
import { useHueLamps } from "./HueSetup";

/**
 * What runs the light, wherever it runs (the /light page, or the main screen out of sight): which bulb is
 * lit, the Hue lamp following it, and each trigger the camera sees turning the light on a little later
 * (unless it's off). `onTrigger` is for the camera. If the page closes, the host phone stops showing what
 * the camera saw.
 */
export function useLightDriver(code: string, light: LightState, hue: HueConfig | undefined) {
  const armed = isArmed(light);
  const mode = modeOf(light);
  // One secret: the red bulb. All at once: a bulb per trigger, in its colour.
  // One flash at a time, each for its full second (see useFlash).
  const flash = useFlash(light);
  // A rainbow spin: which bulb is lit, and the lamp's colour, step with the time since it started.
  const spinning = !!mode?.spins?.some((t) => t.id === flash);
  const spun = useSpinTime(spinning);
  const spinBulb = spinning && mode ? spinOrder(mode.bulbs.length)[Math.floor(spun / SPIN_STEP_MS) % mode.bulbs.length] : undefined;
  // The Hue lamp shows the lit bulb's colour (in a spin, following it round as fast as the bridge can).
  const lampColour = flash === ONE ? RED
    : spinBulb !== undefined ? mode?.bulbs[spinBulb]?.colour
    : mode?.bulbs.find((b) => b.trigger.id === flash)?.colour;
  const hueError = useHueLamps(hue, lampColour);

  // Each time someone does a trigger, its light goes on a little later (unless it's off).
  const armedNow = useRef(armed);
  armedNow.current = armed;
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const camera = ref(db(), `sessions/${code}/light/camera`);
    void onDisconnect(camera).remove();
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      void onDisconnect(camera).cancel();
      // Refused if the slot is already gone (Stop the light, or the host's reset), which cleared it anyway.
      setCamera(code, null).catch(() => {});
    };
  }, [code]);
  const onTrigger = (id: string) => { if (armedNow.current) timers.current.push(mode ? lightOneLater(code, id) : lightLater(code)); };

  return { armed, mode, flash, spinning, spinBulb, hueError, onTrigger };
}

/** Milliseconds since `on` became true (0 while it's false), updated often enough to animate. */
function useSpinTime(on: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!on) return;
    const start = Date.now();
    const tick = window.setInterval(() => setElapsed(Date.now() - start), 40);
    return () => window.clearInterval(tick);
  }, [on]);
  return elapsed;
}

/** The order the spin lights the bulbs in: round the grid (three across), clockwise. */
function spinOrder(count: number): number[] {
  if (count !== 6) return [...Array(count).keys()];
  return [0, 1, 2, 5, 4, 3];
}

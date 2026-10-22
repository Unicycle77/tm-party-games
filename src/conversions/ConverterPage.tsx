import { useState } from "react";
import { store } from "../store";
import { Toggle } from "../Toggle";
import { Converter } from "./Converter";
import type { System } from "./convert";

const SYSTEM_KEY = "ba.convertSystem";

/** The phone's own units on a first visit: US units where they're what people say (the US, Liberia, Myanmar). */
function guessSystem(): System {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return region && ["US", "LR", "MM"].includes(region) ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

/**
 * 📏 at /convert: the host's converter with the party taken out, for a measurement anywhere, on any phone. No header,
 * no tasks' units and no big screen; metric or US units is a switch under the result, remembered on the phone.
 */
export function ConverterPage() {
  const [system, setSystemState] = useState<System>(() => {
    const kept = store.get(SYSTEM_KEY);
    return kept === "imperial" || kept === "metric" ? kept : guessSystem();
  });
  const setSystem = (s: System) => { setSystemState(s); store.set(SYSTEM_KEY, s); };
  return (
    <main className="phone">
      <Converter system={system} footer={() => (
        <div className="toggles">
          <Toggle label="US units (ft, lb, cups)" on={system === "imperial"} onChange={(on) => setSystem(on ? "imperial" : "metric")} />
        </div>
      )} />
    </main>
  );
}

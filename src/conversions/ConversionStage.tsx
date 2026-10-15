import type { ShownConversion } from "../types";

/** The big screen while the host shows a useless conversion: the three lines they read out, on paper, on the curtain. */
export function ConversionStage({ conversion }: { conversion: ShownConversion }) {
  return (
    <main className="stage conversion-stage">
      <div className="conversion-card" key={conversion.main}>
        <p className="lead">{conversion.lead}</p>
        <p className="main">{conversion.main}</p>
        <p className="lead">{conversion.how}</p>
      </div>
    </main>
  );
}

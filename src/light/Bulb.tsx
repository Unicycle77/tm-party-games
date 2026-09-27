/** The prop: a red light bulb on a small wooden box with a hole in the front. Coloured from styles.css. */
export function Bulb({ lit }: { lit: boolean }) {
  return (
    <div className={lit ? "bulb on" : "bulb"} role="img" aria-label={lit ? "The light bulb is on" : "The light bulb is off"}>
      <svg viewBox="0 0 240 300" aria-hidden>
        <g transform="translate(40 4) scale(0.8)">
          <path className="bulb-glass" d="M100 12C46 12 18 54 18 100c0 38 26 60 42 86 8 13 10 24 10 36h60c0-12 2-23 10-36 16-26 42-48 42-86 0-46-28-88-82-88Z" />
          <path className="bulb-wire" d="M86 222V150M114 222V150" />
          <path className="bulb-filament" d="M86 150q3.5-22 7-0t7-0 7-0 7-0" />
          <g className="bulb-base">
            <rect x="66" y="222" width="68" height="14" rx="5" />
            <rect x="68" y="238" width="64" height="12" rx="5" />
            <rect x="70" y="252" width="60" height="12" rx="5" />
          </g>
        </g>
        <g className="bulb-box">
          <rect x="16" y="214" width="208" height="82" rx="4" />
          <rect className="bulb-box-lid" x="10" y="208" width="220" height="12" rx="3" />
          <path className="bulb-box-grain" d="M24 238q60-6 120 0t72 2M24 262q50 5 100-1t92 3M24 282q70-4 130 1t62-2" />
          <circle className="bulb-box-hole" cx="120" cy="258" r="9" />
        </g>
      </svg>
    </div>
  );
}

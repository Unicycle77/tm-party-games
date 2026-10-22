import { useEffect } from "react";
import { scored, sorted, titleOf } from "../scoreboard/tasks";
import { showConversion } from "../session";
import { Toggle } from "../Toggle";
import type { Session, ShownConversion } from "../types";
import { Converter } from "./Converter";

/** 📏 on the host's phone: the converter, with the party's tasks' units and "Show on the big screen". */
export function ConverterRemote({ code, session }: { code: string; session: Session }) {
  const withUnits = sorted(session.scoreboard?.tasks).map(([id, t], i) => ({ id, unit: t.unit!, place: i + 1, title: titleOf(t), scored: scored(t) }))
    .filter((t) => t.unit);
  return <Converter system={session.units} withUnits={withUnits} footer={(said) => <BigScreen code={code} session={session} said={said} />} />;
}

function BigScreen({ code, session, said }: { code: string; session: Session; said: ShownConversion | undefined }) {
  // While it's on the big screen, the big screen follows the host's result.
  const onScreen = !!session.conversion;
  useEffect(() => {
    if (onScreen && said && (said.main !== session.conversion?.main || said.lead !== session.conversion?.lead)) void showConversion(code, said);
  }, [onScreen, said?.lead, said?.main]);
  return (
    <div className="toggles">
      <Toggle label="Show on the big screen" on={onScreen} disabled={!said && !onScreen}
        onChange={(on) => void showConversion(code, on && said ? said : null)} />
    </div>
  );
}

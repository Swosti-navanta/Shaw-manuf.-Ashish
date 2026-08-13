"use client";

import { useSchedule } from "@/context/ScheduleContext";
import DrillLink from "@/components/ui/DrillLink";

/**
 * The one thing left under the board: why a sequence fails.
 *
 * It used to carry a "Selected · Earlier / Later / Clear" strip and the
 * draft / Re-release pair as well. Both moved to where their subject already
 * lives — the run's own card, and the card header that states whether the
 * sequence is released. What was left each time was a toolbar acting at a
 * distance on something that could hold the control itself.
 *
 * Renders nothing while the board holds: the Sawyer brief beside it already
 * says "Sequence holds · changeover $X", and a banner repeating that is noise.
 * What the brief can't carry is the *reason* a sequence fails, so that stays
 * here, next to the board that caused it.
 */
export default function BoardControls() {
  const { verdict } = useSchedule();

  const showVerdict = verdict.level === "bad";
  if (!showVerdict) return null;

  return (
    <div className="flex flex-col" style={{ gap: 12, paddingTop: 14 }}>
      {showVerdict && (
        <div
          className="flex items-center flex-wrap"
          style={{
            gap: 10,
            borderRadius: 11,
            padding: "11px 14px",
            background: "var(--surface-danger)",
            border: "1px solid var(--border-danger, #FDA29B)",
          }}
        >
          <span className="type-caption" style={{ fontWeight: 600, color: "var(--text-danger)" }}>
            Breaks a rule
          </span>
          <span
            className="type-caption"
            style={{ color: "var(--ds-text-secondary)", flex: 1, minWidth: 200 }}
          >
            <strong style={{ color: "var(--ds-text-primary)", fontWeight: 600 }}>
              Sawyer&apos;s check:
            </strong>{" "}
            <VerdictMessage message={verdict.message} />
          </span>
          <span
            style={{
              fontSize: 12,
              whiteSpace: "nowrap",
              color: "var(--ds-text-primary)",
            }}
          >
            changeover ${verdict.changeover.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

/** The verdict names a claim when it cites one — keep it drillable so the
 *  history behind the warning is one click away. */
function VerdictMessage({ message }: { message: string }) {
  const claim = message.match(/CLM-\d+/)?.[0];
  if (!claim) return <>{message}</>;
  const [before] = message.split(claim);
  return (
    <>
      {before}
      <DrillLink kind="claim" id={claim} />.
    </>
  );
}

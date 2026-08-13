"use client";

import { AiStar } from "@navanta-ai/design-system";
import { useSchedule } from "@/context/ScheduleContext";
import DrillLink from "@/components/ui/DrillLink";

/**
 * The rules the schedule respects. Rules Wren sends up from a claim pattern
 * render highlighted — a rule the system learned from its own field failures
 * is a different kind of object from one somebody configured, and the board
 * should say so.
 */
export default function ConstraintModel() {
  const { rules } = useSchedule();

  return (
    <div className="flex flex-col">
      {rules.map((rule, i) => (
        <div
          key={rule.id}
          className="flex items-center justify-between flex-wrap"
          // Longhands only. A `padding` shorthand followed by a conditional
          // `paddingLeft: undefined` in the same object makes React clear the
          // shorthand's left and right, so every row without the condition
          // rendered flush to the card edge. The negative margin that used to
          // sit here is gone too — the card body has no padding of its own, so
          // the highlighted row already spans full width.
          style={{
            gap: 10,
            paddingTop: 11,
            paddingBottom: 11,
            paddingLeft: 18,
            paddingRight: 18,
            borderTop: i === 0 ? "none" : "1px solid var(--border-light)",
            background: rule.fromQuality ? "var(--lane-auto-bg)" : undefined,
          }}
        >
          <span className="flex items-center flex-wrap" style={{ gap: 8, minWidth: 0 }}>
            {rule.fromQuality && <AiStar size={14} />}
            <span className="type-caption" style={{ color: "var(--ds-text-primary)" }}>
              {rule.text}
            </span>
            {rule.detail && (
              <span
                className="flex items-center"
                style={{
                  gap: 6,
                  fontSize: 10,
                  color: "var(--ds-text-secondary)",
                }}
              >
                {rule.detail.split(" · ").map((claim) => (
                  <DrillLink key={claim} kind="claim" id={claim} />
                ))}
              </span>
            )}
          </span>

          {rule.fromQuality ? (
            <Badge tone="agent">From Wren</Badge>
          ) : (
            <Badge tone={rule.strength === "hard" ? "hard" : "soft"}>{rule.strength}</Badge>
          )}
        </div>
      ))}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "hard" | "soft" | "agent" }) {
  const palette = {
    hard: { bg: "var(--surface-danger)", fg: "var(--text-danger)" },
    soft: { bg: "var(--surface-neutral)", fg: "var(--ds-text-secondary)" },
    agent: { bg: "var(--lane-auto-bd)", fg: "var(--lane-auto-ink)" },
  }[tone];

  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 5,
        whiteSpace: "nowrap",
        background: palette.bg,
        color: palette.fg,
      }}
    >
      {children}
    </span>
  );
}

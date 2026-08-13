"use client";

import { LANE_LABEL, type Lane } from "@/types/run";

const TONE: Record<Lane, { bg: string; ink: string }> = {
  auto: { bg: "var(--lane-auto-bg)", ink: "var(--lane-auto-ink)" },
  limit: { bg: "var(--lane-limit-bg)", ink: "var(--lane-limit-ink)" },
  person: { bg: "var(--lane-person-bg)", ink: "var(--lane-person-ink)" },
};

/**
 * Which lane a decision landed in. Never used decoratively — a LaneChip is a
 * factual claim about whether a person was involved, so the label always
 * comes from `LANE_LABEL` rather than being passed in.
 */
export default function LaneChip({
  lane,
  label,
}: {
  lane: Lane;
  /** Overrides the label only where the state is more specific than the lane
   *  ("Auto-graded", "Graded") — the colour still carries the lane. */
  label?: string;
}) {
  const tone = TONE[lane];
  return (
    <span
      className="inline-flex items-center shrink-0"
      style={{
        gap: 5,
        fontSize: 10,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 5,
        whiteSpace: "nowrap",
        background: tone.bg,
        color: tone.ink,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "currentColor",
          opacity: 0.9,
        }}
      />
      {label ?? LANE_LABEL[lane]}
    </span>
  );
}

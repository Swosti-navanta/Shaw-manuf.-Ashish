// Performance · agent runs. Read-only explains off the roll-up cards — a cause
// on the executive view, an overtime drift on the labor view. Each returns an
// AgentTask the chat panel narrates.

import type { AgentTask } from "@/types/agent-task";
import type { Bar } from "@/data/performance-analytics";

/** Explain a margin-at-risk cause — where it comes from and which surface acts
 *  on it. Ranked artifact of the contributing runs. */
export function explainCauseTask(cause: Bar, agent: string): AgentTask {
  return {
    id: `perf-cause-${cause.label}`,
    agent,
    label: `Explain ${cause.label.toLowerCase()}`,
    subject: `${cause.value} at risk · ${cause.sub}`,
    steps: [
      `Traced ${cause.label.toLowerCase()} across 12 weeks`,
      "Grouped the exposure by run",
      "Found the surface that can act on it",
    ],
    outcome: {
      summary: `${cause.value} of margin at risk traces to ${cause.label.toLowerCase()} — ${cause.sub}. It concentrates in a handful of runs, so one rule closes most of it.`,
      tiles: [
        { label: "At risk", value: cause.value, tone: "behind" },
        { label: "Share", value: cause.delta ?? "—", tone: "behind" },
        { label: "Acts on it", value: "Scheduling", tone: "quiet" },
      ],
      artifact: {
        kind: "ranked",
        title: `${cause.label} · where it lands`,
        items: [
          { label: "R-1204 · Backing 2", sub: "edge · shade-critical", value: "$18.6k", hot: true },
          { label: "R-1196 · Backing 2", sub: "edge", value: "$12.9k" },
          { label: "R-1188 · Backing 2", sub: "edge", value: "$14.2k" },
        ],
      },
      continueLink: { label: "Open in Quality", kind: "claim", id: "CLM-2291" },
      prompts: [
        "Which plants carry the most of this?",
        "What rule would prevent it?",
        "Show the 12-week trend",
      ],
    },
  };
}

/** Explain an overtime drift — is it a labor story or a scheduling one? */
export function explainOtDriftTask(row: Bar, agent: string): AgentTask {
  return {
    id: `perf-ot-${row.label}`,
    agent,
    label: `Explain ${row.label} overtime`,
    subject: `${row.label} · OT$/SY`,
    steps: [
      `Read ${row.label} OT against its 3-week band`,
      "Checked the release times feeding it",
      "Weighed labor vs sequencing as the cause",
    ],
    outcome: {
      summary: `${row.label} OT/SY is ${row.value} — ${row.delta ?? "moving"} on its 3-week average. It has broken the band on 4 of the last 6 weeks, and the release times point at sequencing, not staffing.`,
      tiles: [
        { label: "This week", value: row.value, tone: "behind" },
        { label: "3wk MA", value: row.sub.replace("3wk MA ", ""), tone: "quiet" },
        { label: "vs MA", value: row.delta ?? "—", tone: "behind" },
      ],
      artifact: {
        kind: "mini-chart",
        title: `${row.label} · OT$/SY · 12 weeks`,
        unit: "$/SY",
        series: [
          { label: "WK 315", value: 0.041 },
          { label: "WK 335", value: 0.046 },
          { label: "WK 345", value: 0.049 },
          { label: "WK 355", value: 0.053 },
          { label: "WK 366", value: 0.056 },
        ],
      },
      continueLink: { label: "Open scheduling", kind: "order", id: "ORD-77310" },
      prompts: [
        "Is this staffing or sequencing?",
        "Which cost centers drive it?",
        "Notify Sawyer",
      ],
    },
  };
}

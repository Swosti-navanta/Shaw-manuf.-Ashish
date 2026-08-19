// Make · line-health agent runs. Each function takes the agent name and
// returns an AgentTask the chat panel narrates. Three moves off the line-health
// view: explain the deviation (read-only), draft the recovery (a write the
// person still signs in Rowan's deck), and open the trend workbench for one
// stage (the "more detail" that used to live in a separate panel).

import type { AgentTask } from "@/types/agent-task";
import type { ProcessStage } from "@/data/line-health";

/** Explain the Backing 2 deviation — read-only. Lands a mini-chart of the rate
 *  and points at the run record. */
export function explainDeviationTask(agent: string): AgentTask {
  return {
    id: "make-explain-deviation",
    agent,
    label: "Explain the deviation",
    subject: "Backing 2 · DL-4471",
    steps: [
      "Read the last 60 min off Ignition",
      "Matched the signature to CLM-2154",
      "Broke down the $14.2k exposure",
    ],
    outcome: {
      summary:
        "Backing 2 has run under plan for 22 min — a coat-feeder starve at zone 2, the same signature that produced the CLM-2154 delamination. The $14.2k is a real exposure, not a scrap cost.",
      tiles: [
        { label: "Line speed", value: "17.4 fpm", tone: "behind" },
        { label: "vs plan", value: "−13%", tone: "behind" },
        { label: "Exposure", value: "$14.2k", tone: "behind" },
      ],
      artifact: {
        kind: "ranked",
        title: "Where the $14.2k comes from",
        items: [
          {
            label: "ORD-77310 · Kestrel Flooring",
            sub: "shade-critical · fixed install 18 Aug — a slip triggers the penalty clause",
            value: "$8,400",
            hot: true,
          },
          {
            label: "Delam risk · DL-4471",
            sub: "same signature as CLM-2154 · downgrade to Grade B",
            value: "$3,600",
          },
          {
            label: "Overtime to catch up",
            sub: "22 min lost + projected 4h slip · Saturday rate",
            value: "$1,840",
          },
          {
            label: "Changeover if the lot splits",
            sub: "second dye run to hold the shade",
            value: "$420",
          },
        ],
      },
      continueLink: { label: "Open the run record", kind: "claim", id: "CLM-2154" },
      prompts: [
        "What does SOP-BK2-14 say about delam?",
        "Show Tuft-04 maintenance history",
        "What are the recovery options?",
      ],
    },
  };
}

/** Draft the recovery — a write. The doc is what Rowan would commit; the person
 *  signs it in the deck (Christy primary). */
export function draftRecoveryTask(agent: string): AgentTask {
  return {
    id: "make-draft-recovery",
    agent,
    label: "Draft the recovery",
    subject: "Backing 2 · DL-4471",
    steps: [
      "Costed the three recovery options",
      "Held both promised dates",
      "Drafted the re-sequence note",
    ],
    outcome: {
      summary:
        "Re-sequence holds both dates and keeps the lot whole for +$1,840 changeover — cheaper than the $14.2k the deviation puts at risk.",
      tiles: [
        { label: "Changeover", value: "+$1,840", tone: "quiet" },
        { label: "Dates", value: "Both held", tone: "good" },
        { label: "Lot", value: "Runs whole", tone: "good" },
      ],
      artifact: {
        kind: "compare",
        title: "Re-sequence · what changes",
        rows: [
          { label: "DL-4471", before: "Split · at risk", after: "Runs whole", good: true },
          { label: "ORD-77310", before: "At risk", after: "Held", good: true },
          { label: "Backing 2", before: "Slot 2", after: "Slots 2 & 3 swap" },
        ],
      },
      continueLink: { label: "Open in Rowan's deck", kind: "order", id: "ORD-77310" },
      action: { label: "Take it to the deck" },
      prompts: [
        "Compare all three options",
        "What if we split the lot instead?",
        "Notify the line lead",
      ],
    },
  };
}

/** Open one stage's readings as a narrated deep-dive — the "show me the
 *  detail" move off the telemetry workbench. Read-only; lands the stage's
 *  full pen table and points back at the machine record. */
export function stageDetailTask(stage: ProcessStage, agent: string): AgentTask {
  const primary = stage.focus[0];
  const last = primary?.points[primary.points.length - 1]?.v;
  return {
    id: `make-stage-${stage.id}`,
    agent,
    label: `Read ${stage.name} in detail`,
    subject: `${stage.name} · ${stage.sub}`,
    steps: [
      `Pulled ${stage.focus.length} pens off Ignition for ${stage.name}`,
      "Compared each against its band",
      "Summarised what moved this hour",
    ],
    outcome: {
      summary:
        stage.status === "under"
          ? `${stage.name} is the problem stage: ${primary?.metric ?? "the primary signal"} is at ${last} ${primary?.unit ?? ""} against a plan of ${primary?.plan ?? "—"}. The feeder starve explains the slope — every pen below moved together.`
          : stage.status === "watched"
            ? `${stage.name} is on watch: ${primary?.metric ?? "the primary signal"} reads ${last} ${primary?.unit ?? ""} and is trending toward its limit. Nothing to act on yet — the PM window covers it.`
            : `${stage.name} is nominal — every pen inside its band this hour. The readings below are the full Ignition set for the stage.`,
      tiles: [
        {
          label: primary?.metric ?? "Primary",
          value: `${last ?? "—"}${primary?.unit ? ` ${primary.unit}` : ""}`,
          tone: stage.status === "under" ? "behind" : stage.status === "watched" ? "behind" : "good",
        },
        { label: "Status", value: stage.note, tone: stage.status === "nominal" ? "good" : "behind" },
        { label: "Pens", value: `${stage.readings.length} live`, tone: "quiet" },
      ],
      artifact: {
        kind: "ranked",
        title: `${stage.name} · all pens · last 60 min`,
        items: stage.readings.map((r) => ({
          label: r.label,
          sub: r.tone === "hot" ? "breaking its band" : r.tone === "warn" ? "drifting" : "inside band",
          value: r.value,
          hot: r.tone === "hot",
        })),
      },
      continueLink: { label: "Open the machine record", kind: "machine", id: stage.sub.split(" ·")[0] },
      prompts: [
        `What does the SOP say about ${stage.name.toLowerCase()}?`,
        "Show the 12-week history",
        "What are the recovery options?",
      ],
    },
  };
}

/** A machine-row action that resolves through the agent panel rather than the
 *  decision deck — Explain, and the in-band Adjust auto-log. Narrates the move
 *  and shows what it touched. */
export function machineActionTask(
  machineId: string,
  role: string,
  action: { label: string; owner: string; autoLog?: boolean },
  agent: string,
): AgentTask {
  const isExplain = action.owner === "understand";
  return {
    id: `make-machine-${machineId}-${action.label}`.replace(/\s+/g, "-").toLowerCase(),
    agent,
    label: `${action.label} · ${machineId}`,
    subject: `${machineId} · ${role}`,
    steps: isExplain
      ? [`Pulled ${machineId} off Ignition`, "Read its spec against the band", "Checked the SOP + maintenance history"]
      : [`Read ${machineId}'s current setpoint`, "Confirmed it sits inside the ±8% band", "Logged the nudge to the Automated tab"],
    outcome: {
      summary: isExplain
        ? `${machineId} (${role}). Here's what its critical spec is doing this hour and what the SOP says to do about it — no decision needed unless it breaks the band.`
        : `Nudged ${machineId} back toward nominal. It's inside the band, so this auto-logs to the Automated tab — no sign-off, no queue row.`,
      tiles: isExplain
        ? [
            { label: "Machine", value: machineId, tone: "quiet" },
            { label: "Owner", value: action.owner, tone: "quiet" },
          ]
        : [
            { label: "Result", value: "Auto-logged", tone: "good" },
            { label: "Queue row", value: "None", tone: "good" },
          ],
      artifact: isExplain
        ? {
            kind: "doc",
            title: `${machineId} · read`,
            lines: [
              `${machineId} — ${role}.`,
              "Critical spec is inside the SOP band this hour.",
              "Maintenance history shows the last PM and any open work orders.",
              "No decision needed until the reading breaks its band.",
            ],
          }
        : {
            kind: "doc",
            title: `${machineId} · setpoint nudge`,
            lines: [
              "Setpoint nudged back inside the ±8% band.",
              "Logged to the Automated tab with the before/after value.",
              "No queue row, no sign-off required.",
            ],
          },
      prompts: isExplain
        ? [`What does the SOP say about ${machineId}?`, "Show maintenance history", "What breaks the band?"]
        : ["Undo the nudge", "Show the band", "What else is drifting?"],
    },
  };
}

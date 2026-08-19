// What Make is actually a list of: decisions the engine has prepared, and
// which of them still need a person.
//
// The surface is a queue, not a dashboard. Everything else — the rate chart,
// the activity feed, the genealogy, machine health — is evidence, and evidence
// belongs to the thing it is evidence *about*: a decision, or an entity you
// can drill into. Nothing floats on the page on its own.

import type { DetailKind, Lane } from "@/types/run";

export type ActionKind = "resequence" | "grade" | "workorder" | "drift" | "report";

/**
 * What kind of problem this is. A queue mixing rate, quality and maintenance
 * needs the category as a column — it's how you scan for "anything on the
 * machines?" without reading five sentences.
 */
export type ActionCategory = "Rate" | "Quality" | "Maintenance" | "Reporting";

export const CATEGORY_OF: Record<ActionKind, ActionCategory> = {
  resequence: "Rate",
  drift: "Rate",
  grade: "Quality",
  workorder: "Maintenance",
  report: "Reporting",
};

export interface MakeAction {
  id: string;
  kind: ActionKind;
  /**
   * What happened, stated neutrally. NOT what to do — that's the agent's
   * recommendation, and keeping the two apart is what lets a person disagree
   * with the advice without losing the fact.
   *
   * Reads as a caption under the subject id, so it never restates it: the
   * row already says which roll, and repeating it costs the only line that
   * could have said something new.
   */
  title: string;
  /** One line on why it's here. */
  detail: string;
  /** The thing the action is about — drills into its own record. */
  subject: { label: string; kind: DetailKind; id: string };
  /** Which lane it landed in. `person` rows are the queue's reason to exist. */
  lane: Lane;
  /** The agent that raised it. */
  agent: string;
  /**
   * What the agent would do about it, as two short lines for the
   * recommendation column — the IRIS Iris Insight pattern. Concise on
   * purpose: it has to be scannable down the column, and `detail` already
   * carries the prose.
   */
  insight: { headline: string; detail: string };
  /** What it costs or protects, as shown in the table. */
  impact: string;
  /** Red when the impact is a loss rather than a spend. */
  impactBad?: boolean;
  /** When it happened / was raised. */
  at: string;
  /** Only the re-sequence carries three costed options. Every action opens a
   *  deck regardless — the deck's contents vary by kind, not its existence. */
  hasOptions?: boolean;
}

/**
 * Rowan's queue on Plant 12 — the run against the released plan, and the
 * machines under it.
 *
 * Grading is deliberately absent. It's Wren's, it lives on `/quality`, and a
 * row here could only have bounced you there: a row that can't be resolved
 * where it sits shouldn't be a row. `/overview` is what spans the agents.
 */
export const MAKE_ACTIONS: ReadonlyArray<MakeAction> = [
  {
    id: "act-reseq",
    kind: "resequence",
    title: "Backing 2 running 12% under plan",
    detail:
      "Backing 2 is 12% under plan. Every recovery either moves a promised date or splits a shade-critical lot.",
    subject: { label: "DL-4471", kind: "dyelot", id: "DL-4471" },
    lane: "person",
    agent: "Rowan",
    insight: { headline: "Re-sequence · run DL-4471 whole", detail: "+$1,840 · holds both dates" },
    impact: "+5h 10m finish",
    impactBad: true,
    at: "06:44",
    hasOptions: true,
  },
  {
    id: "act-wo",
    kind: "workorder",
    title: "Machine running rougher than usual",
    detail:
      "Running twice as rough as its normal, with PM already due in 3 days. Held at the limit set for this plant.",
    subject: { label: "Backing 2", kind: "machine", id: "Backing 2" },
    lane: "limit",
    agent: "Rowan",
    insight: { headline: "Create the work order now", detail: "ahead of the PM in 3 days" },
    impact: "PM due in 3 days",
    at: "06:41",
  },
  {
    id: "act-wo-2",
    kind: "workorder",
    title: "Bearing temp trending up",
    detail: "Card 4 bearing 68 °C vs 55 °C baseline — inside limit, worth eyes on it.",
    subject: { label: "Card 4", kind: "machine", id: "Card 4" },
    lane: "person",
    agent: "Rowan",
    insight: { headline: "Raise a check-in ticket", detail: "before next PM window" },
    impact: "Watch item",
    at: "06:30",
  },
  {
    id: "act-drift",
    kind: "drift",
    title: "Rate drift inside the alert band",
    detail: "Tufting 3 wobbled within ±8% of plan. Recorded, nobody interrupted.",
    subject: { label: "Tufting 3", kind: "machine", id: "Tufting 3" },
    lane: "auto",
    agent: "Rowan",
    insight: { headline: "Logged, nobody interrupted", detail: "inside the ±8% band" },
    impact: "No action",
    at: "05:20",
  },
  {
    id: "act-report",
    kind: "report",
    title: "Handover & downtime reports due",
    detail: "Assembled from the run record — nobody writes these.",
    subject: { label: "Shift A", kind: "batch", id: "B-88214" },
    lane: "auto",
    agent: "Rowan",
    insight: { headline: "Built and sent", detail: "nobody assembled these" },
    impact: "4 reports",
    at: "06:00",
  },
];

/** "Resolved", not "Approved": nobody approves a logged drift or a built
 *  report. What they have in common is that they're done — and *who* finished
 *  them (the engine, or a person) is a column, not a tab. */
export const LANE_TAB: Record<"person" | "auto", string> = {
  person: "Needs you",
  auto: "Resolved",
};

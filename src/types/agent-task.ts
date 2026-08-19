// The scoped agent-chat contract. A row-level action (or a card CTA) fires a
// `startTask(AgentTask)` — the chat panel narrates a short run, then renders an
// outcome card: figure tiles, one artifact, a Continue link into the record it
// landed against, and follow-up prompt chips.
//
// One task shape, four artifact kinds. A new move picks the artifact that fits
// (a doc for anything written, a compare for before/after, a ranked list for a
// shortlist, a mini-chart for a trend) rather than inventing a new shape.

import type { DetailKind } from "@/types/run";

/** A figure tile on the outcome card. `tone` colours the value. */
export interface FlowTile {
  label: string;
  value: string;
  tone?: "good" | "behind" | "quiet";
}

/** Anything the agent wrote — a rule, a work order, a note. */
export interface DocArtifact {
  kind: "doc";
  title: string;
  lines: ReadonlyArray<string>;
}
/** Before → after, for a change. */
export interface CompareArtifact {
  kind: "compare";
  title: string;
  rows: ReadonlyArray<{ label: string; before: string; after: string; good?: boolean }>;
}
/** A shortlist or scorecard. */
export interface RankedArtifact {
  kind: "ranked";
  title: string;
  items: ReadonlyArray<{ label: string; sub?: string; value: string; hot?: boolean }>;
}
/** A trend, plotted small. */
export interface MiniChartArtifact {
  kind: "mini-chart";
  title: string;
  unit?: string;
  series: ReadonlyArray<{ label: string; value: number }>;
}

export type FlowArtifact = DocArtifact | CompareArtifact | RankedArtifact | MiniChartArtifact;

export interface AgentTask {
  id: string;
  /** The agent running it — "Rowan", "Wren", … */
  agent: string;
  /** CTA / run title, e.g. "Explain the deviation". */
  label: string;
  /** What it's about, e.g. "Backing 2 · DL-4471". */
  subject: string;
  /** 2–3 sentence-fragment narration steps: "Read the run · Weighed the options · Drafted the note". */
  steps: ReadonlyArray<string>;
  outcome: {
    /** One-line result. */
    summary: string;
    tiles: ReadonlyArray<FlowTile>;
    artifact: FlowArtifact;
    /** Deep link into the record the run landed against. */
    continueLink?: { label: string; kind: DetailKind; id: string };
    /** Follow-up prompts docked above the composer. */
    prompts: ReadonlyArray<string>;
    /** Optional make-the-write button (Christy primary) inside the outcome. */
    action?: { label: string };
  };
}

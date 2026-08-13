// The Quality (Wren) domain: rolls coming off end of line, and the field
// claims that trace back to how they were made.
//
// Two jobs on two clocks. Grading is this shift's work — a roll is on a
// trolley waiting for a call. A claim is weeks old and the question is which
// decision caused it. They share a vocabulary but not a queue, which is why
// they're separate surfaces.

import type { Measurement } from "@/types/run";

export type Grade = "first" | "second" | "hold";

export const GRADE_LABEL: Record<Grade, string> = {
  first: "First quality",
  second: "Second — route to outlet",
  hold: "Hold the batch",
};

export interface RollRow {
  id: string;
  batch: string;
  dyeLot: string;
  /** Linear yards on the roll — the quantity the margin gap applies to. */
  qty: number;
  /** The reading that decides it, against its tolerance. `swatch` is set only
   *  on colour readings — a ΔE is a colour difference, so showing the two
   *  colours is more legible than the number alone. Orientation, not evidence:
   *  an sRGB chip on an uncalibrated monitor can't settle a shade call. */
  measured: {
    label: string;
    actual: string;
    tolerance: string;
    pass: boolean;
    swatch?: { standard: string; actual: string };
  };
  /** Margin exposed if it's downgraded. Zero when it passes clean. */
  atRisk: number;
  /** Set once graded — by the engine or by a person. */
  graded?: Grade;
  /** Null while it needs a person. */
  gradedBy?: { name: string; agent: boolean };
  /** Why this one reached a person rather than being auto-graded. */
  escalation?: string;
  /** Wren's read, two short lines for the recommendation column. */
  insight: { headline: string; detail: string };
  /** The full inspection panel for this roll. Per-roll rather than shared,
   *  because a deck that shows one roll's headline reading over another
   *  roll's panel is worse than showing nothing. */
  inspection: ReadonlyArray<Measurement>;
  /** Which grade Wren argues for. Drives which button is primary in the deck —
   *  the recommendation has to be the easy one to take, or it isn't one. */
  recommends: Grade;
  at: string;
}

/** End of line on Plant 12 this shift. Two clean passes the engine graded
 *  itself, and three it refused to — for three different reasons. Volume isn't
 *  the point of this queue; the *kinds* of thing an engine won't settle are. */
export const ROLLS: ReadonlyArray<RollRow> = [
  {
    id: "R-11202",
    batch: "B-88214",
    dyeLot: "DL-4471",
    qty: 152,
    measured: {
      label: "Shade ΔE", actual: "1.4", tolerance: "≤ 2.5", pass: true,
      swatch: { standard: "#B9AD97", actual: "#B7AB96" },
    },
    atRisk: 0,
    graded: "first",
    gradedBy: { name: "Wren", agent: true },
    insight: { headline: "Clean pass — graded first", detail: "every reading inside spec" },
    recommends: "first",
    inspection: [
      { metric: "Shade ΔE", spec: "≤ 2.5", actual: "1.4", pass: true },
      { metric: "Streaking", spec: "None", actual: "None", pass: true },
      { metric: "Width", spec: "12′0″ ±0.5″", actual: "12′0.2″", pass: true },
      { metric: "Pile height", spec: "0.28″ ±0.02", actual: "0.279″", pass: true },
      { metric: "Tuft bind", spec: "≥ 8.0 lb", actual: "8.6 lb", pass: true },
    ],
    at: "06:12",
  },
  {
    id: "R-11203",
    batch: "B-88214",
    dyeLot: "DL-4471",
    qty: 149,
    measured: {
      label: "Shade ΔE", actual: "1.9", tolerance: "≤ 2.5", pass: true,
      swatch: { standard: "#B9AD97", actual: "#B5A891" },
    },
    atRisk: 0,
    graded: "first",
    gradedBy: { name: "Wren", agent: true },
    insight: { headline: "Clean pass — graded first", detail: "every reading inside spec" },
    recommends: "first",
    inspection: [
      { metric: "Shade ΔE", spec: "≤ 2.5", actual: "1.9", pass: true },
      { metric: "Streaking", spec: "None", actual: "None", pass: true },
      { metric: "Width", spec: "12′0″ ±0.5″", actual: "12′0.1″", pass: true },
      { metric: "Pile height", spec: "0.28″ ±0.02", actual: "0.282″", pass: true },
      { metric: "Tuft bind", spec: "≥ 8.0 lb", actual: "8.5 lb", pass: true },
    ],
    at: "06:31",
  },
  {
    id: "R-11204",
    batch: "B-88214",
    dyeLot: "DL-4471",
    qty: 148,
    measured: {
      label: "Shade ΔE", actual: "2.9", tolerance: "≤ 2.5", pass: false,
      swatch: { standard: "#B9AD97", actual: "#AFA286" },
    },
    atRisk: 918,
    escalation: "2nd occurrence this week — a repeat reads as a pattern, not a one-off",
    insight: {
      headline: "Grade as second, route to outlet",
      detail: "$918 margin gap, not scrap",
    },
    recommends: "second",
    inspection: [
      { metric: "Shade ΔE", spec: "≤ 2.5", actual: "2.9", pass: false },
      { metric: "Streaking", spec: "None", actual: "Slight", pass: false },
      { metric: "Width", spec: "12′0″ ±0.5″", actual: "12′0.3″", pass: true },
      { metric: "Pile height", spec: "0.28″ ±0.02", actual: "0.281″", pass: true },
      { metric: "Tuft bind", spec: "≥ 8.0 lb", actual: "8.4 lb", pass: true },
    ],
    at: "06:52",
  },
  {
    // Passes the mill's own tolerance and still can't be auto-graded, because
    // the customer bought a tighter one. The engine knows the contract; the
    // call it forces is commercial, not technical.
    id: "R-11205",
    batch: "B-88214",
    dyeLot: "DL-4471",
    qty: 205,
    measured: { label: "Pile height", actual: "0.297 in", tolerance: "0.260–0.300", pass: true },
    atRisk: 1271,
    escalation:
      "Inside Shaw's tolerance but outside Halloran Contract's — they hold 0.285 in ±0.008. Which spec applies is a commercial call.",
    insight: {
      headline: "Grade first, but re-allocate off this order",
      detail: "meets mill spec, misses Halloran's",
    },
    recommends: "first",
    inspection: [
      { metric: "Pile height (Shaw std)", spec: "0.28″ ±0.02", actual: "0.297″", pass: true },
      { metric: "Pile height (Halloran)", spec: "0.285″ ±0.008", actual: "0.297″", pass: false },
      { metric: "Shade ΔE", spec: "≤ 2.5", actual: "1.6", pass: true },
      { metric: "Width", spec: "12′0″ ±0.5″", actual: "12′0.2″", pass: true },
      { metric: "Tuft bind", spec: "≥ 8.0 lb", actual: "8.3 lb", pass: true },
    ],
    at: "07:14",
  },
  {
    // Two instruments disagreeing is the one thing an engine should never
    // resolve on its own — a confident grade here would be a guess wearing a
    // number. Wren asks for eyes instead.
    id: "R-11206",
    batch: "B-88215",
    dyeLot: "DL-4471",
    qty: 176,
    measured: { label: "Streak index", actual: "4.1", tolerance: "≤ 3.0", pass: false },
    atRisk: 1091,
    escalation:
      "The camera flags a band across the width that the lab readings don't see. Two instruments disagree, so Wren won't grade it.",
    insight: {
      headline: "Hold the batch for a physical look",
      detail: "vision and lab disagree",
    },
    recommends: "hold",
    inspection: [
      { metric: "Streak index (vision)", spec: "≤ 3.0", actual: "4.1", pass: false },
      { metric: "Band check (lab)", spec: "None", actual: "None found", pass: true },
      { metric: "Shade ΔE", spec: "≤ 2.5", actual: "1.8", pass: true },
      { metric: "Width", spec: "12′0″ ±0.5″", actual: "12′0.1″", pass: true },
      { metric: "Tuft bind", spec: "≥ 8.0 lb", actual: "8.7 lb", pass: true },
    ],
    at: "07:36",
  },
];

export interface ClaimRow {
  id: string;
  month: string;
  customer: string;
  /** The chain back to the run that caused it. */
  rolls: string;
  batch: string;
  dyeLot: string;
  /** Credit plus the seconds downgrade. */
  cost: number;
  cause: string;
  /** True once the finding has been sent to Sawyer. */
  sent?: boolean;
}

/** Three claims, four months, one cause. The pattern is the point: a single
 *  claim is bad luck, three of the same is a process. */
export const CLAIMS_QUEUE: ReadonlyArray<ClaimRow> = [
  {
    id: "CLM-2291",
    month: "Jun 2026",
    customer: "Kestrel Flooring",
    rolls: "R-11198 / R-11199",
    batch: "B-88209",
    dyeLot: "DL-4102",
    cost: 18400,
    cause: "Split lot — two dye runs did not shade-match",
  },
  {
    id: "CLM-2205",
    month: "May 2026",
    customer: "Brightwater Interiors",
    rolls: "R-10877",
    batch: "B-88144",
    dyeLot: "DL-3980",
    cost: 12900,
    cause: "Split-lot shade mismatch",
  },
  {
    id: "CLM-2154",
    month: "Apr 2026",
    customer: "Halloran Contract",
    rolls: "R-10620",
    batch: "B-88061",
    dyeLot: "DL-3854",
    cost: 9900,
    cause: "Split-lot shade mismatch",
  },
];

/** The margin bridge that opens the Quality page. The headline number is only
 *  interesting because a named share of it traces to one decision. */
export interface BridgeSegment {
  label: string;
  value: number;
  /** The share that traces to a scheduling decision — the only segment that
   *  carries colour, because it's the only one Quality can act on. */
  linked?: boolean;
}

export const MARGIN_BRIDGE: {
  total: number;
  fromSequencing: number;
  breakdown: ReadonlyArray<BridgeSegment>;
} = {
  total: 41200,
  fromSequencing: 18400,
  breakdown: [
    { label: "From the split decision", value: 18400, linked: true },
    { label: "Shade / process (other)", value: 14600 },
    { label: "Build & edge faults", value: 8200 },
  ],
};

// The Yarn (Sable) domain: how a dye lot is sized, what recipe hits the
// standard, and what order the creel runs in.
//
// Sable is the only agent that proposes something a person has to *sign* rather
// than merely settle. A grade is a judgement about product that already exists;
// a dye formula is an instruction for product that doesn't yet. Approving one
// commits fibre, tank time and a shade that a whole order will be held to — so
// the queue here is approvals, and nothing on it is auto-resolved by default.

/** Where an approval stands. Unlike a grade, there is no "auto" — Sable never
 *  signs its own recipe. */
export type ApprovalState = "pending" | "approved" | "returned";

export type ApprovalKind = "formula" | "sequence" | "sizing";

export const APPROVAL_LABEL: Record<ApprovalKind, string> = {
  formula: "Dye formula",
  sequence: "Creel sequence",
  sizing: "Lot sizing",
};

/** One line of a dye recipe: a dyestuff and how much of it, against what the
 *  standard called for. `delta` is what changed and why it isn't noise. */
export interface FormulaLine {
  dyestuff: string;
  standard: string;
  proposed: string;
  /** Null when the line is unchanged — most of a revision is unchanged, and
   *  showing that is what makes the changed lines readable. */
  delta?: string;
}

/** One stage in the lot chain. `note` is what makes the stage worth rendering
 *  — an id alone tells you nothing you couldn't read off the row. */
export interface GenealogyNode {
  id: string;
  note: string;
}

export interface ApprovalRow {
  id: string;
  kind: ApprovalKind;
  /** What is being approved — the dye lot, the creel, the lot being sized. */
  subject: { id: string; label: string; kind: "dyelot" | "yarn" };
  /** One neutral line: what Sable did, not what it wants. */
  title: string;
  /** The yarn lot the proposal is built from. */
  yarnLot: string;
  /** The poundage riding on it. Its own field rather than part of a caption:
   *  a quantity that shares a line with a scope and a timestamp can't be
   *  compared down the column, which is the only reason to show it. */
  qty: string;
  /** What that quantity serves — orders, lots, or the part that is spare. */
  covers: string;
  /** What it saves or protects if approved, as money. */
  value: number;
  /** Why it needs a person rather than running. */
  escalation: string;
  /** Sable's read, two short lines for the recommendation column. */
  insight: { headline: string; detail: string };
  /** The lot chain this proposal sits on. Per-approval rather than one panel
   *  on the page: each proposal is built from a different yarn lot, and a
   *  single chain shown page-level would be true of only one of them.
   *  `batch` is absent when nothing has run yet — which is most of Sable's
   *  work, since it proposes for product that doesn't exist. */
  genealogy: {
    yarn: GenealogyNode;
    dyeLot: GenealogyNode;
    batch?: GenealogyNode;
  };
  /** Formula rows — set on `formula` approvals only. */
  formula?: ReadonlyArray<FormulaLine>;
  /** What Sable checked before proposing. Every approval has one; it is the
   *  difference between a recommendation and a guess. */
  checks: ReadonlyArray<{ label: string; result: string; pass: boolean }>;
  at: string;
}

/** Three approvals waiting on Priya this week. Different *kinds* of commitment
 *  on purpose — a recipe, a run order, and a quantity — because that is the
 *  spread of things Sable can propose but must not sign. */
export const APPROVALS: ReadonlyArray<ApprovalRow> = [
  {
    id: "AP-3312",
    kind: "formula",
    subject: { id: "DL-4471", label: "DL-4471 · Cascade", kind: "dyelot" },
    title: "Yarn lot came in off-shade; formula recalculated to hit standard",
    yarnLot: "Y-30918",
    qty: "1,840 lb",
    covers: "2 orders",
    value: 4200,
    escalation:
      "A recipe change is a commitment, not a correction — every yard of both orders is held to the shade it produces.",
    insight: {
      headline: "Approve the revision — it lands inside ΔE 1.0 of standard",
      detail: "3 of 11 dyestuffs changed",
    },
    genealogy: {
      yarn: { id: "Y-30918", note: "Supplier draw B · 2,400 lb received" },
      dyeLot: { id: "DL-4471", note: "Cascade · 1,840 lb committed" },
      batch: { id: "B-88214", note: "3 rolls · 449 lin yd off the line" },
    },
    formula: [
      { dyestuff: "Yellow 4G", standard: "0.412%", proposed: "0.448%", delta: "+0.036" },
      { dyestuff: "Red 3BN", standard: "0.187%", proposed: "0.171%", delta: "−0.016" },
      { dyestuff: "Blue 2R", standard: "0.094%", proposed: "0.101%", delta: "+0.007" },
      { dyestuff: "Levelling agent", standard: "1.20%", proposed: "1.20%" },
      { dyestuff: "Acid buffer", standard: "0.80%", proposed: "0.80%" },
    ],
    checks: [
      { label: "Predicted ΔE vs standard", result: "0.8 · tol ≤ 1.0", pass: true },
      { label: "Lab dip", result: "passed on 2nd submit", pass: true },
      { label: "Crock fastness", result: "4–5 · unchanged", pass: true },
      { label: "Cost per lb", result: "+$0.02 · within tolerance", pass: true },
      { label: "Substrate match", result: "Y-30918 is a different draw", pass: false },
    ],
    at: "06:42",
  },
  {
    id: "AP-3313",
    kind: "sequence",
    subject: { id: "Y-30918", label: "Creel · week 33", kind: "yarn" },
    title: "Week 33 run order breaks light → dark once to hold a fixed install",
    yarnLot: "Y-30918",
    qty: "6,100 lb",
    covers: "4 lots",
    value: 2800,
    escalation:
      "The dark → light jump forces a full purge. Sable will not spend that on its own — the alternative is missing ORD-77310's install date.",
    insight: {
      headline: "Approve the break — the purge is cheaper than the miss",
      detail: "$2,800 purge vs a fixed-date order",
    },
    genealogy: {
      yarn: { id: "Y-30918", note: "Supplier draw B · 2,400 lb received" },
      dyeLot: { id: "DL-4471", note: "Cascade · the shade-critical lot" },
      batch: { id: "B-88214", note: "3 rolls · 449 lin yd off the line" },
    },
    checks: [
      { label: "Purges in sequence", result: "2 cheap, 1 full", pass: false },
      { label: "Creel utilisation", result: "92% · +3 pts vs plan", pass: true },
      { label: "Shade-critical lots held whole", result: "1 of 1", pass: true },
      { label: "Fixed-date orders protected", result: "ORD-77310", pass: true },
    ],
    at: "06:55",
  },
  {
    id: "AP-3314",
    kind: "sizing",
    subject: { id: "DL-4482", label: "DL-4482 · Dune", kind: "dyelot" },
    title: "Lot sized above the order to keep a second order on the same shade",
    yarnLot: "Y-31004",
    qty: "2,150 lb",
    covers: "1 order · 300 lb spare",
    value: 1400,
    escalation:
      "Over-sizing trades certain waste for avoided shade risk. Which is worth more is a commercial call, so it isn't Sable's.",
    insight: {
      headline: "Approve the over-size — waste costs less than a re-dye",
      detail: "$310 waste against $1,400 exposure",
    },
    genealogy: {
      yarn: { id: "Y-31004", note: "Supplier draw A · 3,000 lb received" },
      dyeLot: { id: "DL-4482", note: "Dune · 2,150 lb proposed" },
    },
    checks: [
      { label: "Yarn waste if over-sized", result: "300 lb · $310", pass: false },
      { label: "Re-dye exposure if split", result: "$1,400", pass: true },
      { label: "Tank capacity", result: "2,150 lb of 2,400", pass: true },
      { label: "Second order timing", result: "both inside week 33", pass: true },
    ],
    at: "07:20",
  },
];

/* ─── Sable's read ──────────────────────────────────────────────────────── */

export const YARN_KPIS: ReadonlyArray<{
  label: string;
  value: string;
  detail: string;
  alert?: boolean;
}> = [
  { label: "Shade-critical lots", value: "1", detail: "DL-4471 · held whole" },
  { label: "Creel utilisation", value: "92%", detail: "+3 pts vs plan" },
  { label: "Yarn waste", value: "4.1%", detail: "of input" },
  { label: "Changeover purges", value: "2", detail: "light → dark", alert: true },
];

export const WASTE_AVOIDED = 8400;

/* ─── The creel sequence ────────────────────────────────────────────────── */

export interface CreelStop {
  name: string;
  /** The shade, as a swatch. Ordering light → dark is the whole strategy, so
   *  the colours are the argument rather than decoration. */
  colour: string;
  dyeLot?: string;
  /** Set when arriving at this stop costs a purge. */
  purge?: { kind: "cheap" | "full"; cost: number };
}

export const CREEL: ReadonlyArray<CreelStop> = [
  { name: "Aria", colour: "#E8E2D5" },
  { name: "Meridian", colour: "#A8752A", purge: { kind: "cheap", cost: 320 } },
  { name: "Cascade", colour: "#2E2A26", dyeLot: "DL-4471", purge: { kind: "cheap", cost: 410 } },
  { name: "Dune", colour: "#1E7A6B", purge: { kind: "full", cost: 2800 } },
];

/* ─── Whole vs split, quantified ────────────────────────────────────────── */

/** The evidence behind Rowan's Option A vs B — read-only here on purpose.
 *  The decision belongs to Make, where it has a cost and a button; Sable's
 *  page shows the yarn-side numbers that make one option the recommended one.
 *  Two surfaces offering the same decision is how a demo loses a room. */
export const WHOLE_VS_SPLIT: {
  whole: ReadonlyArray<string>;
  split: ReadonlyArray<string>;
} = {
  whole: [
    "Shade holds across both orders",
    "ORD-77310 fixed install protected",
    "Costs one changeover · +$1,840",
    "No claim exposure",
  ],
  split: [
    "Zero changeover · $0",
    "Two dye runs won't shade-match",
    "Last time → claim CLM-2291",
    "Downgrade to seconds · margin gap",
  ],
};

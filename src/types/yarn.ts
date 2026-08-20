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

/** The two things Sable brings for signature, split because they are two
 *  different jobs on two different objects. Allocating a *yarn lot* to the
 *  orders it will serve is a supply decision, made before any colour exists;
 *  approving a *dye lot* is a shade decision, made against a standard. They
 *  share a queue's shape but not its columns, so they are tabs, not filters. */
export type ApprovalTab = "yarn" | "dye" | "approved";

/** A colour chip in front of a lot. The two kinds are drawn differently on
 *  purpose: a yarn lot is undyed fibre — a soft, textured, natural tone — while
 *  a dye lot carries the actual shade it produces. Same size, unmistakably not
 *  the same thing, so a row is never ambiguous about which object it is. */
export interface LotSwatch {
  type: ApprovalTab;
  /** For a yarn lot, the greige/natural tone; for a dye lot, the dyed shade. */
  colour: string;
  /** Yarn lots only: a photo of the cone, chosen to match the tone. Falls back
   *  to a drawn cone if the file is missing, so the row never breaks. */
  image?: string;
}

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
  /** Which queue this sits in. */
  tab: ApprovalTab;
  kind: ApprovalKind;
  /** What is being approved — the dye lot, the creel, the lot being sized. */
  subject: { id: string; label: string; kind: "dyelot" | "yarn" };
  /** The chip in front of the subject — yarn tone or dye shade. */
  swatch: LotSwatch;
  /** Yarn tab only: the fibre grade and how much arrived. */
  grade?: string;
  received?: string;
  /** Dye tab only: predicted shade accuracy against standard. */
  shade?: string;
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
  /** Sable's read, two short lines — shown in the review modal. */
  insight: { headline: string; detail: string };
  /** The compact form the table column shows: the call, how sure Sable is of
   *  it, and the single lab reading that stands behind it (ΔE for a dye lot,
   *  the fibre grade for a yarn lot). The prose in `insight` is the long form. */
  verdict: string;
  confidence: number;
  lab: string;
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
  /** Set on rows the engine settled inside its limits — who signed it, and
   *  which limit made that allowed. A person's name here means they signed. */
  approvedBy?: string;
  approvedRule?: string;
}

/** Three approvals waiting on Priya this week. Different *kinds* of commitment
 *  on purpose — a recipe, a run order, and a quantity — because that is the
 *  spread of things Sable can propose but must not sign. */
export const APPROVALS: ReadonlyArray<ApprovalRow> = [
  /* ── Yarn lot → order ─────────────────────────────────────────────────── */
  {
    id: "AP-3301",
    tab: "yarn",
    kind: "sizing",
    subject: { id: "Y-30918", label: "Y-30918 · Cascade base", kind: "yarn" },
    swatch: { type: "yarn", colour: "#DED7C6", image: "/yarn/cone-ecru.png" },
    grade: "Draw B · 18/1",
    received: "2,400 lb",
    title: "Allocate Y-30918 across two Cascade orders on one draw",
    yarnLot: "Y-30918",
    qty: "1,840 lb",
    covers: "ORD-77310 · ORD-77412",
    value: 4200,
    escalation:
      "Two orders off one draw hold their shade; splitting them across draws is what produced CLM-2291. Committing the draw is the person's call.",
    insight: {
      headline: "Allocate",
      detail: "560 lb spare returns to stock",
    },
    verdict: "Approve",
    confidence: 96,
    lab: "18/1 · in spec",
    genealogy: {
      yarn: { id: "Y-30918", note: "Supplier draw B · 2,400 lb received" },
      dyeLot: { id: "DL-4471", note: "Cascade · 1,840 lb committed" },
    },
    checks: [
      { label: "Single draw", result: "yes · shade holds", pass: true },
      { label: "Both orders inside week 33", result: "yes", pass: true },
      { label: "Spare returned to stock", result: "560 lb", pass: true },
      { label: "Supplier lot certified", result: "COA on file", pass: true },
    ],
    at: "06:20",
  },
  {
    id: "AP-3302",
    tab: "yarn",
    kind: "sizing",
    subject: { id: "Y-31004", label: "Y-31004 · Dune base", kind: "yarn" },
    swatch: { type: "yarn", colour: "#E8E2D5", image: "/yarn/cone-blue.png" },
    grade: "Draw A · 20/1",
    received: "3,000 lb",
    title: "Hold Y-31004 for Dune 240 rather than release it to backlog",
    yarnLot: "Y-31004",
    qty: "2,150 lb",
    covers: "ORD-77468",
    value: 1400,
    escalation:
      "Releasing it to backlog frees the fibre now but risks a second draw for Dune 240 later. Which matters more is a commercial call.",
    insight: {
      headline: "Hold",
      detail: "$310 carry vs $1,400 re-dye exposure",
    },
    verdict: "Hold",
    confidence: 88,
    lab: "20/1 · in spec",
    genealogy: {
      yarn: { id: "Y-31004", note: "Supplier draw A · 3,000 lb received" },
      dyeLot: { id: "DL-4482", note: "Dune · 2,150 lb proposed" },
    },
    checks: [
      { label: "Carry cost", result: "$310 · 1 week", pass: false },
      { label: "Re-dye exposure if released", result: "$1,400", pass: true },
      { label: "Warehouse space", result: "available", pass: true },
    ],
    at: "06:48",
  },
  {
    id: "AP-3303",
    tab: "yarn",
    kind: "sizing",
    subject: { id: "Y-30877", label: "Y-30877 · Aria base", kind: "yarn" },
    swatch: { type: "yarn", colour: "#EFEADD", image: "/yarn/cone-white.png" },
    grade: "Draw C · 18/1",
    received: "1,600 lb",
    title: "Short draw on Y-30877 — allocate to the smaller order only",
    yarnLot: "Y-30877",
    qty: "1,450 lb",
    covers: "ORD-77470",
    value: 900,
    escalation:
      "The draw came in 200 lb short of both orders. One has to wait, and which one is a date call the floor can't make alone.",
    insight: {
      headline: "Assign to ORD-77470",
      detail: "the other order has a week of slack",
    },
    verdict: "Assign",
    confidence: 91,
    lab: "18/1 · 200 lb short",
    genealogy: {
      yarn: { id: "Y-30877", note: "Supplier draw C · 1,600 lb received · 200 short" },
      dyeLot: { id: "DL-4501", note: "Aria · 1,450 lb proposed" },
    },
    checks: [
      { label: "Draw against demand", result: "200 lb short", pass: false },
      { label: "Tighter promised date", result: "ORD-77470 · 26 Aug", pass: true },
      { label: "Slack on the other", result: "7 days", pass: true },
    ],
    at: "07:05",
  },

  /* ── Dye lot → approve ────────────────────────────────────────────────── */
  {
    id: "AP-3312",
    tab: "dye",
    kind: "formula",
    subject: { id: "DL-4471", label: "DL-4471 · Cascade", kind: "dyelot" },
    swatch: { type: "dye", colour: "#3F3F47", image: "/yarn/cone-dye-cascade.png" },
    shade: "ΔE 0.8",
    title: "Yarn lot came in off-shade; formula recalculated to hit standard",
    yarnLot: "Y-31004",
    qty: "1,200 lb",
    covers: "2 orders",
    value: 4200,
    escalation:
      "A recipe change is a commitment, not a correction — every yard of both orders is held to the shade it produces.",
    insight: {
      headline: "Approve — the recipe was recalculated for this draw",
      detail: "3 of 11 dyestuffs changed · both orders held to what it makes",
    },
    verdict: "Approve",
    confidence: 97,
    lab: "ΔE 0.8 · pass",
    genealogy: {
      yarn: { id: "Y-31004", note: "Supplier draw A · 3,000 lb received" },
      dyeLot: { id: "DL-4471", note: "Cascade · 1,200 lb committed" },
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
      { label: "Substrate match", result: "Y-31004 · shared draw A", pass: true },
    ],
    at: "06:42",
  },
  {
    id: "AP-3313",
    tab: "dye",
    kind: "formula",
    subject: { id: "DL-4482", label: "DL-4482 · Dune", kind: "dyelot" },
    swatch: { type: "dye", colour: "#0F766E", image: "/yarn/cone-dye-dune.png" },
    shade: "ΔE 1.3",
    title: "Dune shade drifts warm — teal balance nudged to pull it back",
    yarnLot: "Y-31004",
    qty: "1,050 lb",
    covers: "1 order",
    value: 1400,
    escalation:
      "At ΔE 1.3 it is outside tolerance until the correction; the correction is small but it changes the recipe on record for every future Dune 240.",
    insight: {
      headline: "Approve the correction — the recipe is back on standard",
      detail: "warm drift pulled back · passed on 1st resubmit",
    },
    verdict: "Approve",
    confidence: 92,
    lab: "ΔE 0.9 · pass",
    genealogy: {
      yarn: { id: "Y-31004", note: "Supplier draw A · 3,000 lb received" },
      dyeLot: { id: "DL-4482", note: "Dune · 1,050 lb proposed" },
    },
    formula: [
      { dyestuff: "Blue 2R", standard: "0.204%", proposed: "0.221%", delta: "+0.017" },
      { dyestuff: "Yellow 4G", standard: "0.118%", proposed: "0.109%", delta: "−0.009" },
      { dyestuff: "Levelling agent", standard: "1.20%", proposed: "1.20%" },
      { dyestuff: "Acid buffer", standard: "0.80%", proposed: "0.80%" },
    ],
    checks: [
      { label: "Predicted ΔE, corrected", result: "0.9 · tol ≤ 1.0", pass: true },
      { label: "Lab dip", result: "passed on 1st submit", pass: true },
      { label: "Warm drift, uncorrected", result: "ΔE 1.3", pass: false },
    ],
    at: "07:02",
  },
  {
    id: "AP-3314",
    tab: "dye",
    kind: "formula",
    subject: { id: "DL-4488", label: "DL-4488 · Meridian", kind: "dyelot" },
    swatch: { type: "dye", colour: "#A16207", image: "/yarn/cone-dye-meridian.png" },
    shade: "ΔE 0.6",
    title: "Meridian recipe unchanged — routine re-approval on the shared draw",
    yarnLot: "Y-31004",
    qty: "750 lb",
    covers: "1 order",
    value: 600,
    escalation:
      "Nothing changed in the recipe. It is the third colour off the same Y-31004 draw, so Sable wants the dip confirmed before the whole lot is committed three ways.",
    insight: {
      headline: "Approve — recipe unchanged on the new draw",
      detail: "third colour off Y-31004 · dip re-confirmed",
    },
    verdict: "Approve",
    confidence: 98,
    lab: "ΔE 0.6 · pass",
    genealogy: {
      yarn: { id: "Y-31004", note: "Supplier draw A · 3,000 lb received" },
      dyeLot: { id: "DL-4488", note: "Meridian · 750 lb proposed" },
    },
    formula: [
      { dyestuff: "Yellow 4G", standard: "0.362%", proposed: "0.362%" },
      { dyestuff: "Red 3BN", standard: "0.241%", proposed: "0.241%" },
      { dyestuff: "Levelling agent", standard: "1.20%", proposed: "1.20%" },
    ],
    checks: [
      { label: "Predicted ΔE", result: "0.6 · tol ≤ 1.0", pass: true },
      { label: "Recipe vs standard", result: "identical", pass: true },
      { label: "Shared draw", result: "Y-31004 · draw A", pass: true },
    ],
    at: "07:18",
  },

  /* ── Settled by the engine ────────────────────────────────────────────── */
  // Inside Sable's limits, so they never reached a person. Listed because an
  // autonomy claim is only credible if the work it covers can be inspected.
  {
    id: "AP-3290",
    tab: "approved",
    kind: "sizing",
    subject: { id: "Y-30844", label: "Y-30844 · Aria base", kind: "yarn" },
    swatch: { type: "yarn", colour: "#EFEADD", image: "/yarn/cone-white.png" },
    grade: "Draw A · 18/1",
    received: "2,100 lb",
    title: "Allocate Y-30844 to ORD-77266 on a single draw",
    yarnLot: "Y-30844",
    qty: "1,560 lb",
    covers: "ORD-77266",
    value: 1800,
    escalation: "Inside the sizing limit — one draw, one order, no shade risk.",
    insight: { headline: "Allocated on one draw", detail: "no spare, no shade exposure" },
    verdict: "Approved",
    confidence: 98,
    lab: "18/1 · in spec",
    genealogy: {
      yarn: { id: "Y-30844", note: "Supplier draw A · 2,100 lb received" },
      dyeLot: { id: "DL-4455", note: "Aria · 1,560 lb committed" },
    },
    checks: [
      { label: "Single draw", result: "yes · shade holds", pass: true },
      { label: "Inside sizing limit", result: "1 order", pass: true },
    ],
    at: "05:12",
    approvedBy: "Sable",
    approvedRule: "Single-draw allocations under 2,000 lb",
  },
  {
    id: "AP-3294",
    tab: "approved",
    kind: "formula",
    subject: { id: "DL-4459", label: "DL-4459 · Dune", kind: "dyelot" },
    swatch: { type: "dye", colour: "#0F766E", image: "/yarn/cone-dye-dune.png" },
    shade: "ΔE 0.4",
    title: "Dune recipe unchanged on a repeat draw",
    yarnLot: "Y-30861",
    qty: "1,240 lb",
    covers: "1 order",
    value: 900,
    escalation: "Recipe identical to standard and the draw is the same — nothing to judge.",
    insight: { headline: "Recipe identical to standard", detail: "same draw, nothing to judge" },
    verdict: "Approved",
    confidence: 99,
    lab: "ΔE 0.4 · pass",
    genealogy: {
      yarn: { id: "Y-30861", note: "Supplier draw A · 1,900 lb received" },
      dyeLot: { id: "DL-4459", note: "Dune · 1,240 lb committed" },
    },
    checks: [
      { label: "Recipe vs standard", result: "identical", pass: true },
      { label: "Predicted ΔE", result: "0.4 · tol ≤ 1.0", pass: true },
    ],
    at: "05:48",
    approvedBy: "Sable",
    approvedRule: "Unchanged recipe, same draw, ΔE ≤ 0.5",
  },
  {
    id: "AP-3298",
    tab: "approved",
    kind: "sizing",
    subject: { id: "Y-30869", label: "Y-30869 · Meridian base", kind: "yarn" },
    swatch: { type: "yarn", colour: "#DED7C6", image: "/yarn/cone-ecru.png" },
    grade: "Draw C · 20/1",
    received: "1,700 lb",
    title: "Top up ORD-77281 from the balance of Y-30869",
    yarnLot: "Y-30869",
    qty: "480 lb",
    covers: "ORD-77281",
    value: 600,
    escalation: "A top-up from an already-committed lot — the shade decision was made when the lot was.",
    insight: { headline: "Balance released to its own order", detail: "shade already signed" },
    verdict: "Approved",
    confidence: 97,
    lab: "20/1 · in spec",
    genealogy: {
      yarn: { id: "Y-30869", note: "Supplier draw C · 1,700 lb received" },
      dyeLot: { id: "DL-4462", note: "Meridian · 480 lb committed" },
    },
    checks: [
      { label: "Lot already signed", result: "yes", pass: true },
      { label: "Top-up under limit", result: "480 lb", pass: true },
    ],
    at: "06:05",
    approvedBy: "Marcus",
    approvedRule: "Signed by hand",
  },
];

/**
 * One stop in a lot's life, for the traceability tab.
 *
 * The chain used to be three cards — yarn lot, dye lot, batch — which said what
 * the lot *is* but not where it has been. A traceback is only useful if it
 * names the machine: "which belt ran this" is the first question asked when a
 * claim comes back, and it was the one thing the panel couldn't answer.
 *
 * `done: false` marks a stage that hasn't happened. Most of Sable's work is an
 * instruction for product that doesn't exist yet, so the chain stopping early
 * is the normal case rather than missing data.
 */
export interface TraceStep {
  stage: string;
  /** The lot, batch or order this stage produced. */
  id?: string;
  /** The machine or line it ran on — the answer to "which belt". */
  where?: string;
  at: string;
  detail: string;
  done: boolean;
}

/**
 * The full chain behind an approval, built from the row rather than authored
 * per row — the stages a carpet lot passes through are the same every time, so
 * repeating them nine times would only be nine chances to disagree.
 */
export function traceFor(row: ApprovalRow): ReadonlyArray<TraceStep> {
  const dye = row.tab === "dye" || row.subject.kind === "dyelot";
  const yarnId = row.genealogy.yarn.id;
  const lotId = row.genealogy.dyeLot.id;
  const batch = row.genealogy.batch;

  return [
    {
      stage: "Received",
      id: yarnId,
      where: "Goods-in · dock 2",
      at: "11 Aug · 07:40",
      detail: `${row.genealogy.yarn.note} · COA on file`,
      done: true,
    },
    {
      stage: "Creeled & tufted",
      id: yarnId,
      where: dye ? "TUF-03 · 5/64 gauge" : "TUF-01 · 1/10 gauge",
      at: "12 Aug · 06:10",
      detail: dye
        ? "Greige rolled and staged for the dye house"
        : "Proposed — this allocation decides which machine takes the draw",
      done: dye,
    },
    {
      stage: "Dyed",
      id: lotId,
      where: dye ? "BECK-1 · batch, shade sequenced" : undefined,
      at: dye ? "12 Aug · 09:20" : "—",
      detail: dye
        ? `${row.genealogy.dyeLot.note} · recipe on this approval`
        : "Not dyed — the lot has no colour until a recipe is signed",
      done: dye,
    },
    {
      stage: "Backed",
      where: batch ? "BAK-01 · precoat + secondary" : undefined,
      at: batch ? "12 Aug · 11:05" : "—",
      detail: batch ? "Ran on the constraint line" : "Waiting on the stage above",
      done: Boolean(batch),
    },
    {
      stage: "Finished & inspected",
      id: batch?.id,
      where: batch ? "FIN-01 · shear · inspect · roll" : undefined,
      at: batch ? "12 Aug · 13:40" : "—",
      detail: batch ? batch.note : "Nothing exists to trace until this is approved",
      done: Boolean(batch),
    },
  ];
}

/** Which tab a row belongs to, and how many are pending there. */
export const approvalsForTab = (tab: ApprovalTab) =>
  APPROVALS.filter((a) => a.tab === tab);

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

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

export type ApprovalKind = "formula" | "sequence" | "sizing" | "creel";

export const APPROVAL_LABEL: Record<ApprovalKind, string> = {
  formula: "Dye formula",
  sequence: "Creel sequence",
  sizing: "Lot sizing",
  creel: "Creel plan",
};

/** Which queue a proposal belongs to. Yarn-lot proposals are about the fibre
 *  and the shade it produces; creel-plan proposals are about how that yarn is
 *  loaded onto the frame for a specific run. Same signature-required shape,
 *  different evidence — so each family opens a modal with its own tabs. */
export type ProposalFamily = "yarnlot" | "creelplan";

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
  /** Which queue tab this row sits under, and therefore which modal it opens.
   *  "yarnlot" → Modal 1 (mapping / utilisation / spread / approval queue).
   *  "creelplan" → Modal 2 (package alignment / threading / traceability). */
  family: ProposalFamily;
  /** The pipeline link. A creel-plan proposal is the step *after* its yarn lot
   *  is committed, so it stays hidden until the yarn-lot approval it names here
   *  is signed. Set on creel-plan rows only — a yarn-lot row follows nothing. */
  follows?: string;
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
    family: "yarnlot",
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
    family: "yarnlot",
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
    family: "yarnlot",
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

  /* Creel-plan proposals. Same signature-required shape, but the commitment is
     how the frame is loaded rather than what the fibre becomes — so the
     evidence is package alignment and set-off, not a recipe. */
  {
    id: "AP-3320",
    family: "creelplan",
    follows: "AP-3312",
    kind: "creel",
    subject: { id: "R-1204", label: "R-1204 · L-01", kind: "yarn" },
    title: "Creel plan for R-1204 runs 10 min wide of the sync window",
    yarnLot: "Y-30918",
    qty: "480 pos",
    covers: "DL-4471 · 1 run",
    value: 1180,
    escalation:
      "Four positions exhaust outside the ±5 min window. Re-winding them costs a delay; running as planned strands 18 lb on the frame.",
    insight: {
      headline: "Approve as planned — the stranded yarn costs less than the delay",
      detail: "4 outlier positions · 18 lb stranded",
    },
    genealogy: {
      yarn: { id: "Y-30918", note: "Supplier draw B · 2,400 lb received" },
      dyeLot: { id: "DL-4471", note: "Cascade · 1,840 lb committed" },
    },
    checks: [
      { label: "Package alignment", result: "±10 min · target ±5", pass: false },
      { label: "Creel utilisation", result: "468 of 480 · 98%", pass: true },
      { label: "Threading set-off", result: "120 lb · 4.2% of lot", pass: true },
      { label: "Lot traceability", result: "20 packages · complete", pass: true },
    ],
    at: "07:35",
  },
  {
    id: "AP-3321",
    family: "creelplan",
    follows: "AP-3314",
    kind: "creel",
    subject: { id: "R-1207", label: "R-1207 · L-03", kind: "yarn" },
    title: "R-1207 spread is wide enough to cut the run short",
    yarnLot: "Y-31004",
    qty: "480 pos",
    covers: "DL-4478 · 1 run",
    value: 2050,
    escalation:
      "A ±35 min spread means the frame stops with 31 lb still on it. Sable can re-plan the loading, but that pushes the run past shift end.",
    insight: {
      headline: "Send back for re-winding — 31 lb stranded is above tolerance",
      detail: "±35 min spread · flagged cut",
    },
    genealogy: {
      yarn: { id: "Y-31004", note: "Supplier draw A · 3,000 lb received" },
      dyeLot: { id: "DL-4478", note: "Fog 150 · pending review" },
    },
    checks: [
      { label: "Package alignment", result: "±35 min · target ±5", pass: false },
      { label: "Stranded yarn", result: "31 lb · above tolerance", pass: false },
      { label: "Creel utilisation", result: "408 of 480 · 85%", pass: false },
      { label: "Shift capacity", result: "re-plan runs past end", pass: false },
    ],
    at: "07:48",
  },
  {
    id: "AP-3322",
    family: "creelplan",
    follows: "AP-3313",
    kind: "creel",
    subject: { id: "R-1205", label: "R-1205 · L-02", kind: "yarn" },
    title: "R-1205 creel plan is inside every window and ready to load",
    yarnLot: "Y-30918",
    qty: "480 pos",
    covers: "DL-4455 · 1 run",
    value: 340,
    escalation:
      "Nothing is wrong with this plan. It still needs a signature, because loading a creel commits the frame for the length of the run.",
    insight: {
      headline: "Approve — every position lands inside the sync window",
      detail: "±4 min spread · 2 lb stranded",
    },
    genealogy: {
      yarn: { id: "Y-30918", note: "Supplier draw B · 2,400 lb received" },
      dyeLot: { id: "DL-4455", note: "Mist 110 · 1,920 lb allocated" },
    },
    checks: [
      { label: "Package alignment", result: "±4 min · target ±5", pass: true },
      { label: "Stranded yarn", result: "2 lb · negligible", pass: true },
      { label: "Creel utilisation", result: "432 of 480 · 90%", pass: true },
      { label: "Lot traceability", result: "20 packages · complete", pass: true },
    ],
    at: "08:02",
  },
];

/* ─── Sable's read ──────────────────────────────────────────────────────── */

export const YARN_KPIS: ReadonlyArray<{
  label: string;
  value: string;
  detail: string;
  alert?: boolean;
}> = [
  { label: "Lots active", value: "24", detail: "across 6 runs" },
  { label: "Shade-critical lots", value: "1", detail: "flagged", alert: true },
  { label: "Creel utilisation", value: "92%", detail: "target 95%" },
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

/* ═══ Modal 1 · Yarn Lot ═════════════════════════════════════════════════ */

/* ─── Lot to Order Mapping ──────────────────────────────────────────────── */

/** One order a dye lot feeds. A lot serving two orders is the whole reason
 *  shade discipline matters — split the lot and the two orders no longer
 *  match, which is why `fixed` is called out rather than left in a caption. */
export interface LotOrderLink {
  order: string;
  style: string;
  /** Square yards the order draws off this lot. */
  sqyd: number;
  /** Set when the order carries an install date that cannot move. */
  fixed?: boolean;
}

export interface LotOrderMap {
  dyeLot: string;
  orders: ReadonlyArray<LotOrderLink>;
}

/** Which lots feed which orders. Drawn as a bracket rather than a flat table:
 *  the one-lot-to-many-orders shape is the fact worth reading, and a table
 *  repeating the lot id on every row hides exactly that. */
export const LOT_ORDER_MAP: ReadonlyArray<LotOrderMap> = [
  {
    dyeLot: "DL-4471",
    orders: [
      { order: "ORD-882", style: "Cascade Twist", sqyd: 12400, fixed: true },
      { order: "ORD-917", style: "Cascade Twist", sqyd: 8200 },
    ],
  },
  { dyeLot: "DL-4455", orders: [{ order: "ORD-841", style: "Highland Loop", sqyd: 6100 }] },
  { dyeLot: "DL-4462", orders: [{ order: "ORD-856", style: "Desert Weave", sqyd: 9800 }] },
];

/* ─── Shade-critical lots ───────────────────────────────────────────────── */

export type LotStatus = "allocated" | "pending" | "at-risk";

export const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  allocated: "Allocated",
  pending: "Pending",
  "at-risk": "At risk",
};

export interface ShadeCriticalLot {
  lot: string;
  orders: ReadonlyArray<string>;
  shade: string;
  status: LotStatus;
  /** Why it is at risk. Absent when it isn't. */
  risk?: string;
}

export const SHADE_CRITICAL_LOTS: ReadonlyArray<ShadeCriticalLot> = [
  {
    lot: "DL-4471",
    orders: ["ORD-882", "ORD-917"],
    shade: "Dune 240",
    status: "at-risk",
    risk: "Fixed date",
  },
  { lot: "DL-4455", orders: ["ORD-841"], shade: "Mist 110", status: "allocated" },
  { lot: "DL-4462", orders: ["ORD-856"], shade: "Sand 320", status: "allocated" },
  { lot: "DL-4478", orders: ["ORD-923"], shade: "Fog 150", status: "pending", risk: "Review" },
];

/** The one-line roll-up under the lot table. Kept as data rather than three
 *  hard-coded spans so the numbers can't drift from the table above them. */
export const LOT_STATUS_SUMMARY: ReadonlyArray<{ status: LotStatus; count: number; label: string }> =
  [
    { status: "allocated", count: 14, label: "allocated" },
    { status: "pending", count: 7, label: "pending approval" },
    { status: "at-risk", count: 3, label: "at risk" },
  ];

/* ─── Creel Utilisation ─────────────────────────────────────────────────── */

/** One tufting line's creel fill. `filled` against `positions` is the number
 *  that matters — an empty position is yarn the line can't run. */
export interface CreelLine {
  line: string;
  positions: number;
  filled: number;
}

export const CREEL_LINES: ReadonlyArray<CreelLine> = [
  { line: "L-01", positions: 480, filled: 468 },
  { line: "L-02", positions: 480, filled: 432 },
  { line: "L-03", positions: 480, filled: 408 },
  { line: "L-04", positions: 480, filled: 456 },
];

/** Below this, a line is short enough yarn that the run is at risk. */
export const CREEL_UTIL_TARGET = 95;

/* ─── Run-Out Spread & Waste ────────────────────────────────────────────── */

export type SpreadFlag = "ok" | "wide" | "cut";

export const SPREAD_FLAG_LABEL: Record<SpreadFlag, string> = {
  ok: "ok",
  wide: "wide",
  cut: "cut",
};

/** How tightly a run's creel positions exhaust together.
 *
 *  Positions that run out at different times leave partial cones on the frame —
 *  `stranded` is that yarn, in pounds. A wide spread is not a defect on its own;
 *  it is the cost of loading packages that weren't wound to the same length. */
export interface RunOutSpread {
  run: string;
  lot: string;
  /** Minutes either side of the mean run-out. */
  spreadMin: number;
  /** Pounds left on the frame when the run stops. */
  strandedLb: number;
  flag: SpreadFlag;
}

export const RUN_OUT_SPREAD: ReadonlyArray<RunOutSpread> = [
  { run: "R-1204", lot: "DL-4471", spreadMin: 22, strandedLb: 18, flag: "wide" },
  { run: "R-1205", lot: "DL-4455", spreadMin: 4, strandedLb: 2, flag: "ok" },
  { run: "R-1206", lot: "DL-4462", spreadMin: 8, strandedLb: 5, flag: "ok" },
  { run: "R-1207", lot: "DL-4478", spreadMin: 35, strandedLb: 31, flag: "cut" },
];

/** The spread a run is expected to hold, in minutes either side. */
export const SPREAD_TARGET_MIN = 5;

/* ─── Approval Queue (inside Modal 1) ───────────────────────────────────── */

export type QueueTone = "escalation" | "standard";

/** One proposal as it appears in the in-modal queue.
 *
 *  This is the fullest form of a Sable proposal: what it proposes, what it was
 *  built from, and what happens on each of the two answers. `ifSigned` and
 *  `ifRejected` are both required — a proposal that only states the upside of
 *  approving it is a sales pitch, not a decision. */
export interface QueueProposal {
  id: string;
  tone: QueueTone;
  /** The headline action, e.g. "Split shade-critical lot". */
  action: string;
  lot: string;
  shade: string;
  style: string;
  /** Two or three lines: what Sable wants to do. */
  proposes: ReadonlyArray<string>;
  builtFrom: ReadonlyArray<{ label: string; value: string }>;
  ifSigned: ReadonlyArray<string>;
  ifRejected: ReadonlyArray<string>;
  /** Shade-rule checks, each either clean or a warning. */
  compliance: ReadonlyArray<{ label: string; pass: boolean }>;
  /** Who it goes to if this person doesn't settle it. */
  escalationPath: ReadonlyArray<string>;
}

export const QUEUE_PROPOSALS: ReadonlyArray<QueueProposal> = [
  {
    id: "QP-1",
    tone: "escalation",
    action: "Split shade-critical lot",
    lot: "DL-4471",
    shade: "Dune 240",
    style: "Cascade Twist",
    proposes: [
      "Allocate full lot to ORD-882 (fixed install date 08/22).",
      "ORD-917 moves to next available lot in same shade family.",
    ],
    builtFrom: [
      { label: "Sequence", value: "R-1204" },
      { label: "Orders", value: "ORD-882, ORD-917" },
      { label: "Shade rule", value: "critical" },
      { label: "Lot weight", value: "2,840 lbs" },
      { label: "Set-off", value: "120 lbs" },
    ],
    ifSigned: ["ORD-882 date held", "ORD-917 slips 3 days"],
    ifRejected: ["Lot split → shade risk", "Both orders at risk"],
    compliance: [
      { label: "Lot kept whole", pass: true },
      { label: "Shade family matched", pass: true },
      { label: "Split avoided", pass: false },
    ],
    escalationPath: ["Yarn lead", "Planner", "Customer service"],
  },
  {
    id: "QP-2",
    tone: "standard",
    action: "Lot allocation",
    lot: "DL-4455",
    shade: "Mist 110",
    style: "Highland Loop",
    proposes: ["Allocate 1,920 lbs to ORD-841. Within shade rules."],
    builtFrom: [
      { label: "Sequence", value: "R-1205" },
      { label: "Orders", value: "ORD-841" },
      { label: "Shade rule", value: "standard" },
      { label: "Lot weight", value: "1,920 lbs" },
      { label: "Set-off", value: "95 lbs" },
    ],
    ifSigned: ["No date impact", "No shade conflict", "Remnant: 40 lbs"],
    ifRejected: ["Lot returns to pool", "ORD-841 unallocated"],
    compliance: [
      { label: "Within rules", pass: true },
      { label: "No split required", pass: true },
      { label: "Compliant", pass: true },
    ],
    escalationPath: ["Yarn lead"],
  },
];

/* ═══ Modal 2 · Creel Plan ═══════════════════════════════════════════════ */

/** The run a creel plan is loaded for. Header context for Modal 2. */
export interface CreelPlanHeader {
  run: string;
  lot: string;
  style: string;
  shade: string;
  line: string;
  positions: number;
  backing: string;
}

export const CREEL_PLAN_HEADER: CreelPlanHeader = {
  run: "R-1204",
  lot: "DL-4471",
  style: "Cascade Twist",
  shade: "Dune 240",
  line: "L-01",
  positions: 480,
  backing: "Backing 2",
};

/* ─── Package Alignment ─────────────────────────────────────────────────── */

export interface CreelPosition {
  pos: string;
  coneWtLb: number;
  lot: string;
  pkgId: string;
  /** Clock time this position exhausts. */
  runOut: string;
  /** False when this position falls outside the target window. */
  sync: boolean;
}

/** The head of section A. A creel has 480 positions; showing five and saying
 *  so is honest, where paginating 480 rows of near-identical data is theatre. */
export const CREEL_POSITIONS: ReadonlyArray<CreelPosition> = [
  { pos: "001", coneWtLb: 4.2, lot: "DL-4471", pkgId: "PKG-0001", runOut: "14:32", sync: true },
  { pos: "002", coneWtLb: 4.2, lot: "DL-4471", pkgId: "PKG-0001", runOut: "14:34", sync: true },
  { pos: "003", coneWtLb: 4.2, lot: "DL-4471", pkgId: "PKG-0002", runOut: "14:30", sync: true },
  { pos: "004", coneWtLb: 4.1, lot: "DL-4471", pkgId: "PKG-0002", runOut: "14:48", sync: false },
  { pos: "005", coneWtLb: 4.2, lot: "DL-4471", pkgId: "PKG-0003", runOut: "14:31", sync: true },
];

export const CREEL_SECTION_LABEL = "Section A (positions 1–120)";

/** The window every position should exhaust inside, and where this run
 *  actually lands. Outliers are named — "outside target" without the position
 *  numbers is a complaint rather than a work instruction. */
export const PACKAGE_ALIGNMENT = {
  targetMin: 5,
  earliest: "14:28",
  latest: "14:48",
  spreadMin: 10,
  outliers: ["004", "087", "091", "234"],
} as const;

/* ─── Threading Set-Off ─────────────────────────────────────────────────── */

/** Yarn spent threading a section up, per position. Small per position and
 *  material at 480 of them — which is the reason it is shown as a total and a
 *  percentage of the lot rather than only as a rate. */
export interface ThreadingSection {
  section: string;
  range: string;
  positions: number;
  setOffPerPosLb: number;
  totalLb: number;
  pctOfLot: number;
}

export const THREADING_SECTIONS: ReadonlyArray<ThreadingSection> = [
  { section: "A", range: "001–120", positions: 120, setOffPerPosLb: 0.25, totalLb: 30, pctOfLot: 1.1 },
  { section: "B", range: "121–240", positions: 120, setOffPerPosLb: 0.25, totalLb: 30, pctOfLot: 1.1 },
  { section: "C", range: "241–360", positions: 120, setOffPerPosLb: 0.25, totalLb: 30, pctOfLot: 1.1 },
  { section: "D", range: "361–480", positions: 120, setOffPerPosLb: 0.25, totalLb: 30, pctOfLot: 1.1 },
];

export const THREADING_TOTAL = { positions: 480, totalLb: 120, pctOfLot: 4.2 } as const;

/* ─── Lot Tracebility ───────────────────────────────────────────────────── */

/** One package and the positions it was loaded into. This is the record a
 *  claim is walked back along months later: lot → package → position → order. */
export interface PackageTrace {
  pkgId: string;
  cones: number;
  posRange: string;
}

export const PACKAGE_TRACE: ReadonlyArray<PackageTrace> = [
  { pkgId: "PKG-0001", cones: 24, posRange: "001–024" },
  { pkgId: "PKG-0002", cones: 24, posRange: "025–048" },
  { pkgId: "PKG-0003", cones: 24, posRange: "049–072" },
];

/** Packages between the first three and the last. Stated rather than rendered:
 *  seventeen more rows of the same shape teach nothing the pattern hasn't. */
export const PACKAGE_TRACE_ELIDED = 17;

export const PACKAGE_TRACE_LAST: PackageTrace = {
  pkgId: "PKG-0020",
  cones: 24,
  posRange: "457–480",
};

// The shift on Plant 04 · Dalton. Illustrative data — one run, one deviation,
// and everything the engine assembled to argue about it.
//
// The whole narrative hangs off one object: dye lot DL-4471 is shade-critical
// and committed across two orders, one of which has a fixed install date.
// Backing 2 (the constraint line) is running 12% under plan, so the finish
// slips — and every way out either moves a date or splits the lot.

import {
  seg,
  type Claim,
  type DowntimeReason,
  type FeedEvent,
  type LineState,
  type MachineSignal,
  type Measurement,
  type OrderRef,
  type RecoveryOption,
} from "@/types/run";

export const RUN = {
  style: "Cascade Twist · Dune 240",
  yarnLot: "Y-30918",
  shift: "A",
  operator: "J. Alvarez",
  start: "05:10",
  end: "06:40",
  /** When the deviation opened — every feed entry hangs off this. */
  deviationAt: "06:38",
  projectedSlip: "+5h 10m",
} as const;

export const DYE_LOT = {
  id: "DL-4471",
  qty: 2950,
  committed: 2050,
  shadeCritical: true,
  colour: "Dune 240",
  dyedAt: "Today 04:20 · vessel D-3",
  shadeTarget: "ΔE ≤ 2.5 vs standard",
  orders: ["ORD-77310", "ORD-77412"],
} as const;

export const BATCH = {
  id: "B-88214",
  status: "On quality hold",
  since: "06:52",
  qty: "296 lin yd",
  line: "Backing 2",
  flaggedBy: "End-of-line inspection (auto)",
  reason: "Shade variation",
  station: "Vision + ΔE",
} as const;

export const ROLL = {
  id: "R-11204",
  where: "End-of-line inspection",
  grade: "Borderline · 2nd occurrence",
  prior: "R-11189",
  qty: 148,
} as const;

/** First-quality vs seconds price — the gap is the loss on a downgrade.
 *  Nothing here is scrap; the margin gap is the whole exposure. */
export const PRICING = { first: 24.8, second: 18.6 } as const;

export const ORDERS: Record<string, OrderRef> = {
  "ORD-77310": {
    id: "ORD-77310",
    customer: "Kestrel Flooring",
    city: "Atlanta, GA",
    qty: 1150,
    promised: "18 Aug",
    fixed: true,
    risk: "warning",
    headline: "Fixed install — the date is under pressure",
    detail:
      "A crew is booked for 18 Aug, so the date can't move. Backing 2 running 12% under plan puts the projected finish at +5h 10m — recoverable today, but only today.",
  },
  "ORD-77412": {
    id: "ORD-77412",
    customer: "Brightwater Interiors",
    city: "Nashville, TN",
    qty: 900,
    promised: "21 Aug",
    fixed: false,
    risk: "info",
    headline: "Movable date — the slack Option A uses",
    detail:
      "Shares dye lot DL-4471 with ORD-77310. Its promised date has a few days of give, which is exactly the room the re-sequence borrows to hold the fixed install.",
  },
  "ORD-77455": {
    id: "ORD-77455",
    customer: "Halloran Contract",
    city: "Charlotte, NC",
    qty: 740,
    promised: "22 Aug",
    fixed: false,
    risk: "info",
    headline: "Straightforward — no constraint on it",
    detail:
      "Slate 118 on its own dye lot, off the constraint line. It slots in behind Aria Loop for the cheapest purge on the board.",
  },
  "ORD-77468": {
    id: "ORD-77468",
    customer: "Pell & Rowe",
    city: "Richmond, VA",
    qty: 1120,
    promised: "25 Aug",
    fixed: false,
    risk: "info",
    headline: "Comfortable — nearly two weeks of slack",
    detail:
      "No dye lot to hold whole and no fixed crew. It waits for Finishing 1 to clear Cascade rather than competing for the slot.",
  },
  "ORD-77470": {
    id: "ORD-77470",
    customer: "Vantage Interiors",
    city: "Columbus, OH",
    qty: 1450,
    promised: "26 Aug",
    fixed: false,
    risk: "info",
    headline: "Largest in the queue, and the easiest to place",
    detail:
      "Bone 012 is the lightest shade waiting, so it runs first in any campaign — every other lot after it is a cheap step darker.",
  },
  "ORD-77481": {
    id: "ORD-77481",
    customer: "Kestrel Flooring",
    city: "Atlanta, GA",
    qty: 610,
    promised: "27 Aug",
    fixed: false,
    risk: "info",
    headline: "Shade-critical, but not yet urgent",
    detail:
      "Umber 310 has to run whole. Campaigned behind the other Cascade run the purge is free — placed anywhere else it costs a full changeover.",
  },
};

export const LINES: ReadonlyArray<LineState> = [
  { name: "Tufting 3", achieved: 511, standard: 520, oee: 94 },
  { name: "Dyeing 1", achieved: 372, standard: 400, oee: 92 },
  {
    name: "Backing 2",
    achieved: 369,
    standard: 420,
    oee: 78,
    constraint: true,
    pmWindow: "in 3 days",
    vibration: { current: "4.2 mm/s", baseline: "2.1 mm/s" },
  },
  { name: "Finishing 1", achieved: 598, standard: 610, oee: 96 },
];

/** The constraint line — indexed once so every consumer agrees on it. */
export const CONSTRAINT_LINE = LINES.find((l) => l.constraint) ?? LINES[0];

/**
 * The vibration signal behind Rowan's work-order draft.
 *
 * The current reading sits just past the plant's 4.0 mm/s alert limit — which
 * is why it is "held at the limit": the signal routes to maintenance on its
 * own, but raising the order ahead of the scheduled PM is a person's call. The
 * numbers agree with the read sentence and the maintenance tab rather than
 * being a second, drifting copy.
 */
export const MACHINE_SIGNAL: MachineSignal = {
  asset: CONSTRAINT_LINE.name,
  component: "motor bearing, drive side",
  signalType: "Vibration (mm/s)",
  unit: "mm/s",
  current: 4.2,
  threshold: 4.0,
  scaleMax: 6.0,
  currentDisplay: CONSTRAINT_LINE.vibration?.current ?? "4.2 mm/s",
  thresholdDisplay: "4.0 limit",
  firstDetected: "34 min ago",
  trend: "Rising over 3 shifts",
  pmScheduled: CONSTRAINT_LINE.pmWindow ?? "in 3 days",
  lastPm: "14 days ago",
  overThreshold: true,
};


/** Achieved rate against a flat 420 standard, from 06:00 to now. The gap
 *  opens steadily rather than dropping off a cliff, which is exactly why a
 *  fixed alert band caught it and a person didn't. */
export const RATE_SERIES: ReadonlyArray<{ time: string; plan: number; actual: number }> = [
  { time: "06:00", plan: 420, actual: 416 },
  { time: "06:10", plan: 420, actual: 410 },
  { time: "06:20", plan: 420, actual: 405 },
  { time: "06:30", plan: 420, actual: 398 },
  { time: "06:40", plan: 420, actual: 388 },
  { time: "06:50", plan: 420, actual: 376 },
  { time: "07:00", plan: 420, actual: 369 },
];

export const INSPECTION: ReadonlyArray<Measurement> = [
  { metric: "Shade ΔE", spec: "≤ 2.5", actual: "2.9", pass: false },
  { metric: "Streaking", spec: "None", actual: "Slight", pass: false },
  { metric: "Width", spec: '12′0″ ±0.5″', actual: '12′0.3″', pass: true },
  { metric: "Pile height", spec: '0.28″ ±0.02', actual: '0.281″', pass: true },
  { metric: "Tuft bind", spec: "≥ 8.0 lb", actual: "8.4 lb", pass: true },
];

export const DOWNTIME: ReadonlyArray<DowntimeReason> = [
  { reason: "Material-out (yarn)", minutes: 19, linked: true },
  { reason: "Changeover", minutes: 12 },
  { reason: "Quality hold", minutes: 9, linked: true },
  { reason: "No operator", minutes: 5 },
  { reason: "Minor stops", minutes: 3 },
];

export const DOWNTIME_TOTAL = DOWNTIME.reduce((n, d) => n + d.minutes, 0);

/** Three claims, four months, one cause. This is the pattern Wren sends
 *  upstream to become a scheduling rule. */
export const CLAIMS: ReadonlyArray<Claim> = [
  {
    id: "CLM-2291",
    month: "Jun",
    batch: "B-88209",
    dyeLot: "DL-4102",
    rolls: "R-11198 / R-11199",
    cause: "Split lot — two dye runs did not shade-match",
  },
  { id: "CLM-2205", month: "May", batch: "B-88144", dyeLot: "DL-3980", rolls: "R-10877", cause: "Split-lot shade mismatch" },
  { id: "CLM-2154", month: "Apr", batch: "B-88061", dyeLot: "DL-3854", rolls: "R-10620", cause: "Split-lot shade mismatch" },
];

/** Rowan's three costed options, ranked. Exactly one is recommended, and the
 *  cheap one carries its own history — the product argues against it before
 *  a person decides. */
export const OPTIONS: Record<string, RecoveryOption> = {
  A: {
    id: "A",
    title: "Re-sequence · run DL-4471 whole",
    detail:
      "Hold both dates. Slots 2 and 3 swap; ORD-77412 runs first, and the dye lot stays whole.",
    why: "No customer date moves · no shade risk · the lot stays whole.",
    cost: "+$1,840",
    costLabel: "changeover",
    effect: "reorder",
    recommended: true,
    breakdown: [
      { label: "Changeover · dark→light purge", value: "+$1,840", hint: "Two slots swap" },
      { label: "Overtime", value: "$0", hint: "No overtime required" },
      { label: "Shade / claim risk", value: "None", hint: "No additional risk" },
      { label: "Net impact", value: "+$1,840", hint: "Total incremental cost", net: true },
    ],
    schedule: [
      { label: "DL-4471", value: "Runs whole", good: true },
      { label: "ORD-77310 · fixed", value: "Held" },
      { label: "ORD-77412", value: "Held" },
      { label: "Backing 2", value: "Slots 2 & 3 swap" },
    ],
  },
  B: {
    id: "B",
    title: "Split DL-4471 across two dye runs",
    detail: "Cheapest to run — but two dye runs on a shade-critical lot put $18,400 at risk.",
    why: "Cheapest changeover, but splitting a shade-critical lot carries the claim risk that produced CLM-2291.",
    cost: "+$420",
    costLabel: "changeover",
    effect: "split",
    risky: true,
    breakdown: [
      { label: "Changeover", value: "+$420", hint: "Short purge between the two runs" },
      {
        label: "Shade mismatch risk",
        value: "High → CLM-2291",
        hint: "Two dye runs on a shade-critical lot",
        bad: true,
      },
      {
        label: "Expected seconds downgrade",
        value: "−$18,400",
        hint: "Probable first-quality loss",
        bad: true,
      },
      {
        label: "Net exposure",
        value: "−$18,400",
        hint: "Cheapest headline, worst case",
        net: true,
        bad: true,
      },
    ],
    schedule: [
      { label: "DL-4471", value: "Split · shade risk", bad: true },
      { label: "ORD-77310 · fixed", value: "At risk", bad: true },
      { label: "ORD-77412", value: "Held" },
      { label: "Backing 2", value: "Split run" },
    ],
  },
  C: {
    id: "C",
    title: "Expedite · Saturday overtime",
    detail: "Adds a sixth slot on an overtime shift to recover the hours.",
    why: "Holds both dates and keeps the lot whole — but buys it with $6,200 of overtime.",
    cost: "+$6,200",
    costLabel: "overtime",
    effect: "expedite",
    breakdown: [
      { label: "Changeover", value: "+$640", hint: "One purge" },
      { label: "Saturday overtime", value: "+$6,200", hint: "A sixth slot, overtime rate" },
      { label: "Net impact", value: "+$6,840", hint: "Total incremental cost", net: true },
    ],
    schedule: [
      { label: "DL-4471", value: "Runs whole", good: true },
      { label: "ORD-77310 · fixed", value: "Held" },
      { label: "ORD-77412", value: "Held" },
      { label: "Backing 2", value: "+ Saturday slot" },
    ],
  },
};

export const OPTION_ORDER: ReadonlyArray<string> = ["A", "B", "C"];

/** What the agents did between 06:38 and 06:44, in the order they did it.
 *  The last two entries are the point: Rowan stopped at a limit, then
 *  escalated — it never re-sequenced on its own. */
export const FEED_BASE: ReadonlyArray<FeedEvent> = [
  { time: "06:38", lane: "auto", agent: "Rowan", text: seg("Detected Backing 2 running |12% under plan| on DL-4471.") },
  { time: "06:39", lane: "auto", agent: "Rowan", text: seg("Computed finish-date impact: |+5h 10m|, ORD-77310 at risk.") },
  { time: "06:40", lane: "auto", agent: "Rowan", text: seg("Notified line lead + plant manager.") },
  { time: "06:41", lane: "auto", agent: "Rowan", text: seg("Costed and ranked 3 recovery options.") },
  { time: "06:42", lane: "auto", agent: "Sable", text: seg("Checked DL-4471 shade integrity across both committed orders.") },
  {
    time: "06:43",
    lane: "limit",
    agent: "Rowan",
    text: seg("Stopped short of re-sequencing Backing 2 — every option there |moves a promised date|."),
  },
  { time: "06:44", lane: "person", agent: "Rowan", text: seg("Escalated: |the dye lot or the date| is your call.") },
];

/** Replaces the last two entries when the plant's dial has "re-sequence
 *  where a promised date moves" set to Auto — nobody gets asked. */
export const FEED_AUTO_TAIL: FeedEvent = {
  time: "06:43",
  lane: "auto",
  agent: "Rowan",
  text: seg("Re-sequenced Backing 2 |automatically| — inside the limit set for this plant. DL-4471 ran whole."),
};

/** Appended when a person accepts an option — the plan correcting itself,
 *  without a planning cycle. */
export function decisionFeed(optionTitle: string): FeedEvent[] {
  return [
    { time: "now", lane: "person", agent: "You", text: seg(`Chose |${optionTitle}|.`) },
    { time: "now", lane: "auto", agent: "Rowan", text: seg("Told Sawyer to re-plan; notified the floor.") },
    { time: "now", lane: "auto", agent: "Sawyer", text: seg("Rebuilt and released the sequence. |The plan corrected itself.|") },
  ];
}

/** The four tiles at the top of Make. `kind` keys into the KPI drawer. */
export const RUN_KPIS: ReadonlyArray<{
  kind: string;
  label: string;
  value: string;
  detail: string;
  alert?: boolean;
}> = [
  { kind: "rate", label: "Achieved rate", value: "369", detail: "yd/hr · std 420", alert: true },
  { kind: "downtime", label: "Downtime", value: "48m", detail: "reason code pending", alert: true },
  { kind: "yield", label: "Yield", value: "94.1%", detail: "−1.9 pts" },
  { kind: "output", label: "Output", value: "2,940", detail: "lin yd this shift" },
];

/** Seven-reading trend behind each KPI drawer. */
export const KPI_TRENDS: Record<string, number[]> = {
  rate: [416, 410, 405, 398, 388, 376, 369],
  downtime: [8, 14, 22, 30, 38, 44, 48],
  yield: [97, 96, 96, 95, 95, 94, 94],
  output: [420, 830, 1250, 1700, 2150, 2560, 2940],
  attainment: [99, 98, 98, 97, 97, 97, 97],
  adherence: [91, 84, 78, 72, 68, 64, 62],
  oee: [88, 86, 84, 82, 80, 79, 78],
  fqy: [97.9, 97.6, 97.2, 96.9, 96.6, 96.4, 96.2],
};

/**
 * What Marcus is answerable for this shift — the four numbers a
 * plant is actually judged on, not the four the run happens to produce.
 *
 * Attainment and adherence sit next to each other deliberately: attainment
 * alone looks fine, and the gap between them is the entire argument for
 * scheduling. A KPI row that hid that would be flattering rather than useful.
 */
export const SHIFT_KPIS: ReadonlyArray<{
  kind: string;
  title: string;
  value: string;
  /** The movement, as plain text under the value. No trend badge: the sign
   *  carries the direction, and a row of four filled pills competes with the
   *  figures they annotate. */
  delta: string;
}> = [
  { kind: "attainment", title: "Attainment", value: "97%", delta: "−1 pt vs plan" },
  { kind: "adherence", title: "Adherence", value: "62%", delta: "−29 pts vs plan" },
  // Not every number should be a rate. Output is the volume actually off the
  // line and margin at risk is what the shift costs — a row of four
  // percentages can't be weighed against each other and never says the price.
  { kind: "output", title: "Output", value: "2,940 yd", delta: "−340 vs plan" },
  {
    kind: "margin",
    title: "Orders at risk",
    value: "1",
    delta: "ORD-77310 · fixed install date",
  },
];

export const KPI_DETAIL: Record<
  string,
  { title: string; value: string; tone: "bad" | "warn" | "ok"; body: string; extra?: "downtime" | "yield" }
> = {
  rate: {
    title: "Achieved rate",
    value: "369 yd/hr",
    tone: "bad",
    body: "Achieving 369 against a 420 standard — a −12% deviation, past the ±8% alert band, so it escalated at 06:38.",
    extra: "downtime",
  },
  downtime: {
    title: "Downtime",
    value: "48 min",
    tone: "bad",
    body: "48 minutes lost this shift. The reason code is still pending — captured at the machine, often entered late from memory.",
    extra: "downtime",
  },
  yield: {
    title: "Yield",
    value: "94.1%",
    tone: "warn",
    body: "Good output ÷ input, down 1.9 pts on the shortfall and the shade hold.",
    extra: "yield",
  },
  output: {
    title: "Output",
    value: "2,940 lin yd",
    tone: "warn",
    body: "This shift — behind the plan curve by ~340 yd and opening.",
  },
  attainment: {
    title: "Attainment",
    value: "97%",
    tone: "ok",
    body: "Of the volume you said you'd make. It looks fine on its own — which is the trap: volume can be hit while every promise slips.",
  },
  adherence: {
    title: "Adherence",
    value: "62%",
    tone: "bad",
    body: "Whether you made it in the planned sequence, on the planned day. The 35-point gap to attainment is the whole argument for scheduling.",
  },
  margin: {
    title: "Orders at risk",
    value: "1",
    tone: "bad",
    body: "One committed order is exposed this shift — ORD-77310, a fixed install date running on DL-4471. Re-sequencing protects it; splitting the lot to save changeover would put its shade — and the date — at risk.",
  },
  fqy: {
    title: "First-quality yield",
    value: "96.2%",
    tone: "warn",
    body: "Rolls passing at first quality, before any downgrade. Down 1.4 points on the plan, and the miss is shade rather than build.",
    extra: "yield",
  },
  oee: {
    title: "Backing 2 OEE",
    value: "78%",
    tone: "bad",
    body: "Availability 86% × Performance 92% × Quality 98% on the constraint line. Performance is the drag.",
  },
};

/** OEE decomposed — performance is the drag, which is what makes this a
 *  rate problem rather than a breakdown. */
export const OEE_FACTORS: ReadonlyArray<{ label: string; value: string; pct: number }> = [
  { label: "Availability", value: "86%", pct: 86 },
  { label: "Performance", value: "92%", pct: 92 },
  { label: "Quality", value: "98%", pct: 98 },
];

// Line health — the machine-telemetry layer that sits above Make's decision
// queue. Modelled on Shaw's Ignition Historian: line speed, pressures, zone
// temperatures and feeder setpoints, read across the real process — from
// compounding the backing through to finishing.
//
// Illustrative fixtures, shaped so a live Ignition tag feed can replace each
// series without the component changing. Deviations key off the broadened
// model (delamination, velcro pull, 6-foot roll, shade, off-rate) — dye is no
// longer the spine.

export type StageStatus = "nominal" | "watched" | "under";

export interface StageReading {
  label: string;
  value: string;
  /** "hot" = the reading that is the problem; "warn" = drifting. */
  tone?: "hot" | "warn";
}

/** One time-series read from an Ignition tag. Multiple series render as an
 *  overlay on the focused card, and the first one drives the chip sparkline. */
export interface StageSeries {
  metric: string;
  unit: string;
  plan?: number;
  points: ReadonlyArray<{ t: string; v: number }>;
  /** 12-week weekly view of the same tag — the Historical toggle. Optional;
   *  a pen without one falls back to the realtime series. */
  history?: ReadonlyArray<{ t: string; v: number }>;
  /** Draws the line in this tone. Defaults to the stage status ink. */
  tone?: "primary" | "warn" | "hot";
}

/** Weekly ticks for historical series. */
function weeks(values: number[]): ReadonlyArray<{ t: string; v: number }> {
  const start = 315;
  const step = Math.floor(51 / Math.max(values.length - 1, 1));
  return values.map((v, i) => ({ t: `WK ${start + i * step}`, v }));
}

export interface ProcessStage {
  id: string;
  /** Short label for the flow chip. */
  name: string;
  /** The physical entity behind it, when the demo narrative names one. */
  sub: string;
  status: StageStatus;
  /** One line under the chip — what the status means right now. Active
   *  exceptions append the shift's cost so far ("· $5.2k so far"). */
  note: string;
  /** Set on the constraint belt only — the promise ceiling, always visible:
   *  "Constraint · headroom 8% fwd 4wk". */
  constraint?: string;
  /** Two or three signals — Ignition shows a family per stage, not one metric. */
  focus: ReadonlyArray<StageSeries>;
  /** The Ignition readings for this stage. */
  readings: ReadonlyArray<StageReading>;
}

/** The line, stage by stage. Coating (Backing 2) is the constraint and carries
 *  the rate deviation + delamination signature; Tufting is watched for a
 *  tufter bearing. Everything else is nominal. */
export const PROCESS_STAGES: ReadonlyArray<ProcessStage> = [
  {
    id: "compound",
    name: "Compounding",
    sub: "backing compound",
    status: "nominal",
    note: "Batch on spec",
    focus: [
      { metric: "Batch temp", unit: "°F", plan: 385, tone: "primary", points: line([384, 385, 385, 386, 385, 385, 384, 385]) },
      { metric: "Feed pressure", unit: "psi", tone: "warn", points: line([2098, 2100, 2099, 2101, 2100, 2100, 2099, 2100]) },
      { metric: "Torque", unit: "%", tone: "hot", points: line([70, 71, 72, 71, 72, 72, 72, 72]) },
    ],
    readings: [
      { label: "Batch temp", value: "385 °F" },
      { label: "Feed pressure", value: "2,100 psi" },
      { label: "Screw speed", value: "240 rpm" },
      { label: "Torque", value: "72%" },
    ],
  },
  {
    id: "extrude",
    name: "Extrusion",
    sub: "sheet · zones",
    status: "nominal",
    note: "Zones holding",
    focus: [
      { metric: "Line speed", unit: "fpm", plan: 18, tone: "primary", points: line([18, 18, 18.1, 18, 17.9, 18, 18, 18]) },
      { metric: "Zone 2 temp", unit: "°F", tone: "warn", points: line([470, 471, 472, 472, 471, 472, 472, 472]) },
      { metric: "Zone 3 temp", unit: "°F", tone: "hot", points: line([463, 464, 465, 465, 464, 465, 465, 465]) },
    ],
    readings: [
      { label: "Line speed", value: "18.0 fpm" },
      { label: "Zone 1 temp", value: "468 °F" },
      { label: "Zone 2 temp", value: "472 °F" },
      { label: "Zone 3 temp", value: "465 °F" },
    ],
  },
  {
    id: "coat",
    name: "Coating",
    sub: "Backing 2 · constraint",
    status: "under",
    note: "Under rate 13% · 22 min · $5.2k so far",
    constraint: "Constraint · headroom 8% fwd 4wk",
    focus: [
      {
        metric: "Line speed",
        unit: "fpm",
        plan: 20,
        tone: "primary",
        points: [
          { t: "13:32", v: 19.8 },
          { t: "13:42", v: 19.6 },
          { t: "13:52", v: 19.1 },
          { t: "14:02", v: 18.6 },
          { t: "14:12", v: 18.0 },
          { t: "14:22", v: 17.6 },
          { t: "14:32", v: 17.4 },
        ],
        history: weeks([20.2, 20.1, 20.0, 19.8, 19.9, 19.6, 19.2, 18.8]),
      },
      {
        metric: "Coat pressure",
        unit: "psi",
        tone: "warn",
        points: line([1850, 1848, 1842, 1838, 1832, 1828, 1824]),
        history: weeks([1980, 1975, 1960, 1952, 1940, 1921, 1890, 1860]),
      },
      {
        metric: "Feeder 2 setpoint",
        unit: "",
        tone: "hot",
        points: line([610, 605, 600, 595, 590, 585, 581]),
        history: weeks([610, 610, 610, 608, 605, 600, 592, 585]),
      },
    ],
    readings: [
      { label: "Line speed", value: "17.4 fpm ▼", tone: "hot" },
      { label: "Plan rate", value: "20.0 fpm" },
      { label: "Coat pressure", value: "1,824 psi" },
      { label: "Feeder 2 setpoint", value: "581 (was 610)", tone: "warn" },
    ],
  },
  {
    id: "tuft",
    name: "Tufting",
    sub: "Tuft-04",
    status: "watched",
    note: "Bearing vibration rising",
    focus: [
      {
        metric: "Vibration",
        unit: "mm/s",
        plan: 6,
        tone: "primary",
        points: [
          { t: "13:32", v: 5.1 },
          { t: "13:42", v: 5.4 },
          { t: "13:52", v: 5.9 },
          { t: "14:02", v: 6.3 },
          { t: "14:12", v: 6.8 },
          { t: "14:22", v: 7.0 },
          { t: "14:32", v: 7.2 },
        ],
        history: weeks([2.2, 2.4, 2.8, 3.1, 3.6, 4.2, 5.4, 7.2]),
      },
      { metric: "Rate", unit: "fpm", tone: "warn", points: line([17.4, 17.3, 17.3, 17.2, 17.2, 17.2, 17.2]) },
      { metric: "Yield", unit: "%", tone: "hot", points: line([96.4, 96.3, 96.2, 96.2, 96.1, 96.1, 96.1]) },
    ],
    readings: [
      { label: "Rate", value: "17.2 fpm" },
      { label: "Yield", value: "96.1%" },
      { label: "Tuft-04 vibration", value: "7.2 mm/s ▲", tone: "warn" },
      { label: "PM due", value: "in 18 h" },
    ],
  },
  {
    id: "warp",
    name: "Warping",
    sub: "creel · beams",
    status: "nominal",
    note: "On plan",
    focus: [
      { metric: "Beam tension", unit: "g", plan: 120, tone: "primary", points: line([120, 119, 121, 120, 120, 119, 120, 121]) },
      { metric: "Ends running", unit: "", tone: "warn", points: line([1188, 1188, 1188, 1188, 1188, 1188, 1188, 1188]) },
    ],
    readings: [
      { label: "Beam tension", value: "120 g" },
      { label: "Ends running", value: "1,188 / 1,188" },
      { label: "Creel changes", value: "0 this shift" },
      { label: "Rate", value: "on plan" },
    ],
  },
  {
    id: "shear",
    name: "Shearing",
    sub: "pile height",
    status: "nominal",
    note: "Within tolerance",
    focus: [
      { metric: "Shear height", unit: "mm", plan: 8.2, tone: "primary", points: line([8.2, 8.2, 8.1, 8.2, 8.3, 8.2, 8.2, 8.2]) },
      { metric: "Reject rate", unit: "%", tone: "warn", points: line([0.2, 0.2, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2]) },
    ],
    readings: [
      { label: "Shear height", value: "8.2 mm" },
      { label: "Blade load", value: "normal" },
      { label: "Pass count", value: "2" },
      { label: "Reject rate", value: "0.2%" },
    ],
  },
  {
    id: "finish",
    name: "Finishing",
    sub: "shear · steam · roll",
    status: "nominal",
    note: "Nominal",
    focus: [
      { metric: "Steam pressure", unit: "psi", plan: 45, tone: "primary", points: line([45, 45, 44, 45, 46, 45, 45, 45]) },
      { metric: "Roll length", unit: "yd", tone: "warn", points: line([3390, 3395, 3400, 3402, 3405, 3408, 3410]) },
    ],
    readings: [
      { label: "Steam pressure", value: "45 psi" },
      { label: "Roll length", value: "3,410 yd" },
      { label: "Grader queue", value: "2 rolls" },
      { label: "Off-rate flags", value: "0" },
    ],
  },
];

/** Yield and the defects behind it, this shift — the broadened deviation set,
 *  each tied to the stage that produces it. */
export interface DefectStat {
  label: string;
  sub: string;
  value: string;
  tone?: "hot" | "warn";
}
export const SHIFT_YIELD = { value: "94.2%", delta: "−1.9 pts vs plan" };
export const SHIFT_DEFECTS: ReadonlyArray<DefectStat> = [
  { label: "Delamination", sub: "Coating · Backing 2", value: "3 this shift", tone: "hot" },
  { label: "6-foot roll", sub: "edge grade", value: "1 flagged", tone: "warn" },
  { label: "Off-rate", sub: "Backing 2 under plan", value: "22 min", tone: "warn" },
  { label: "Velcro pull", sub: "Tufting", value: "0" },
  { label: "Shade", sub: "dye lot", value: "0" },
];

/** One exception the engine raised — a line row that reached a person. Costed,
 *  and each hands off to the decision queue rather than resolving here. */
export interface LineException {
  id: string;
  severity: "under" | "watched";
  headline: string;
  detail: string;
  cost: string;
  read: string;
}
export const LINE_EXCEPTIONS: ReadonlyArray<LineException> = [
  {
    id: "back-2-rate",
    severity: "under",
    headline: "Backing 2 under rate 13% for 22 min",
    detail: "projected finish +4 h · DL-4471 shade-critical · 2 orders at risk",
    cost: "$14,200",
    read: "The deviation matches the delamination signature from CLM-2154 — a coat-feeder starve at the same zone. Predictive maintenance suggests bearing wear on Tuft-04.",
  },
  {
    id: "tuft-04-wo",
    severity: "watched",
    headline: "Tuft-04 vibration past limit · 7.2 mm/s",
    detail: "rising 3 shifts · PM due in 18 h · WO drafted, not raised",
    cost: "$4,200",
    read: "Bearing wear signature. Raising the WO ahead of the PM catches it before it forces a stop mid-shift.",
  },
];

/** Kept for any consumer still reading the singular — points at the top row. */
export const LINE_EXCEPTION = LINE_EXCEPTIONS[0];

/* ── Machines table ─────────────────────────────────────────────────────────
 *
 * The technical rows behind the selected stage. A machine row is a *standing
 * condition*; it only becomes a decision-queue row once it crosses the
 * threshold that needs a person. Each row carries one primary action — chosen
 * by the kind of drift, not the viewer's role — plus a kebab of secondaries.
 */

/** Who owns the action. Drives the button's accent, not its prominence. */
export type ActionOwner = "adjust" | "maintain" | "sequence" | "lot" | "escalate" | "understand";

/** The Thresholds dial decides how a primary presents:
 *  auto  → greyed, the rule that let the engine act is in the tooltip
 *  limit → outlined ghost — allowed, but a person is confirming
 *  ask   → solid primary — this one is yours to make */
export type ThresholdState = "auto" | "limit" | "ask";

export interface MachineAction {
  label: string;
  owner: ActionOwner;
  state: ThresholdState;
  /** Tooltip naming the rule, shown on the auto state. */
  autoNote?: string;
  /** Most actions become a queue row; in-band nudges (Adjust setpoint) auto-log
   *  to the Automated tab instead of spawning a decision. */
  spawnsQueueRow?: boolean;
  /** The MakeAction this promotes to — opens the same deck the queue uses. */
  queueActionId?: string;
}

export interface MachineRow {
  id: string;
  /** The process stage this machine belongs to — keys into PROCESS_STAGES. */
  stageId: string;
  role: string;
  status: StageStatus;
  /** The one spec that decides this row, its live reading and its band. */
  spec: string;
  reading: string;
  band: string;
  readingTone?: "hot" | "warn";
  /** How long the reading has been outside the band — "—" when in band. */
  timeAboveSpec: string;
  /** What it puts at risk downstream, and the run rate of that risk. */
  affects: string;
  affectsTone?: "hot" | "warn";
  /** Labor overlay on the affects column — set only in a double-loss state
   *  (machine downtime and belt OT rising together). */
  otOverlay?: string;
  /** This machine's own Ignition pens — the trend workbench plots these. */
  pens: ReadonlyArray<StageSeries>;
  primary: MachineAction;
  secondaries: ReadonlyArray<MachineAction>;
  /** The decision brief behind the row — what the drawer shows. Kept to what
   *  a director needs to *decide*, not analyse: the bleed rate, the one-line
   *  forecast, the minimal trail, and one line per executive factor this
   *  machine currently lights. Deep analysis lives in the Historian. */
  brief?: {
    /** Money leaving right now — "$520/hr · $310 this shift", or "$0/hr". */
    bleed: string;
    bleedTone?: "hot" | "warn";
    /** Rowan's one sentence: what happens if this continues (the cascade). */
    forecast: string;
    /** Last work order on the asset — title · outcome · when. */
    lastWo: string;
    /** Mean time between failures, with drift arrow. */
    mtbf: string;
    /** Executive factors this machine lights, one line each — the code is the
     *  chip, the line is the number the exec would repeat to the board. */
    factors?: ReadonlyArray<{ code: string; line: string }>;
  };
}

/** Owner display metadata — label for the kebab, accent for the button. */
export const OWNER_META: Record<ActionOwner, { label: string; ink: string }> = {
  adjust: { label: "Adjust · line lead", ink: "var(--color-iris-700)" },
  maintain: { label: "Maintain · planner", ink: "var(--color-iris-700)" },
  sequence: { label: "Sequence · Sawyer", ink: "var(--text-danger)" },
  lot: { label: "Lot · plant mgr", ink: "var(--text-warning, #B7791F)" },
  escalate: { label: "Escalate", ink: "var(--text-danger)" },
  understand: { label: "Understand · Sage", ink: "var(--ds-text-secondary)" },
};

const EXPLAIN: MachineAction = { label: "Explain", owner: "understand", state: "limit" };

/**
 * Every machine on Line A, across the whole process — the table shows them
 * all; the stage strip filters. Pens are per-machine Ignition tags (the specs
 * that actually drive the executive factors: line speed, zone temps, screw
 * torque, kettle temp, IR PID feedback, vibration, drive current, tension).
 */
export const MACHINES: ReadonlyArray<MachineRow> = [
  {
    id: "Mixer-01",
    stageId: "compound",
    role: "batch mixer · backing compound",
    status: "nominal",
    spec: "Batch temp",
    reading: "385 °F",
    band: "385 ±5",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Batch temp", unit: "°F", plan: 385, tone: "primary", points: line([384, 385, 385, 386, 385, 385, 384, 385]) },
      { metric: "Feed pressure", unit: "psi", tone: "warn", points: line([2098, 2100, 2099, 2101, 2100, 2100, 2099, 2100]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast: "Batch is on spec — nothing here needs a decision.",
      lastWo: "WO-2024-2871 · agitator seal · resolved · 26 days ago",
      mtbf: "121 days · steady",
    },
  },
  {
    id: "Extruder-A",
    stageId: "extrude",
    role: "sheet extruder · zones 1–3",
    status: "nominal",
    spec: "Line speed",
    reading: "18.0 fpm",
    band: "≥ 18.0",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Line speed", unit: "fpm", plan: 18, tone: "primary", points: line([18, 18, 18.1, 18, 17.9, 18, 18, 18]) },
      { metric: "Zone 2 temp", unit: "°F", tone: "warn", points: line([470, 471, 472, 472, 471, 472, 472, 472]) },
      { metric: "Screw torque", unit: "%", tone: "hot", points: line([70, 71, 72, 71, 72, 72, 72, 72]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast:
        "Rate holds at standard. Screw torque is the signal to watch — a sustained rise is how melt inconsistency and thin spots start.",
      lastWo: "WO-2024-2544 · screw inspection · resolved · 33 days ago",
      mtbf: "84 days · steady",
      factors: [
        { code: "2.1", line: "Achieved rate rolling 4wk: 96% of standard — inside the promise band" },
      ],
    },
  },
  {
    id: "Backing 2 coater",
    stageId: "coat",
    role: "coating head · constraint line",
    status: "under",
    spec: "Line speed",
    reading: "17.4 fpm",
    band: "≥ 20.0",
    readingTone: "hot",
    timeAboveSpec: "22 min",
    affects: "DL-4471 · $14.2k/hr",
    affectsTone: "hot",
    pens: [
      {
        metric: "Line speed",
        unit: "fpm",
        plan: 20,
        tone: "primary",
        points: [
          { t: "13:32", v: 19.8 },
          { t: "13:42", v: 19.6 },
          { t: "13:52", v: 19.1 },
          { t: "14:02", v: 18.6 },
          { t: "14:12", v: 18.0 },
          { t: "14:22", v: 17.6 },
          { t: "14:32", v: 17.4 },
        ],
        history: weeks([20.2, 20.1, 20.0, 19.8, 19.9, 19.6, 19.2, 18.8]),
      },
      { metric: "Coat pressure", unit: "psi", tone: "warn", points: line([1850, 1848, 1842, 1838, 1832, 1828, 1824]), history: weeks([1980, 1975, 1960, 1952, 1940, 1921, 1890, 1860]) },
      { metric: "IR PID feedback", unit: "", tone: "hot", points: line([148, 150, 154, 158, 166, 172, 150]) },
    ],
    primary: {
      label: "Review · $14.2k costed",
      owner: "sequence",
      state: "ask",
      spawnsQueueRow: true,
      queueActionId: "act-reseq",
    },
    secondaries: [
      { label: "Hold the lot", owner: "lot", state: "limit", spawnsQueueRow: true },
      { label: "Escalate to planner", owner: "escalate", state: "limit", spawnsQueueRow: true },
      EXPLAIN,
    ],
    brief: {
      bleed: "$14.2k/hr · $5.2k this shift",
      bleedTone: "hot",
      forecast:
        "If the rate holds, the run finishes +4 h late — DL-4471 misses its slot and both orders' dates are at risk.",
      lastWo: "WO-2024-2210 · coat head rebuild · resolved · 41 days ago",
      mtbf: "63 days · steady",
      factors: [
        { code: "2.1", line: "Availability × performance 78% fwd 4wk — below the 80% promise floor" },
        { code: "5.3", line: "Shade-critical DL-4471 on · speed 13% under standard · 2 rolls held" },
        { code: "5.2", line: "Line B runs Dune 240 at 19.4 fpm vs 17.4 here · 22% headroom there" },
      ],
    },
  },
  {
    id: "Coat feeder 2",
    stageId: "coat",
    role: "resin feeder · zone 2",
    status: "watched",
    spec: "Setpoint",
    reading: "581",
    band: "610 nominal",
    readingTone: "warn",
    timeAboveSpec: "—",
    affects: "precoat starve risk",
    affectsTone: "warn",
    otOverlay: "+OT $0.056/SY ▲ on this belt",
    pens: [
      { metric: "Feeder 2 setpoint", unit: "", tone: "primary", points: line([610, 605, 600, 595, 590, 585, 581]), history: weeks([610, 610, 610, 608, 605, 600, 592, 585]) },
      { metric: "Precoat rate", unit: "%", tone: "warn", points: line([99, 99, 98, 98, 97, 97, 96]) },
    ],
    primary: {
      label: "Adjust setpoint",
      owner: "adjust",
      state: "auto",
      autoNote: "within ±8% band — auto-logs, no sign-off",
      spawnsQueueRow: false,
    },
    secondaries: [
      { label: "Raise WO", owner: "maintain", state: "limit", spawnsQueueRow: true, queueActionId: "act-wo" },
      EXPLAIN,
    ],
    brief: {
      bleed: "$0/hr · drift only",
      forecast:
        "Setpoint is drifting down; below 560 the precoat starves, the line stops, and OT gets bought to catch up — the double-loss.",
      lastWo: "WO-2024-3020 · feeder recalibration · resolved · 18 days ago",
      mtbf: "88 days · steady",
      factors: [
        { code: "3.3", line: "Feeder starve preceded 3 stops in 12 mo · avoidable cost $9.4k" },
        { code: "3.2", line: "OT/SY on this belt $0.056 ▲ +38% vs 3wk MA — double-loss forming" },
      ],
    },
  },
  {
    id: "Coat feeder 1",
    stageId: "coat",
    role: "resin feeder · zone 1",
    status: "nominal",
    spec: "Setpoint",
    reading: "608",
    band: "610 nominal",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Feeder 1 setpoint", unit: "", plan: 610, tone: "primary", points: line([610, 609, 610, 608, 609, 608, 608]) },
      { metric: "Precoat rate", unit: "%", tone: "warn", points: line([99, 99, 99, 98, 99, 99, 99]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast: "Holding nominal — no drift on this feeder.",
      lastWo: "WO-2024-2933 · nozzle clean · resolved · 15 days ago",
      mtbf: "95 days · steady",
    },
  },
  {
    id: "Cure oven 1",
    stageId: "coat",
    role: "precoat cure oven",
    status: "nominal",
    spec: "Cure",
    reading: "98%",
    band: "≥ 96%",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Cure", unit: "%", plan: 96, tone: "primary", points: line([98, 98, 98, 97, 98, 98, 98]) },
      { metric: "Kettle temp", unit: "°F", tone: "warn", points: line([372, 372, 371, 372, 373, 372, 372]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast:
        "Cure holds at 98%. Under-cure is the silent one — a weak bond shows up as a delam claim four months out, not on this shift.",
      lastWo: "WO-2024-2790 · zone-2 element swap · resolved · 29 days ago",
      mtbf: "104 days · steady",
    },
  },
  {
    id: "Tuft-01",
    stageId: "tuft",
    role: "tufter · loop pile",
    status: "nominal",
    spec: "Vibration",
    reading: "2.1 mm/s",
    band: "≤ 6.0",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Vibration", unit: "mm/s", plan: 6, tone: "primary", points: line([2.0, 2.1, 2.1, 2.0, 2.1, 2.1, 2.1]) },
      { metric: "Rate", unit: "fpm", tone: "warn", points: line([17.3, 17.3, 17.2, 17.3, 17.3, 17.3, 17.3]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast: "Clean — every reading inside its band.",
      lastWo: "WO-2024-3077 · needle change · resolved · 6 days ago",
      mtbf: "102 days · steady",
    },
  },
  {
    id: "Tuft-02",
    stageId: "tuft",
    role: "tufter · cut pile",
    status: "nominal",
    spec: "Vibration",
    reading: "2.8 mm/s",
    band: "≤ 6.0",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Vibration", unit: "mm/s", plan: 6, tone: "primary", points: line([2.7, 2.8, 2.8, 2.7, 2.8, 2.9, 2.8]) },
      { metric: "Yarn tension", unit: "g", tone: "warn", points: line([84, 84, 85, 84, 84, 85, 84]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast: "Clean — tension steady, no snag pattern.",
      lastWo: "WO-2024-3011 · loop bar inspection · resolved · 16 days ago",
      mtbf: "89 days · steady",
    },
  },
  {
    id: "Tuft-04",
    stageId: "tuft",
    role: "tufter · motor bearing",
    status: "watched",
    spec: "Vibration",
    reading: "7.2 mm/s",
    band: "≤ 6.0",
    readingTone: "hot",
    timeAboveSpec: "18 min",
    affects: "PM due 18 h · $4.2k/hr",
    affectsTone: "warn",
    pens: [
      {
        metric: "Vibration",
        unit: "mm/s",
        plan: 6,
        tone: "primary",
        points: [
          { t: "13:32", v: 5.1 },
          { t: "13:42", v: 5.4 },
          { t: "13:52", v: 5.9 },
          { t: "14:02", v: 6.3 },
          { t: "14:12", v: 6.8 },
          { t: "14:22", v: 7.0 },
          { t: "14:32", v: 7.2 },
        ],
        history: weeks([2.2, 2.4, 2.8, 3.1, 3.6, 4.2, 5.4, 7.2]),
      },
      { metric: "Drive current", unit: "A", tone: "warn", points: line([41, 41, 42, 43, 44, 45, 46]) },
      { metric: "Rate", unit: "fpm", tone: "hot", points: line([17.4, 17.3, 17.3, 17.2, 17.2, 17.2, 17.2]) },
    ],
    primary: {
      label: "Raise WO",
      owner: "maintain",
      state: "ask",
      spawnsQueueRow: true,
      queueActionId: "act-wo",
    },
    secondaries: [
      { label: "Escalate to planner", owner: "escalate", state: "limit", spawnsQueueRow: true },
      EXPLAIN,
    ],
    brief: {
      bleed: "$4.2k/hr if it stops",
      bleedTone: "warn",
      forecast:
        "Vibration has risen 3 shifts straight and drive current with it; unchecked, bearing seizure risk lands inside the next 3 lots.",
      lastWo: "WO-2024-1180 · bearing replacement · resolved · 4 months ago",
      mtbf: "42 days · worsening",
      factors: [
        { code: "3.3", line: "Vibration preceded 3 of the last 4 stops — the sensor-case asset" },
      ],
    },
  },
  {
    id: "Tuft-03",
    stageId: "tuft",
    role: "tufter · needle bar",
    status: "nominal",
    spec: "Vibration",
    reading: "2.4 mm/s",
    band: "≤ 6.0",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Vibration", unit: "mm/s", plan: 6, tone: "primary", points: line([2.3, 2.4, 2.4, 2.3, 2.4, 2.4, 2.4]) },
      { metric: "Rate", unit: "fpm", tone: "warn", points: line([17.2, 17.2, 17.3, 17.2, 17.2, 17.3, 17.2]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast: "Nothing on this asset needs a decision — every reading is inside its band.",
      lastWo: "WO-2024-2988 · needle bar PM · resolved · 9 days ago",
      mtbf: "97 days · steady",
    },
  },
  {
    id: "Card 4",
    stageId: "tuft",
    role: "card · yarn prep feed",
    status: "watched",
    spec: "Bearing temp",
    reading: "68 °C",
    band: "≤ 70 · base 55",
    readingTone: "warn",
    timeAboveSpec: "—",
    affects: "yarn feed to Tuft bank",
    affectsTone: "warn",
    pens: [
      { metric: "Bearing temp", unit: "°C", plan: 70, tone: "primary", points: line([61, 62, 63, 64, 66, 67, 68]) },
      { metric: "Feed rate", unit: "lb/hr", tone: "warn", points: line([410, 410, 409, 410, 408, 409, 409]) },
    ],
    primary: {
      label: "Raise check-in ticket",
      owner: "maintain",
      state: "ask",
      spawnsQueueRow: false,
    },
    secondaries: [EXPLAIN],
    brief: {
      bleed: "$0/hr · trending",
      bleedTone: "warn",
      forecast:
        "Bearing temp is 13 °C over its base and climbing; before the next PM window it becomes a stop that starves the tuft bank.",
      lastWo: "WO-2024-2450 · bearing lube · resolved · 38 days ago",
      mtbf: "58 days · worsening",
      factors: [
        { code: "3.3", line: "Temp rise preceded the last 2 card stops — monitorable signal" },
      ],
    },
  },
  {
    id: "Warper-02",
    stageId: "warp",
    role: "warper · creel & beams",
    status: "nominal",
    spec: "Beam tension",
    reading: "120 g",
    band: "120 ±6",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Beam tension", unit: "g", plan: 120, tone: "primary", points: line([120, 119, 121, 120, 120, 119, 120, 121]) },
      { metric: "Ends running", unit: "", tone: "warn", points: line([1188, 1188, 1188, 1188, 1188, 1188, 1188, 1188]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast:
        "Tension is steady. The pressure on warp is upstream scrap: faster yarn draw-down is what pushes warp OT up.",
      lastWo: "WO-2024-3102 · creel tensioner service · resolved · 12 days ago",
      mtbf: "110 days · steady",
      factors: [
        { code: "3.2", line: "Warp OT/SY broke its band 4 of last 6 weeks — sequencing pushing warp late" },
      ],
    },
  },
  {
    id: "Shear-01",
    stageId: "shear",
    role: "shear · pile height",
    status: "nominal",
    spec: "Shear height",
    reading: "8.2 mm",
    band: "8.2 ±0.2",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Shear height", unit: "mm", plan: 8.2, tone: "primary", points: line([8.2, 8.2, 8.1, 8.2, 8.3, 8.2, 8.2, 8.2]) },
      { metric: "Reject rate", unit: "%", tone: "warn", points: line([0.2, 0.2, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast: "Within tolerance both passes — nothing to decide.",
      lastWo: "WO-2024-2660 · blade change · resolved · 21 days ago",
      mtbf: "76 days · steady",
    },
  },
  {
    id: "Range-01",
    stageId: "finish",
    role: "finishing range · steam & roll-up",
    status: "nominal",
    spec: "Steam pressure",
    reading: "45 psi",
    band: "45 ±3",
    timeAboveSpec: "—",
    affects: "—",
    pens: [
      { metric: "Steam pressure", unit: "psi", plan: 45, tone: "primary", points: line([45, 45, 44, 45, 46, 45, 45, 45]) },
      { metric: "Roll length", unit: "yd", tone: "warn", points: line([3390, 3395, 3400, 3402, 3405, 3408, 3410]) },
    ],
    primary: EXPLAIN,
    secondaries: [],
    brief: {
      bleed: "$0/hr",
      forecast: "Steam and roll-up nominal — grader queue is two rolls, normal.",
      lastWo: "WO-2024-2451 · steam trap service · resolved · 37 days ago",
      mtbf: "93 days · steady",
    },
  },
];

/** All machines, or the ones on one stage when the strip filters. */
export function machinesFor(stageId: string | null): ReadonlyArray<MachineRow> {
  if (!stageId) return MACHINES;
  return MACHINES.filter((m) => m.stageId === stageId);
}

/** Helper: turn a list of values into a clock-ticked series across the last
 *  hour. `prefix` seeds the label so ticks read like 13:30, 13:38 … */
/** Turn a list of values into a clock-ticked series. Ticks step 10 min back
 *  from 14:32, so every stage's chip sparkline lines up with the focused view. */
function line(values: number[]): ReadonlyArray<{ t: string; v: number }> {
  const start = 13 * 60 + 32; // 13:32
  const step = 10;
  return values.map((v, i) => {
    const m = start + i * step;
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return { t: `${hh}:${mm.toString().padStart(2, "0")}`, v };
  });
}

/* ── Machine-health KPIs ────────────────────────────────────────────────────
 *
 * The standing scorecard above the flow strip — is the machine layer costing
 * money, and where. Four headline reads: labour tied to machine stops, the
 * rate-loss that inflates cost per SY, the cost of machine-caused downtime,
 * and the shade-critical SKU whose fixed date the constraint belt threatens.
 * The last one is a decision, not a gauge — it opens the re-sequence deck.
 */
export interface MachineKpi {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone?: "good" | "warn" | "bad";
  /** Tooltip: what the figure counts, so it can be argued with. */
  info: string;
  /** When set, the tile promotes to this Make decision rather than just reading. */
  actionId?: string;
}

export const MACHINE_HEALTH_KPIS: ReadonlyArray<MachineKpi> = [
  {
    key: "labour",
    label: "Labour efficiency",
    value: "84%",
    detail: "16% of crew hours idle on machine stops",
    tone: "warn",
    info: "Crew hours on a running machine ÷ crew hours available. Labour is paid whether the machine runs or not, so every machine stop with a crew standing by is the loss this tracks — maintaining vs available.",
  },
  {
    key: "costsy",
    label: "Cost per SY",
    value: "$1.94",
    detail: "vs $1.79 budget · Backing 2 rate loss",
    tone: "bad",
    info: "A machine under rate spreads the same fixed cost over fewer square yards, so cost per SY climbs. Backing 2 at 17.4 vs 20 fpm is the driver — the machines can't hit rate on it.",
  },
  {
    key: "downtime",
    label: "Machine downtime cost",
    value: "$28k",
    detail: "31 h this window · Tuft-04 · Coat feeder",
    tone: "bad",
    info: "Cost of belt time lost to machine faults specifically — held separate from sequencing and changeover downtime so the machine-caused share is its own number.",
  },
  {
    key: "shade",
    label: "Shade-critical at risk",
    value: "DL-4471",
    detail: "$14.2k/hr · fixed install date",
    tone: "bad",
    info: "DL-4471 is shade-critical and committed to a fixed install on Sawyer's board. Backing 2 running under rate threatens that date — the levers are eat the cost, re-sequence to protect it, or raise the price / renegotiate the date. Opens the decision.",
    actionId: "act-reseq",
  },
];

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
  /** One line under the chip — what the status means right now. */
  note: string;
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
    note: "Under rate 13% · 22 min",
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

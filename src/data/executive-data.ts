// Data that only the executive dashboard needs.
//
// Everything the dashboard can derive from an agent's own page, it derives —
// margin from Quality's bridge, claims from Quality's queue, scheduling from
// Sawyer's backlog. A roll-up that keeps its own copy of a number will
// eventually disagree with the page it came from, and the person who spots it
// stops trusting both.
//
// What's here is the two things no page owns: a machine's health over time,
// and how the plants compare.

import { PLANT_ORDER, PLANTS, type PlantId } from "@/types/division";

/* ─── Machine health ────────────────────────────────────────────────────── */

/**
 * Downtime on a machine, split by the reason it stopped.
 *
 * Health here is measured the only way the product actually measures it —
 * minutes lost. An earlier version plotted vibration as a trend, which the
 * plant does not track: vibration is a spot reading on the machine record, not
 * a series, and charting it would have been inventing data to fill a shape.
 *
 * There is one series per machine, not one machine. A plant runs many, and an
 * executive card that showed only the worst would never let anyone confirm the
 * rest are fine — which is half of what "how are the machines" means. The
 * constraint defaults open because it is the one carrying the week's story;
 * the others are quiet on purpose.
 *
 * The reasons are Make's own vocabulary, so the split here and the split in
 * Rowan's deck are the same four causes.
 */
export interface DowntimePoint {
  time: string;
  material: number;
  changeover: number;
  quality: number;
  operator: number;
}

export interface Machine {
  id: string;
  /** The equipment, named the way the floor names it. */
  name: string;
  /** The process it sits in — Backing, Tufting, Finishing, Press, Coating. */
  process: string;
  /** True for the plant's constraint unit, the one that decides the shift. */
  constraint?: boolean;
  series: ReadonlyArray<DowntimePoint>;
}

const ZERO = { material: 0, changeover: 0, quality: 0, operator: 0 };
const HOURS = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "00:00"];

/** A light, healthy series — a few minutes of ordinary stops, nothing growing. */
function calm(seed: number[]): ReadonlyArray<DowntimePoint> {
  return HOURS.map((time, i) => ({
    time,
    ...ZERO,
    changeover: i === 0 ? 0 : seed[i % seed.length],
    operator: i % 4 === 0 ? 1 : 0,
  }));
}

/** The constraint unit's series — climbing toward the PM, the demo's story. */
const CONSTRAINT_SERIES: ReadonlyArray<DowntimePoint> = [
  { time: "06:00", ...ZERO },
  { time: "08:00", material: 2, changeover: 3, quality: 0, operator: 0 },
  { time: "10:00", material: 6, changeover: 4, quality: 2, operator: 0 },
  { time: "12:00", material: 3, changeover: 4, quality: 0, operator: 2 },
  { time: "14:00", material: 5, changeover: 4, quality: 3, operator: 2 },
  { time: "16:00", material: 2, changeover: 3, quality: 3, operator: 0 },
  { time: "18:00", material: 8, changeover: 4, quality: 4, operator: 2 },
  { time: "20:00", material: 9, changeover: 5, quality: 5, operator: 3 },
  { time: "22:00", material: 11, changeover: 5, quality: 6, operator: 4 },
  { time: "00:00", material: 13, changeover: 6, quality: 7, operator: 5 },
];

/**
 * The equipment on each plant's floor, named the way the floor names it.
 *
 * Machines, not belts: an executive picks a plant and sees its actual units —
 * the tufters, backing lines, ovens and presses — rather than an abstract
 * process. The plant's constraint unit (its `constraintLine`) leads and carries
 * the climbing series; the rest are quiet, which is the point of showing them.
 */
export const MACHINES_BY_PLANT: Record<PlantId, ReadonlyArray<Machine>> = {
  // Plant 04 is the demo's plant: Backing Line 2 is its constraint, the unit
  // running 12% slow that the whole scheduling narrative turns on.
  p04: [
    { id: "p04-b2", name: "Backing Line 2", process: "Backing", constraint: true, series: CONSTRAINT_SERIES },
    { id: "p04-c3", name: "Precoat Applicator 3", process: "Backing", series: calm([0, 2, 1, 2, 1, 3, 1]) },
    { id: "p04-o1", name: "Cure Oven 1", process: "Backing", series: calm([0, 1, 2, 1, 1, 2, 1]) },
    { id: "p04-t14", name: "Tufter 14", process: "Tufting", series: calm([0, 1, 1, 2, 1, 1, 2]) },
  ],
  p07: [
    { id: "p07-b1", name: "Backing Line 1", process: "Backing", constraint: true, series: CONSTRAINT_SERIES },
    { id: "p07-t9", name: "Tufter 9", process: "Tufting", series: calm([0, 2, 1, 3, 1, 2, 1]) },
    { id: "p07-c2", name: "Precoat Applicator 2", process: "Backing", series: calm([0, 1, 2, 1, 1, 2, 1]) },
    { id: "p07-o1", name: "Cure Oven 1", process: "Backing", series: calm([0, 1, 1, 2, 2, 1, 1]) },
  ],
  p15: [
    { id: "p15-f2", name: "Finishing Frame 2", process: "Finishing", constraint: true, series: CONSTRAINT_SERIES },
    { id: "p15-b1", name: "Backing Line 1", process: "Backing", series: calm([0, 2, 1, 2, 1, 2, 1]) },
    { id: "p15-i1", name: "Inspection Frame 1", process: "Finishing", series: calm([0, 1, 1, 1, 2, 1, 1]) },
  ],
};

/** A machine's series with a running total, which is what actually decides
 *  whether it waits for its PM or somebody goes now. */
export function cumulative(series: ReadonlyArray<DowntimePoint>) {
  let run = 0;
  return series.map((p) => {
    const total = p.material + p.changeover + p.quality + p.operator;
    run += total;
    return { ...p, total, cumulative: run };
  });
}

/** Total minutes lost on a machine this shift — for ranking them in the header. */
export const machineLost = (m: Machine) =>
  m.series.reduce((n, p) => n + p.material + p.changeover + p.quality + p.operator, 0);

/** Minutes of downtime a shift is allowed before the line is reviewed. */
export const DOWNTIME_BUDGET = 90;

/** Where the planned maintenance starts — the point the series is running at. */
export const HEALTH_PM_AT = "00:00";

/** Where "now" sits in the shift. Everything up to it is measured; everything
 *  after is the projection the agents are running — the half of the chart that
 *  answers "does it blow the budget before the PM", not "did it already". */
export const HEALTH_NOW = "18:00";

/** The reasons, in the order they stack, with the colour each carries. Two of
 *  them trace to decisions made elsewhere in the product, which is why the
 *  split is worth drawing at all rather than one bar of "downtime". */
export const DOWNTIME_REASONS: ReadonlyArray<{
  key: keyof Omit<DowntimePoint, "time">;
  label: string;
  colour: string;
}> = [
  { key: "material", label: "Material-out (yarn)", colour: "var(--color-iris-500)" },
  { key: "changeover", label: "Changeover", colour: "var(--lane-limit-bd)" },
  { key: "quality", label: "Quality hold", colour: "var(--text-danger)" },
  { key: "operator", label: "No operator", colour: "var(--border-default)" },
];

/* ─── Machine uptime / downtime ─────────────────────────────────────────── */

/**
 * The plant's machines, grouped the way the floor is — by process — with the
 * downtime each recorded across the day. A machine's row is a strip of the
 * production day: running (green) with the stops it took (coloured by cause)
 * drawn where they happened. The constraint unit's stops add up to the low
 * uptime that decides the whole plant's day.
 */
export const HEALTH_SHIFT = { startHour: 6, hours: 12 } as const; // 06:00–18:00

export type DowntimeReason = "material" | "changeover" | "quality" | "operator";

export interface MachineDowntime {
  /** Hours from the start of the shift. */
  at: number;
  hours: number;
  reason: DowntimeReason;
}

export interface HealthMachine {
  code: string;
  /** The plant's constraint unit — its downtime costs the whole plant. */
  constraint?: boolean;
  downtime: ReadonlyArray<MachineDowntime>;
}

export interface HealthGroup {
  process: string;
  machines: ReadonlyArray<HealthMachine>;
}

export const DOWNTIME_REASON_LABEL: Record<DowntimeReason, string> = {
  material: "Material-out",
  changeover: "Changeover",
  quality: "Quality hold",
  operator: "No operator",
};

export const DOWNTIME_REASON_COLOR: Record<DowntimeReason, string> = {
  material: "var(--color-iris-500)",
  changeover: "var(--lane-limit-ink)",
  quality: "var(--text-danger)",
  operator: "var(--ds-text-secondary)",
};

export const MACHINE_HEALTH: ReadonlyArray<HealthGroup> = [
  {
    process: "Tufting",
    machines: [
      { code: "TUF-01", downtime: [{ at: 1.5, hours: 0.4, reason: "changeover" }, { at: 7, hours: 0.3, reason: "operator" }] },
      { code: "TUF-02", downtime: [{ at: 3, hours: 0.5, reason: "material" }] },
      { code: "TUF-03", downtime: [{ at: 5, hours: 0.3, reason: "changeover" }, { at: 9, hours: 0.4, reason: "quality" }] },
    ],
  },
  {
    process: "Dyeing",
    machines: [
      { code: "BECK-1", downtime: [{ at: 2, hours: 0.6, reason: "changeover" }] },
      { code: "CDR-1", downtime: [{ at: 6, hours: 0.4, reason: "material" }, { at: 10, hours: 0.3, reason: "operator" }] },
    ],
  },
  {
    process: "Backing",
    machines: [
      {
        code: "BAK-01",
        constraint: true,
        downtime: [
          { at: 1, hours: 0.5, reason: "material" },
          { at: 3.5, hours: 0.6, reason: "quality" },
          { at: 6, hours: 1.0, reason: "material" },
          { at: 9, hours: 0.8, reason: "changeover" },
          { at: 11, hours: 0.5, reason: "quality" },
        ],
      },
      { code: "BAK-02", downtime: [{ at: 4, hours: 0.4, reason: "operator" }, { at: 8, hours: 0.3, reason: "material" }] },
    ],
  },
  {
    process: "Finishing",
    machines: [
      { code: "FIN-01", downtime: [{ at: 2.5, hours: 0.4, reason: "changeover" }] },
      { code: "FIN-02", downtime: [{ at: 7, hours: 0.3, reason: "material" }] },
    ],
  },
];

/** Hours a machine was down across the shift, and its uptime as a percentage. */
export const downtimeHours = (m: HealthMachine) => m.downtime.reduce((n, d) => n + d.hours, 0);
export const machineUptimePct = (m: HealthMachine) =>
  Math.round(((HEALTH_SHIFT.hours - downtimeHours(m)) / HEALTH_SHIFT.hours) * 100);

/** A group's average uptime, for its process heading. */
export const groupUptimePct = (g: HealthGroup) =>
  Math.round(g.machines.reduce((n, m) => n + machineUptimePct(m), 0) / g.machines.length);

/** Clock label for an hour offset into the shift — "09:00", "12:00". */
export const healthClock = (hoursFromStart: number) =>
  `${String((HEALTH_SHIFT.startHour + Math.round(hoursFromStart)) % 24).padStart(2, "0")}:00`;

/** A machine's nominal output when it is running, in linear yards per hour. */
export const MACHINE_RATE = 420;

/**
 * A machine's output across the shift, sampled every quarter hour.
 *
 * This is the honest way to read uptime against downtime: the line sits at rate
 * while the machine runs and falls to zero while it is stopped, so the area
 * under it *is* the yardage it produced. A flat strip tells you a machine
 * stopped; this tells you what the stop cost in output.
 */
export interface OutputPoint {
  /** Hours from the start of the shift. */
  t: number;
  clock: string;
  rate: number;
  /** The reason it was stopped at this moment, if it was. */
  reason: DowntimeReason | null;
}

const STEP = 0.25;

export function outputSeries(m: HealthMachine): OutputPoint[] {
  const points: OutputPoint[] = [];
  for (let t = 0; t <= HEALTH_SHIFT.hours; t += STEP) {
    const stop = m.downtime.find((d) => t >= d.at && t < d.at + d.hours);
    points.push({
      t: Number(t.toFixed(2)),
      clock: healthClock(t),
      rate: stop ? 0 : MACHINE_RATE,
      reason: stop ? stop.reason : null,
    });
  }
  return points;
}

/** Yards actually produced across the shift — the area under the output line. */
export const machineOutput = (m: HealthMachine) =>
  Math.round((HEALTH_SHIFT.hours - downtimeHours(m)) * MACHINE_RATE);

/**
 * Every machine in a group on one chart: cumulative yards against the clock.
 *
 * A machine's line climbs while it runs and goes flat while it is stopped, so
 * the flat stretches *are* its downtime and the height at any moment is what it
 * has actually made. Two machines on one axis then answer the real question
 * directly — how much output the stops cost, as the gap that opens between the
 * lines.
 */
export function cumulativeOutputSeries(
  machines: ReadonlyArray<HealthMachine>,
): Array<Record<string, number | string>> {
  const rows: Array<Record<string, number | string>> = [];
  const made = machines.map(() => 0);

  for (let t = 0; t <= HEALTH_SHIFT.hours + 1e-9; t += STEP) {
    const at = Number(t.toFixed(2));
    const row: Record<string, number | string> = { t: at, clock: healthClock(at) };
    machines.forEach((m, i) => {
      // Whether it is stopped at this instant, and whether it was across the
      // step that just elapsed.
      const stoppedNow = m.downtime.some((d) => at >= d.at && at < d.at + d.hours);
      if (at > 0) {
        const prev = at - STEP;
        const wasStopped = m.downtime.some((d) => prev >= d.at && prev < d.at + d.hours);
        if (!wasStopped) made[i] += MACHINE_RATE * STEP;
      }
      row[m.code] = Math.round(made[i]);
      // A parallel series carrying only the stalled stretches, so they can be
      // drawn over the line as a visible break in production. `null` elsewhere
      // keeps the segments separate rather than joining them up.
      const stalledEdge =
        stoppedNow || m.downtime.some((d) => Math.abs(at - (d.at + d.hours)) < 1e-9);
      row[`${m.code}__stalled`] = stalledEdge ? Math.round(made[i]) : (null as unknown as number);
    });
    rows.push(row);
  }
  return rows;
}

/** Line colours for the machines in a group. The constraint takes the amber the
 *  product uses for it everywhere; the rest are neutral, because a data series
 *  is not an agent contribution and iris is reserved for those. */
export const MACHINE_LINE_COLORS = ["#3F3F47", "#0F766E", "#6B7280", "#9A3412"];
export const CONSTRAINT_LINE_COLOR = "var(--lane-limit-ink)";

/**
 * Where the plant's lost minutes went, by cause.
 *
 * The uptime charts say *when* each machine stopped; this says *what keeps
 * stopping them*. Summed across every machine on the floor, because a cause
 * worth fixing is usually a cause that shows up on more than one line.
 */
export function downtimeByReason(
  groups: ReadonlyArray<HealthGroup> = MACHINE_HEALTH,
): Array<{ reason: DowntimeReason; label: string; minutes: number }> {
  const totals = new Map<DowntimeReason, number>();
  groups.forEach((g) =>
    g.machines.forEach((m) =>
      m.downtime.forEach((d) => {
        totals.set(d.reason, (totals.get(d.reason) ?? 0) + d.hours * 60);
      }),
    ),
  );
  return [...totals.entries()]
    .map(([reason, minutes]) => ({
      reason,
      label: DOWNTIME_REASON_LABEL[reason],
      minutes: Math.round(minutes),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

/* ─── Plant performance ─────────────────────────────────────────────────── */

export interface PlantPerformance {
  plant: PlantId;
  /** Thousands of linear yards planned and produced this week. */
  expected: number;
  actual: number;
  /** Thousands of dollars already committed to catching up — overtime,
   *  expedited freight, changeovers bought to re-sequence. Money spent, as
   *  opposed to money merely at risk. */
  recoverySpend: number;
}

/** Contribution per linear yard. A missed yard is not lost revenue — the fibre
 *  is unspent — so a shortfall is valued at contribution, not at list. */
export const CONTRIBUTION_PER_YD = 6.2;

/** What a plant's shortfall is worth, in thousands. Zero when it is ahead:
 *  running over plan is not money at risk, and colouring it as though it were
 *  is how a dashboard trains people to ignore it. */
export function atRisk(p: PlantPerformance): number {
  const short = p.expected - p.actual;
  return short > 0 ? short * CONTRIBUTION_PER_YD : 0;
}

/**
 * Expected against actual for every plant.
 *
 * Plant 04 is the one carrying the story everywhere else in the product — its
 * constraint belt is running 12% slow — so it is the one visibly short here.
 * The others are close enough to plan to be uninteresting, which is the point:
 * a roll-up earns its place by making the exception obvious, not by showing
 * numbers of equal weight.
 */
export const PLANT_PERFORMANCE: ReadonlyArray<PlantPerformance> = [
  // Plant 04 is the one carrying the story — Backing 2 running 12% slow — so it
  // is the one visibly short here; the other two are close enough to be quiet.
  { plant: "p04", expected: 141, actual: 124, recoverySpend: 31.8 },
  { plant: "p07", expected: 132, actual: 129, recoverySpend: 4.2 },
  { plant: "p15", expected: 118, actual: 117, recoverySpend: 1.4 },
];

export const plantPerfLabel = (id: PlantId) => PLANTS[id].code;

/** Ordered the way the plant selector is, so the two never disagree. */
export const PLANT_PERF_ORDER = PLANT_ORDER;

/* ─── Margin ────────────────────────────────────────────────────────────── */

/**
 * What the plant actually earned this week, against what it was planned to.
 *
 * Distinct from Quality's "margin at risk", which is exposure — the
 * first-quality-to-seconds gap on product already made. This is the money in
 * hand. A dashboard that shows only the risk number invites the reading that
 * the plant lost $41k, when what happened is it earned $1.24m and $41k of that
 * is in question.
 */
export const MARGIN = {
  /** Thousands of dollars of contribution, this week. */
  achieved: 1243,
  plan: 1310,
};

export const marginVsPlan = () =>
  Math.round(((MARGIN.achieved - MARGIN.plan) / MARGIN.plan) * 1000) / 10;

/* ─── Work in progress & engine savings ────────────────────────────────── */

/**
 * What is on the floor right now, in money.
 *
 * Carpet passes through four stages before it ships, and every yard sitting
 * between them is capital the plant has spent and not yet earned back. WIP is
 * the figure a plant director is asked about when the mill is busy but cash
 * isn't moving — and unlike margin, it is theirs to fix, by unblocking the
 * constraint rather than by pricing.
 *
 * Measured against a target rather than a plan: more WIP is not better, so the
 * good direction here is *down*.
 */
export const WIP = {
  /** Thousands of dollars of part-finished goods on the floor. */
  value: 2380,
  target: 2240,
  /** Linear yards those dollars represent, across the four stages. */
  yards: 38200,
  stages: 4,
};

export const wipVsTarget = () =>
  Math.round(((WIP.value - WIP.target) / WIP.target) * 1000) / 10;

/**
 * What the engine saved this week — waste right-sized out, changeovers
 * campaigned cheaper, recovery spend avoided. The product's own dollar
 * scoreboard, the number no conventional plant dashboard carries.
 */
export const ENGINE_SAVINGS = {
  /** Thousands of dollars saved this week. */
  total: 47,
  /** Week-over-week change, in points. */
  wkChange: 12,
};

/* ─── Belt rate ─────────────────────────────────────────────────────────── */

/**
 * All three belts against their own standard, as a percentage of it.
 *
 * Normalised on purpose. The belts run at 520, 420 and 610 yd/hr, so plotting
 * raw rates puts three lines on one axis that cannot be compared — Finishing
 * would sit highest simply for being the fastest process, which says nothing
 * about whether it is performing. As a share of each belt's own standard the
 * three become comparable and the reference line is a single meaningful 100%.
 *
 * Backing 2 is the one that dives. That is the whole demo: the constraint belt
 * losing 12% while the belts either side of it hold, which is why an hour lost
 * there is lost for the plant and an hour lost elsewhere is not.
 */
export interface BeltRatePoint {
  time: string;
  tufting: number;
  backing: number;
  finishing: number;
}

export const BELT_RATE_SERIES: ReadonlyArray<BeltRatePoint> = [
  { time: "06:00", tufting: 98.5, backing: 99.0, finishing: 98.2 },
  { time: "06:10", tufting: 98.8, backing: 97.6, finishing: 97.9 },
  { time: "06:20", tufting: 98.2, backing: 96.4, finishing: 98.4 },
  { time: "06:30", tufting: 98.9, backing: 94.8, finishing: 97.6 },
  { time: "06:40", tufting: 98.1, backing: 92.4, finishing: 98.1 },
  { time: "06:50", tufting: 98.6, backing: 89.5, finishing: 97.8 },
  { time: "07:00", tufting: 98.3, backing: 87.9, finishing: 98.0 },
];

export const BELT_LINES: ReadonlyArray<{
  key: keyof Omit<BeltRatePoint, "time">;
  label: string;
  colour: string;
  constraint?: boolean;
}> = [
  { key: "tufting", label: "Tufting 3", colour: "var(--ds-text-secondary)" },
  { key: "backing", label: "Backing 2", colour: "var(--text-danger)", constraint: true },
  { key: "finishing", label: "Finishing 1", colour: "var(--color-iris-500)" },
];

/* ─── Commitments ───────────────────────────────────────────────────────── */

/**
 * Orders promised against orders delivered on the promised date.
 *
 * The only figure on the dashboard a customer would recognise. Everything else
 * — output, yield, downtime, margin — is the plant talking to itself; this is
 * the plant talking to Kestrel Flooring. An operations executive is asked
 * "are we going to make the date", not "what was yield".
 */
export const ON_TIME = {
  /** Orders due this week. */
  committed: 51,
  /** Shipped on or before the promised date. */
  onTime: 47,
  /** Already late. */
  late: 3,
  /** Still open and forecast to miss — ORD-77310 is the one the whole demo
   *  turns on, which is why the number is not zero. */
  atRisk: 1,
};

export const onTimePct = () => Math.round((ON_TIME.onTime / ON_TIME.committed) * 1000) / 10;

/* ─── Autonomy ──────────────────────────────────────────────────────────── */

/**
 * How much of the week the engine settled without interrupting anybody.
 *
 * This is the product's own scoreboard, and the one number here that no
 * conventional manufacturing dashboard would carry. It is also what the
 * Thresholds dial moves: widen a limit and this rises — the question an
 * executive should then ask is whether claims rose with it.
 */
export const AUTONOMY = {
  /** Exceptions the agents closed inside their limits, this week. */
  resolved: 128,
  /** Exceptions that reached a person. */
  escalated: 19,
};

export const autonomyPct = () =>
  Math.round((AUTONOMY.resolved / (AUTONOMY.resolved + AUTONOMY.escalated)) * 1000) / 10;

/* ─── Trends behind the headline tiles ──────────────────────────────────── */

/** Seven days, oldest first. Sparklines only — never labelled, because the
 *  figure beside them is the number that matters and the shape is context. */
export const EXEC_TRENDS: Record<string, ReadonlyArray<number>> = {
  margin: [38.2, 39.6, 37.1, 41.4, 40.2, 42.8, 41.2],
  yield: [93.1, 93.8, 92.4, 94.6, 93.9, 94.4, 94.1],
  claims: [1, 0, 2, 1, 0, 1, 3],
  onTime: [95.8, 94.1, 96.2, 93.5, 94.8, 92.9, 92.2],
  autonomy: [71.4, 74.8, 79.1, 80.6, 83.9, 85.2, 87.1],
};

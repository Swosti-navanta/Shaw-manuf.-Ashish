// Performance analytics — the roll-up read. Three views off one page:
// Executive (financial / margin / attainment), MFG (OEE / yield / downtime),
// and Labor (overtime, mirroring the P13 tracker). Illustrative fixtures shaped
// so TM1 (financials), Ignition (machine) and the P13 Excel can each replace a
// block without the page changing.

import { plantLabel } from "@/types/division";

export interface Kpi {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone?: "good" | "warn" | "bad";
  /** tiny sparkline series */
  spark: ReadonlyArray<number>;
}

export interface Bar {
  label: string;
  sub: string;
  value: string;
  pct: number;
  tone?: "hot" | "ok";
  /** delta caption, e.g. "▲ +38%" */
  delta?: string;
  deltaTone?: "bad" | "good" | "flat";
}

const spark = (v: number[]) => v;

/* ── Executive ────────────────────────────────────────────────────────────── */

/** The commitment strip — the operational context that explains the variance.
 *  Four tiles, demoted above the POVA spine: they are the *reason* costs
 *  varied, not the spine itself. OT$/SY moved into the POVA Overtime row. */
export const COMMITMENT_KPIS: ReadonlyArray<Kpi> = [
  { key: "attain", label: "Attainment", value: "91.3%", detail: "target 95%", tone: "warn", spark: [4, 5, 7, 6, 8, 9] },
  { key: "adhere", label: "Adherence", value: "96.1%", detail: "holds", tone: "good", spark: [6, 5, 6, 5, 4, 4] },
  { key: "margin", label: "Margin at risk", value: "$142k", detail: "$61k traces to sequence", tone: "bad", spark: [14, 13, 10, 11, 6, 4] },
  { key: "traced", label: "Claims traced to cause", value: "84%", detail: "was 41% in Q1", spark: [15, 13, 10, 8, 5, 3] },
];

/* ── POVA — plant operating variance vs budget ─────────────────────────────
 *
 * The financial spine of the Overall view: actual against budget across the
 * eight categories the plant SOPs define, one period at a time. Everything
 * else on the view is context above it or support below it.
 */

export interface PovaPeriod {
  id: string;
  label: string;
  range: string;
}
/*
 * Labelled by the dates they cover, not by their period number. "P13" is real
 * finance shorthand for the 13th four-week period, but on a screen whose other
 * controls name plants it reads as one, and nobody outside the close knows
 * which weeks P13 is. The id keeps the period number, because that is what the
 * ledger joins on.
 */
export const POVA_PERIODS: ReadonlyArray<PovaPeriod> = [
  { id: "P12", label: "29 Jun – 26 Jul", range: "29 Jun – 26 Jul" },
  { id: "P13", label: "27 Jul – 23 Aug", range: "27 Jul – 23 Aug" },
  { id: "P14", label: "24 Aug – 20 Sep", range: "24 Aug – 20 Sep" },
];
export const POVA_CURRENT_PERIOD = "P13";
export type PovaComparison = "budget" | "prior" | "ly";
export const POVA_COMPARISONS: ReadonlyArray<{ id: PovaComparison; label: string }> = [
  { id: "budget", label: "vs budget" },
  { id: "prior", label: "vs prior period" },
  { id: "ly", label: "vs same period LY" },
];

export interface PovaRow {
  category: string;
  actual: string;
  budget: string;
  variance: string;
  variancePct: string;
  /** U = over the baseline (bad); F = favorable. */
  unfavorable: boolean;
  perSy: string;
  trend: ReadonlyArray<number>;
  /** Factor codes the row lights. */
  affects: ReadonlyArray<string>;
  /** Where the "why" lives — a Performance view or a route. */
  drillsTo: { label: string; view?: "mfg" | "machine" | "labor"; href?: string; note?: string };
}

/* ── The numbers behind POVA ────────────────────────────────────────────────
 *
 * The period bar (P12/P13/P14 × budget/prior/LY) is a real dial, not a label:
 * the summary tiles, the eight-row table and variance-by-plant are all derived
 * from this base by `buildPova`, so flipping a toggle recomputes the read.
 *
 * P13 is the hero period — the one authored to match the client's Excel. P12
 * and P14 scale off it per row (`factor`), so Overtime is the P13 story it is
 * meant to be but calms down either side of it. In TM1 each of these becomes a
 * period cube; the shape here is what the query has to return.
 */
type Period = "P12" | "P13" | "P14";

interface PovaBase {
  category: string;
  /** $k, P13 actual — the authored hero figure. */
  actual13: number;
  /** $k, the plan. A budget is set once, so it holds across the periods. */
  budget: number;
  /** $k, last year's same-period spend (P13 basis; scaled per period). */
  ly: number;
  /** $/SY actual (P13) and $/SY budget — the unit-cost reference column. */
  perSyAct13: number;
  perSyBud: number;
  /** Per-period multiplier on the actual — how the category moves across P12–P14. */
  factor: Record<Period, number>;
  affects: ReadonlyArray<string>;
  drillsTo: PovaRow["drillsTo"];
}

/** Eight categories in SOP order. Overtime spikes in P13 (factor 1.0) and eases
 *  on both sides — that is the whole "worst category" story the demo tells. */
const POVA_BASE: ReadonlyArray<PovaBase> = [
  {
    category: "Production efficiency",
    actual13: 618, budget: 566, ly: 560, perSyAct13: 0.64, perSyBud: 0.59,
    factor: { P12: 0.96, P13: 1, P14: 1.02 },
    affects: ["2.1", "5.1"], drillsTo: { label: "Manufacturing · OEE", view: "mfg" },
  },
  {
    category: "Overtime",
    actual13: 171, budget: 124, ly: 130, perSyAct13: 0.087, perSyBud: 0.063,
    factor: { P12: 0.80, P13: 1, P14: 0.90 },
    affects: ["3.2"], drillsTo: { label: "Labor · OT tracker", view: "labor" },
  },
  {
    category: "Waste and scrap",
    actual13: 172, budget: 141, ly: 150, perSyAct13: 0.18, perSyBud: 0.15,
    factor: { P12: 0.94, P13: 1, P14: 1.04 },
    affects: ["5.1", "5.3"], drillsTo: { label: "Manufacturing · defects", view: "mfg" },
  },
  {
    category: "Maintenance spending",
    actual13: 157, budget: 133, ly: 138, perSyAct13: 0.16, perSyBud: 0.14,
    factor: { P12: 0.90, P13: 1, P14: 1.06 },
    affects: ["3.3"], drillsTo: { label: "Machine health · WO costs", view: "machine" },
  },
  {
    category: "Raw material usage",
    actual13: 468, budget: 450, ly: 455, perSyAct13: 0.49, perSyBud: 0.47,
    factor: { P12: 0.97, P13: 1, P14: 1.01 },
    affects: ["5.1"], drillsTo: { label: "Yarn · Sable", href: "/yarn" },
  },
  {
    category: "Utilities",
    actual13: 159, budget: 150, ly: 152, perSyAct13: 0.17, perSyBud: 0.16,
    factor: { P12: 0.98, P13: 1, P14: 1.03 },
    affects: [], drillsTo: { label: "Machine health", view: "machine", note: "energy-per-asset pen not built yet" },
  },
  {
    category: "Labor performance",
    actual13: 408, budget: 400, ly: 402, perSyAct13: 0.43, perSyBud: 0.42,
    factor: { P12: 0.98, P13: 1, P14: 1.01 },
    affects: ["3.2"], drillsTo: { label: "Labor", view: "labor" },
  },
  {
    category: "Other operating costs",
    actual13: 147, budget: 150, ly: 149, perSyAct13: 0.15, perSyBud: 0.16,
    factor: { P12: 1.01, P13: 1, P14: 0.99 },
    affects: [], drillsTo: { label: "—" },
  },
];

/**
 * Variance-by-plant base — $k, positive = over (U). Worst first.
 *
 * Names come from the plant model rather than being written here, for two
 * reasons. The invented codes read as periods — "P13 · Dalton N" beside a
 * period bar offering P12/P13/P14 is two different things wearing one label.
 * And they named plants this app does not run: Aiken spins fibre, Cartersville
 * makes carpet tile for the commercial book, Ringgold is LVT. This is the
 * residential carpet mills, which is the whole list.
 */
const PLANT_BASE: ReadonlyArray<{ plant: string; v: number }> = [
  { plant: plantLabel("p04"), v: 41 },
  { plant: plantLabel("p07"), v: 22 },
  { plant: plantLabel("p15"), v: 14 },
];

const isPeriod = (p: string): p is Period => p === "P12" || p === "P13" || p === "P14";

const fmtK = (n: number) => `$${Math.round(n)}k`;
/** "$47k U" / "$3k F" — magnitude plus the favourable/unfavourable flag. */
const fmtVar = (v: number) => `$${Math.round(Math.abs(v))}k ${v >= 0 ? "U" : "F"}`;
/** Signed percentage against a baseline, using the typographic minus. */
const fmtPct = (v: number, base: number) => {
  const p = base === 0 ? 0 : (v / base) * 100;
  return `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}%`;
};
/** Unit cost keeps three decimals below a dime, two above — matching the source. */
const fmtSy = (n: number) => (n < 0.1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`);

const actualOf = (b: PovaBase, p: Period) => b.actual13 * b.factor[p];
/** The prior period's actual. P12 stands in a synthetic P11 a touch higher. */
const priorOf = (b: PovaBase, p: Period) =>
  p === "P12" ? b.actual13 * b.factor.P12 * 1.03 : p === "P13" ? actualOf(b, "P12") : actualOf(b, "P13");
const baselineOf = (b: PovaBase, p: Period, c: PovaComparison) =>
  c === "budget" ? b.budget : c === "prior" ? priorOf(b, p) : b.ly * b.factor[p];

export interface PovaBuild {
  summary: { totalVariance: string; totalPct: string; worstCategory: string; costPerSy: string };
  rows: PovaRow[];
  byPlant: ReadonlyArray<{ plant: string; value: string; unfavorable: boolean; hot?: boolean }>;
}

/**
 * Derive the whole Overall financial read for one period and one comparison
 * basis. The page memoises this on (period, comparison), so every toggle on the
 * period bar recomputes the tiles, the table and the plant list together.
 */
export function buildPova(period: string, comparison: PovaComparison): PovaBuild {
  const p: Period = isPeriod(period) ? period : "P13";

  const rows: PovaRow[] = POVA_BASE.map((b) => {
    const actual = actualOf(b, p);
    const base = baselineOf(b, p, comparison);
    const v = actual - base;
    return {
      category: b.category,
      actual: fmtK(actual),
      budget: fmtK(base),
      variance: fmtVar(v),
      variancePct: fmtPct(v, base),
      unfavorable: v > 0,
      perSy: `${fmtSy(b.perSyAct13 * b.factor[p])} / ${fmtSy(b.perSyBud)}`,
      trend: [],
      affects: b.affects,
      drillsTo: b.drillsTo,
    };
  }).sort((a, b) => Number(b.variance.replace(/\D/g, "")) * (b.unfavorable ? 1 : -1)
    - Number(a.variance.replace(/\D/g, "")) * (a.unfavorable ? 1 : -1));

  // Summary — the three numbers the rows roll up to, on the same basis.
  const totals = POVA_BASE.map((b) => {
    const actual = actualOf(b, p);
    const base = baselineOf(b, p, comparison);
    return { b, actual, base, v: actual - base };
  });
  const totalV = totals.reduce((s, t) => s + t.v, 0);
  const totalBase = totals.reduce((s, t) => s + t.base, 0);
  // Worst = the biggest proportional overrun, not the biggest dollar one: a
  // category that blew its budget by 38% is the story, even if another moved
  // more dollars off a far larger base.
  const worst = totals.reduce((w, t) => (t.v / t.base > w.v / w.base ? t : w), totals[0]);
  const actualRatio =
    totals.reduce((s, t) => s + t.actual, 0) / POVA_BASE.reduce((s, b) => s + b.actual13, 0);
  const costAct = 1.94 * actualRatio;

  // Variance-by-plant — scaled by the period and softened for the tighter
  // prior/LY baselines, then re-sorted worst-first.
  const plantPeriod: Record<Period, number> = { P12: 0.9, P13: 1, P14: 1.05 };
  const plantComp: Record<PovaComparison, number> = { budget: 1, prior: 0.8, ly: 1.2 };
  const scaledPlants = PLANT_BASE.map((pl) => ({
    plant: pl.plant,
    v: pl.v * plantPeriod[p] * plantComp[comparison],
  })).sort((a, b) => b.v - a.v);
  const worstPlantV = Math.max(...scaledPlants.map((pl) => pl.v));
  const byPlant = scaledPlants.map((pl) => ({
    plant: pl.plant,
    value: fmtVar(pl.v),
    unfavorable: pl.v > 0,
    hot: pl.v === worstPlantV && pl.v > 0,
  }));

  return {
    summary: {
      totalVariance: fmtVar(totalV),
      totalPct: fmtPct(totalV, totalBase),
      worstCategory: `${worst.b.category} · ${fmtVar(worst.v)} (${fmtPct(worst.v, worst.base)})`,
      costPerSy: `$${costAct.toFixed(2)} act / $1.79 bud`,
    },
    rows,
    byPlant,
  };
}

/** Category drawer content — variance concentration + the Because lines. */
export interface PovaDetail {
  concentration: ReadonlyArray<{ label: string; value: string }>;
  because: ReadonlyArray<{ line: string; cta: string }>;
}
export const POVA_DETAIL: Record<string, PovaDetail> = {
  Overtime: {
    concentration: [
      { label: "By plant", value: "Plant 04 carries $28k of the $47k" },
      { label: "By process", value: "Warping $19k · Tufting $14k" },
      { label: "By cost center", value: "500209 alone is $7.0k this wk" },
    ],
    because: [
      { line: "Warping OT/SY broke its band 4 of 6 weeks — sequencing pushing warp late", cta: "Open Labor" },
      { line: "Machine downtime and OT rising together on the Coating belt — the double-loss", cta: "Open Machine health" },
    ],
  },
  "Production efficiency": {
    concentration: [
      { label: "By belt", value: "Backing 2 is $38k of the $52k" },
      { label: "By cause", value: "Sequencing 42h · $61k rate loss" },
    ],
    because: [
      { line: "Backing 2 availability × performance 78% fwd 4wk — below the 80% floor", cta: "Open Manufacturing" },
      { line: "Constraint headroom 8% for two consecutive weeks — the promise ceiling", cta: "Open the decision on Make" },
    ],
  },
  "Waste and scrap": {
    concentration: [
      { label: "By defect", value: "Delam $22k · 6-ft $6k · velcro $3k" },
      { label: "By station", value: "Backing 2 edges carry the load" },
    ],
    because: [
      { line: "Delamination concentrates at edge positions on Backing 2 — same signature every time", cta: "Open Manufacturing" },
    ],
  },
  "Maintenance spending": {
    concentration: [
      { label: "By asset", value: "Tuft-04 $12.1k · Coat feeder $4.3k" },
      { label: "Unplanned share", value: "62% unplanned : 38% planned" },
    ],
    because: [
      { line: "Vibration preceded 3 of the last 4 stops on Tuft-04 — the sensor case", cta: "Open Machine health" },
    ],
  },
};

export const EXEC_KPIS: ReadonlyArray<Kpi> = [
  { key: "margin", label: "Margin at risk", value: "$142k", detail: "$61k traces to sequence", tone: "bad", spark: spark([14, 13, 10, 11, 6, 4]) },
  { key: "attain", label: "Attainment", value: "91.3%", detail: "target 95%", tone: "warn", spark: spark([4, 5, 7, 6, 8, 9]) },
  { key: "adhere", label: "Adherence", value: "96.1%", detail: "holds", tone: "good", spark: spark([6, 5, 6, 5, 4, 4]) },
  { key: "traced", label: "Claims traced to cause", value: "84%", detail: "was 41% in Q1", spark: spark([15, 13, 10, 8, 5, 3]) },
  { key: "otsy", label: "OT$ / SY (roll-up)", value: "$0.043", detail: "see Labor", tone: "warn", spark: spark([12, 11, 11, 10, 8, 7]) },
];

/** Margin at risk across five causes — click a cause to open Quality. */
export const RISK_BY_CAUSE: ReadonlyArray<Bar> = [
  { label: "Sequencing", sub: "late campaign", value: "$61k", pct: 88, tone: "hot", delta: "43%" },
  { label: "Delamination", sub: "Backing 2", value: "$28k", pct: 54, tone: "hot", delta: "20%" },
  { label: "6-foot roll", sub: "edge grade", value: "$19k", pct: 38, delta: "13%" },
  { label: "Shade mismatch", sub: "split lot", value: "$14k", pct: 28, delta: "10%" },
  { label: "Velcro pull", sub: "Tufting", value: "$11k", pct: 22, delta: "8%" },
];

export const RISK_BY_PLANT: ReadonlyArray<{ plant: string; value: string; hot?: boolean }> = [
  { plant: "P11 · Kennesaw", value: "$8k" },
  { plant: "P12 · Aiken", value: "$14k" },
  { plant: "P13 · Dalton N", value: "$41k ▲", hot: true },
  { plant: "P15 · Dalton S", value: "$22k" },
  { plant: "P17 · Cartersville", value: "$11k" },
  { plant: "P21 · Ringgold", value: "$6k" },
];

export const MARGIN_TREND: ReadonlyArray<{ label: string; value: number }> = [
  { label: "WK 315", value: 96 },
  { label: "WK 325", value: 104 },
  { label: "WK 335", value: 118 },
  { label: "WK 345", value: 126 },
  { label: "WK 355", value: 134 },
  { label: "WK 366", value: 142 },
];

/* ── MFG ──────────────────────────────────────────────────────────────────── */

export const MFG_KPIS: ReadonlyArray<Kpi> = [
  { key: "oee", label: "OEE · roll-up", value: "72.4%", detail: "target 78% · 3wk MA", tone: "warn", spark: spark([8, 7, 9, 8, 10, 10]) },
  { key: "avail", label: "Availability", value: "88.2%", detail: "of scheduled belt time", spark: spark([7, 7, 6, 7, 7, 6]) },
  { key: "perf", label: "Performance", value: "84.6%", detail: "actual vs standard rate", tone: "warn", spark: spark([9, 8, 9, 8, 9, 9]) },
  { key: "qual", label: "Quality", value: "96.9%", detail: "Grade A / graded rolls", tone: "good", spark: spark([5, 5, 4, 5, 4, 4]) },
];

export const OEE_TREND: ReadonlyArray<{ label: string; value: number }> = [
  { label: "WK 315", value: 79 },
  { label: "WK 325", value: 78 },
  { label: "WK 335", value: 76 },
  { label: "WK 345", value: 75 },
  { label: "WK 355", value: 73 },
  { label: "WK 366", value: 72 },
];

/** Downtime causes with the money beside the hours — POVA reconciles in $,
 *  and every cause names the POVA category it feeds. */
export const DOWNTIME_CAUSES: ReadonlyArray<Bar & { usd: string; pova: string }> = [
  { label: "Sequencing", sub: "late release", value: "42h", usd: "$61k", pova: "Production efficiency", pct: 80, tone: "hot" },
  { label: "Machine", sub: "Tuft-04, Coat feeder", value: "31h", usd: "$38k", pova: "Maintenance spending", pct: 64, tone: "hot" },
  { label: "Yarn changeover", sub: "non-campaigned", value: "18h", usd: "$19k", pova: "Raw material usage", pct: 42, tone: "ok" },
  { label: "Quality hold", sub: "delam / 6-ft", value: "12h", usd: "$22k", pova: "Waste and scrap", pct: 28 },
];

export const YIELD_TREND: ReadonlyArray<{ label: string; value: number }> = [
  { label: "WK 315", value: 2.1 },
  { label: "WK 335", value: 1.8 },
  { label: "WK 345", value: 1.6 },
  { label: "WK 355", value: 1.4 },
  { label: "WK 366", value: 1.2 },
];

/* ── Labor ────────────────────────────────────────────────────────────────── */

export const LABOR_KPIS: ReadonlyArray<Kpi> = [
  { key: "otsy", label: "Total OT$ / Tuft SY", value: "$0.087", detail: "3wk MA $0.081 · +7.4%", tone: "warn", spark: spark([12, 11, 11, 10, 8, 7]) },
  { key: "ot", label: "Total OT$", value: "$36,363", detail: "vs $29,352 last wk", tone: "bad", spark: spark([9, 9, 8, 7, 6, 5]) },
  { key: "sy", label: "Warped SY", value: "417,529", detail: "+2.1% wk/wk", spark: spark([7, 7, 6, 6, 6, 6]) },
  { key: "grow", label: "Where it's growing", value: "Warping", detail: "4 of last 6 weeks", tone: "bad", spark: spark([6, 7, 8, 9, 10, 12]) },
];

export const OT_TREND: ReadonlyArray<{ label: string; value: number }> = [
  { label: "WK 315", value: 0.041 },
  { label: "WK 335", value: 0.046 },
  { label: "WK 345", value: 0.049 },
  { label: "WK 355", value: 0.053 },
  { label: "WK 366", value: 0.056 },
];

export const OT_BY_PROCESS: ReadonlyArray<Bar> = [
  { label: "Warping", sub: "3wk MA $0.041 · bud $0.032", value: "$0.056", pct: 88, tone: "hot", delta: "▲ +38%", deltaTone: "bad" },
  { label: "Tufting", sub: "3wk MA $0.043 · bud $0.040", value: "$0.048", pct: 54, delta: "▲ +12%", deltaTone: "bad" },
  { label: "Coating", sub: "3wk MA $0.030 · bud $0.030", value: "$0.028", pct: 32, tone: "ok", delta: "▼ −5%", deltaTone: "good" },
  { label: "Primary", sub: "3wk MA $0.020 · bud $0.021", value: "$0.020", pct: 26, tone: "ok", delta: "flat", deltaTone: "flat" },
  { label: "Final", sub: "3wk MA $0.010 · bud $0.010", value: "$0.011", pct: 17, delta: "▲ +4%", deltaTone: "bad" },
];

/** The line that closes Labor back up to POVA. */
export const LABOR_POVA_LINE =
  "This period's overtime: $171k actual vs $124k budget · $47k U → POVA Overtime row.";

export interface CostCenterRow {
  cc: string;
  process: string;
  ot: string;
  ma: string;
  delta: string;
  deltaTone: "bad" | "good" | "flat";
  pounds: string;
  flag?: boolean;
}
export const OT_BY_COST_CENTER: ReadonlyArray<CostCenterRow> = [
  { cc: "500209", process: "Warping", ot: "$7,047", ma: "$4,635", delta: "▲ +52%", deltaTone: "bad", pounds: "149,177", flag: true },
  { cc: "500184", process: "Warping", ot: "$3,612", ma: "$3,059", delta: "▲ +18%", deltaTone: "bad", pounds: "151,829" },
  { cc: "500184", process: "Tufting", ot: "$4,720", ma: "$4,244", delta: "▲ +11%", deltaTone: "bad", pounds: "151,829" },
  { cc: "500209", process: "Coating", ot: "$1,108", ma: "$1,192", delta: "▼ −7%", deltaTone: "good", pounds: "149,177" },
  { cc: "500184", process: "Primary", ot: "$938", ma: "$920", delta: "flat", deltaTone: "flat", pounds: "151,829" },
];

export interface EmployeeRow {
  id: string;
  process: string;
  reg: string;
  ot: string;
  rate: string;
  otWk: string;
}
export const OT_BY_EMPLOYEE: ReadonlyArray<EmployeeRow> = [
  { id: "E-11284", process: "Warping", reg: "40", ot: "18.5", rate: "$32.40", otWk: "$899" },
  { id: "E-11305", process: "Warping", reg: "40", ot: "16.0", rate: "$31.80", otWk: "$763" },
  { id: "E-10912", process: "Tufting", reg: "40", ot: "14.2", rate: "$30.10", otWk: "$641" },
  { id: "E-11402", process: "Coating", reg: "40", ot: "6.0", rate: "$28.90", otWk: "$260" },
];

/* ── The Overall read's causal chain and decomposition ─────────────────────
 *
 * The chain is the join a ledger can't make. Four systems, left to right,
 * ending in money: the plan miss is measured in MES, the recovery is booked in
 * the roster, and only the last two nodes are financial. Naming the source on
 * each node is the point — it is the difference between "overtime is over
 * budget" and "we missed plan, so we bought the hours back, and here is the
 * bill".
 *
 * Everything below is derived from the built period rather than authored twice,
 * so changing the four-week window moves the chain and the bars with the table.
 */

export interface ChainNode {
  /** The system of record the figure comes from. */
  src: string;
  value: string;
  label: string;
  tone: "warn" | "hot";
}

/** Attainment and the hours bought to recover it, per period. */
const PLAN_MISS: Record<Period, { attainment: string; hours: string }> = {
  P12: { attainment: "94.1%", hours: "+180h" },
  P13: { attainment: "91.3%", hours: "+412h" },
  P14: { attainment: "92.6%", hours: "+265h" },
};

export function povaChain(period: string, build: PovaBuild): ReadonlyArray<ChainNode> {
  const p = isPeriod(period) ? period : "P13";
  const miss = PLAN_MISS[p];
  const ot = build.rows.find((r) => r.category === "Overtime");
  return [
    { src: "MES", value: miss.attainment, label: "attainment vs 95% plan", tone: "warn" },
    { src: "Roster", value: miss.hours, label: "overtime booked to recover", tone: "warn" },
    { src: "TM1", value: ot?.variance ?? "—", label: "Overtime over budget", tone: "hot" },
    { src: "TM1", value: build.summary.totalVariance, label: "total operating variance", tone: "hot" },
  ];
}

export function povaChainRead(period: string, build: PovaBuild): string {
  const p = isPeriod(period) ? period : "P13";
  const ot = build.rows.find((r) => r.category === "Overtime");
  return `attainment sat at ${PLAN_MISS[p].attainment} against a 95% plan, crews booked ${PLAN_MISS[p].hours.replace("+", "")} of overtime to recover it, and that lands as a ${ot?.variance ?? "—"} Overtime line inside ${build.summary.totalVariance} of total variance. The plan miss and the overtime are one story, not two cards.`;
}

/* ── Decomposition ───────────────────────────────────────────────────────── */

export type PovaLens = "category" | "plant" | "cc";

export const POVA_LENSES: ReadonlyArray<{ id: PovaLens; label: string }> = [
  { id: "category", label: "By category" },
  { id: "plant", label: "By plant" },
  { id: "cc", label: "By cost centre" },
];

export interface LensRow {
  label: string;
  sub?: string;
  /** Share of the largest row, for the bar. */
  pct: number;
  value: string;
  tone: "hot" | "warn" | "ok";
  /** Set on the category lens only: the row whose breakdown drawer this bar
   *  opens. The other two lenses have no per-row "why" to open. */
  row?: PovaRow;
}

/** What each category actually is, in the floor's words rather than the
 *  ledger's. "Production efficiency" is a GL line; "rate loss" is the thing. */
const CATEGORY_SUB: Record<string, string> = {
  "Production efficiency": "rate loss",
  Overtime: "recovery hours",
  "Waste and scrap": "delam, 6-ft",
  "Maintenance spending": "unplanned WOs",
  "Raw material usage": "yarn draw",
  "Labor performance": "crew vs standard",
};

/** Cost centres, $k over budget at P13. Scaled per period like everything else. */
const CC_BASE: ReadonlyArray<{ label: string; sub: string; v: number }> = [
  { label: "500209 · Warp", sub: "primary", v: 28 },
  { label: "500184 · Warp", sub: "secondary", v: 19 },
  { label: "500184 · Tuft", sub: "", v: 16 },
  { label: "500209 · Coat", sub: "", v: -4 },
];

const CC_PERIOD: Record<Period, number> = { P12: 0.86, P13: 1, P14: 1.04 };

/** One money, three slices. The bars answer "where is it concentrated"; the
 *  table underneath answers "what were the actual and budget figures". */
export function povaLens(lens: PovaLens, period: string, build: PovaBuild): ReadonlyArray<LensRow> {
  if (lens === "category") {
    const rows = build.rows
      .map((r) => ({ r, mag: Math.abs(parseFloat(r.variance.replace(/[^0-9.]/g, "")) || 0) }))
      .sort((a, b) => b.mag - a.mag)
      .slice(0, 5);
    const top = rows[0]?.mag || 1;
    return rows.map(({ r, mag }) => ({
      label: r.category,
      sub: CATEGORY_SUB[r.category],
      row: r,
      pct: Math.max(6, Math.round((mag / top) * 100)),
      value: r.variance,
      tone: !r.unfavorable ? "ok" : mag / top > 0.7 ? "hot" : "warn",
    }));
  }

  if (lens === "plant") {
    const rows = build.byPlant.map((p) => ({
      p,
      mag: Math.abs(parseFloat(p.value.replace(/[^0-9.]/g, "")) || 0),
    }));
    const top = rows[0]?.mag || 1;
    return rows.map(({ p, mag }) => ({
      label: p.plant,
      pct: Math.max(6, Math.round((mag / top) * 100)),
      value: p.value,
      tone: p.hot ? "hot" : p.unfavorable ? "warn" : "ok",
    }));
  }

  const p = isPeriod(period) ? period : "P13";
  const scaled = CC_BASE.map((c) => ({ ...c, v: c.v * CC_PERIOD[p] }));
  const top = Math.max(...scaled.map((c) => Math.abs(c.v))) || 1;
  return scaled.map((c) => ({
    label: c.label,
    sub: c.sub || undefined,
    pct: Math.max(6, Math.round((Math.abs(c.v) / top) * 100)),
    value: `$${Math.abs(Math.round(c.v))}k ${c.v < 0 ? "F" : "U"}`,
    tone: c.v < 0 ? "ok" : Math.abs(c.v) / top > 0.7 ? "hot" : "warn",
  }));
}

/* ── Manufacturing's chain, decomposition and context ─────────────────────
 *
 * The same three shapes the Overall read uses, because it is the same three
 * questions: how did we get here, where is it concentrated, is it structural.
 * What changes is the unit — OEE points rather than dollars — and the claim.
 *
 * The claim: availability and quality are fine, so the belt runs and simply
 * cannot hit rate. That single distinction is the decision, because a
 * Performance loss is a capital or process question and never a maintenance
 * one. The benchmark against a sister mill is what makes it a machine problem
 * rather than a product one.
 */

export const MFG_CHAIN: ReadonlyArray<ChainNode> = [
  { src: "Ignition", value: "68%", label: `OEE · Backing 2 · ${plantLabel("p04")}`, tone: "hot" },
  { src: "Ignition", value: "P 76%", label: "the loss is Performance", tone: "hot" },
  { src: "MES", value: "−12%", label: "under standard rate", tone: "warn" },
  { src: "TM1", value: "$61k", label: "margin lost per period", tone: "hot" },
];

export const MFG_CHAIN_READ =
  "availability is 91% and quality is 97% — the belt runs, it just can't hit rate. That one distinction is the decision: a Performance loss is a capital or process question, never a maintenance one.";

export type MfgLens = "loss" | "belt" | "family";

export const MFG_LENSES: ReadonlyArray<{ id: MfgLens; label: string }> = [
  { id: "loss", label: "By loss type" },
  { id: "belt", label: "By belt" },
  { id: "family", label: "By product family" },
];

const MFG_ROWS: Record<MfgLens, ReadonlyArray<LensRow>> = {
  loss: [
    { label: "Performance", sub: "can't hit standard rate", pct: 100, value: "−17 pts", tone: "hot" },
    { label: "Availability", sub: "stops + changeover", pct: 42, value: "−9 pts", tone: "warn" },
    { label: "Quality", sub: "defects, rework", pct: 14, value: "−3 pts", tone: "ok" },
  ],
  belt: [
    { label: `Backing 2 · ${plantLabel("p04")}`, sub: "the constraint", pct: 100, value: "68%", tone: "hot" },
    { label: `Tufting · ${plantLabel("p04")}`, pct: 52, value: "81%", tone: "warn" },
    { label: `Coating · ${plantLabel("p04")}`, pct: 38, value: "86%", tone: "warn" },
    /* The sister mill running the identical asset class. This row is the whole
       argument: it is what turns "the belt is slow" into "this belt is slow". */
    { label: `Backing 2 · ${plantLabel("p07")}`, sub: "same asset class", pct: 30, value: "88%", tone: "ok" },
  ],
  family: [
    { label: "Dune 240", sub: "heavy, dimensional", pct: 100, value: "62%", tone: "hot" },
    { label: "Cascade Twist", pct: 64, value: "74%", tone: "warn" },
    { label: "Highland Loop", sub: "light", pct: 36, value: "84%", tone: "ok" },
  ],
};

export function mfgLens(lens: MfgLens): ReadonlyArray<LensRow> {
  return MFG_ROWS[lens];
}

export interface ContextRead {
  lead: string;
  rest: string;
}

export const MFG_CONTEXT: { worsening: ContextRead; outlier: ContextRead } = {
  worsening: {
    lead: "Declining 14 periods — 72.2% to 68%.",
    rest: "Past a bad quarter; this is an asset ageing out.",
  },
  outlier: {
    lead: `The same asset class runs 88% at ${plantLabel("p07")}.`,
    rest: "It's this machine, not the design.",
  },
};

/** The Overall read's equivalent pair, derived so it moves with the period. */
export function povaContext(build: PovaBuild): { worsening: ContextRead; outlier: ContextRead } {
  const worst = build.byPlant[0];
  return {
    worsening: {
      lead: `Unfavourable 4 periods running — $98k to ${build.summary.totalVariance.replace(/ [UF]$/, "")}.`,
      rest: "Structural, not a bad close.",
    },
    outlier: {
      lead: `${worst?.plant ?? "The lead plant"} is the outlier at ${worst?.value ?? "—"}.`,
      rest: "Over half of it sits in a single category.",
    },
  };
}

/* ── Machine health's chain, decomposition and context ────────────────────
 *
 * The one view whose clock is now rather than a close. Its claim is the
 * cheapest one the engine ever makes: the cascade was caught before the
 * defect. A feeder starving for three days without crossing a hard limit is
 * exactly the signal a threshold set on magnitude alone never fires on — slow
 * enough to look like noise, long enough to matter.
 */
export const MACHINE_CHAIN: ReadonlyArray<ChainNode> = [
  { src: "Ignition", value: "581", label: "Feeder-2 setpoint · was 610", tone: "warn" },
  { src: "Ignition", value: "3d 4h", label: "above band, still drifting", tone: "hot" },
  { src: "Quality", value: "94%", label: "cure margin thin — delam risk", tone: "warn" },
  { src: "TM1", value: "$310/hr", label: "bleed while it continues", tone: "hot" },
];

export const MACHINE_CHAIN_READ =
  "the feeder has starved three days; cure is holding with no margin left. The same signature preceded CLM-2154. This is the cascade caught before the defect — the only reason it's still cheap.";

export type MachineLens = "asset" | "signal" | "stage";

export const MACHINE_LENSES: ReadonlyArray<{ id: MachineLens; label: string }> = [
  { id: "asset", label: "By asset" },
  { id: "signal", label: "By signal" },
  { id: "stage", label: "By stage" },
];

const MACHINE_ROWS: Record<MachineLens, ReadonlyArray<LensRow>> = {
  asset: [
    { label: "Backing 2 line", sub: "under plan rate", pct: 100, value: "$620/hr", tone: "hot" },
    { label: "Tuft-04", sub: "bearing vibration", pct: 84, value: "$520/hr", tone: "hot" },
    { label: "Feeder-2", sub: "setpoint drift", pct: 50, value: "$310/hr", tone: "warn" },
    { label: "Kettle-3", sub: "in band", pct: 6, value: "in band", tone: "ok" },
  ],
  signal: [
    { label: "Rate", sub: "fpm vs plan", pct: 100, value: "1 line · 22 min", tone: "hot" },
    { label: "Vibration", sub: "mm/s vs 6.0", pct: 84, value: "1 asset · 34 min", tone: "hot" },
    { label: "Setpoint drift", sub: "feeder starve", pct: 50, value: "1 asset · 3d 4h", tone: "warn" },
    { label: "Temperature", sub: "all in band", pct: 5, value: "none", tone: "ok" },
  ],
  stage: [
    { label: "Backing", sub: "the constraint", pct: 100, value: "$620/hr", tone: "hot" },
    { label: "Tufting", pct: 84, value: "$520/hr", tone: "hot" },
    { label: "Coating", pct: 50, value: "$310/hr", tone: "warn" },
    { label: "Extrusion", sub: "in band", pct: 4, value: "in band", tone: "ok" },
  ],
};

export function machineLens(lens: MachineLens): ReadonlyArray<LensRow> {
  return MACHINE_ROWS[lens];
}

export const MACHINE_CONTEXT: { worsening: ContextRead; outlier: ContextRead } = {
  worsening: {
    lead: "Feeder-2 has drifted 3 days without crossing hard —",
    rest: "slow enough to look like noise, long enough to matter.",
  },
  outlier: {
    lead: "Backing 2 is the constraint,",
    rest: "so its $620/hr is the number that sets the shift.",
  },
};

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
export const POVA_PERIODS: ReadonlyArray<PovaPeriod> = [
  { id: "P12", label: "P12", range: "29 Jun – 26 Jul" },
  { id: "P13", label: "P13", range: "27 Jul – 23 Aug" },
  { id: "P14", label: "P14", range: "24 Aug – 20 Sep" },
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
    affects: ["3.2"], drillsTo: { label: "Labor · P13 tracker", view: "labor" },
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

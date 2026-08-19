// Performance analytics — the roll-up read. Three views off one page:
// Executive (financial / margin / attainment), MFG (OEE / yield / downtime),
// and Labor (overtime, mirroring the P13 tracker). Illustrative fixtures shaped
// so TM1 (financials), Ignition (machine) and the P13 Excel can each replace a
// block without the page changing.

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

export const DOWNTIME_CAUSES: ReadonlyArray<Bar> = [
  { label: "Sequencing", sub: "late release", value: "42h", pct: 80, tone: "hot" },
  { label: "Machine", sub: "Tuft-04, Coat feeder", value: "31h", pct: 64, tone: "hot" },
  { label: "Yarn changeover", sub: "non-campaigned", value: "18h", pct: 42, tone: "ok" },
  { label: "Quality hold", sub: "delam / 6-ft", value: "12h", pct: 28 },
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
  { label: "Warping", sub: "3wk MA $0.041", value: "$0.056", pct: 88, tone: "hot", delta: "▲ +38%", deltaTone: "bad" },
  { label: "Tufting", sub: "3wk MA $0.043", value: "$0.048", pct: 54, delta: "▲ +12%", deltaTone: "bad" },
  { label: "Coating", sub: "3wk MA $0.030", value: "$0.028", pct: 32, tone: "ok", delta: "▼ −5%", deltaTone: "good" },
  { label: "Primary", sub: "3wk MA $0.020", value: "$0.020", pct: 26, tone: "ok", delta: "flat", deltaTone: "flat" },
  { label: "Final", sub: "3wk MA $0.010", value: "$0.011", pct: 17, delta: "▲ +4%", deltaTone: "bad" },
];

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

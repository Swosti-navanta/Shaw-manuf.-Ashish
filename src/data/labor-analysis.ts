// Labor · the analysis workbench. Pure analysis — decisions are taken on Make.
//
// The page's one claim: overtime is usually a symptom. The causal chain joins
// three systems (Ignition · MES × roster · TM1) into the sentence a
// spreadsheet can't write — machine downtime idled crews and the overtime
// recovered it. Everything is scoped to one process step at a time; the
// picker is the analysis' scope bar, and every panel below redraws off it.

export type LaborProcId = "warp" | "tuft" | "coat" | "prim" | "final";
export type LensId = "cause" | "cc" | "shift" | "week";

export const LENSES: ReadonlyArray<{ id: LensId; label: string }> = [
  { id: "cause", label: "By cause" },
  { id: "cc", label: "By cost center" },
  { id: "shift", label: "By shift" },
  { id: "week", label: "By week" },
];

export interface DecompRow {
  label: string;
  sub?: string;
  pct: number;
  /** hot = the driver; warn = notable; ok = benign; mute = negligible. */
  tone: "hot" | "warn" | "ok" | "mute";
  value: string;
  /** ▲ rising against its baseline. */
  rising?: boolean;
}

export interface LaborProcess {
  id: LaborProcId;
  name: string;
  /** Chip dot + default ordering: the picker is a mini-triage. */
  status: "bad" | "warn" | "ok";
  verdict: {
    /** "$47k over budget" / "on budget" — the coloured phrase. */
    amount: string;
    tone: "bad" | "warn" | "good";
    actual: string;
    budget: string;
    /** Bold lead of the interpretation. */
    lead: string;
    rest: string;
  };
  /** Four nodes, left to right: machine → idle labor → overtime → cost. */
  chain: ReadonlyArray<{ src: string; value: string; label: string; tone: "hot" | "warn" }>;
  chainFoot: string;
  lenses: Record<LensId, ReadonlyArray<DecompRow>>;
  trend: {
    /** OT$/SY, 12 periods. */
    series: ReadonlyArray<number>;
    band: number;
    lead: string;
    rest: string;
    tone: "bad" | "warn" | "good";
  };
  benchmarkRead: { lead: string; rest: string };
  /** Things this analysis surfaced that may need a call — raised on Make. */
  surfaced: number;
  /** The Make row the pointer deep-links, when one exists. */
  makeActionId?: string;
}

/** OT$/SY by process — the shared benchmark list, worst first. */
export const LABOR_BENCHMARK: ReadonlyArray<{ id: LaborProcId; name: string; value: string; pct: number }> = [
  { id: "warp", name: "Warping", value: "$0.056", pct: 100 },
  { id: "tuft", name: "Tufting", value: "$0.048", pct: 86 },
  { id: "coat", name: "Coating", value: "$0.028", pct: 50 },
  { id: "prim", name: "Primary", value: "$0.020", pct: 36 },
  { id: "final", name: "Final", value: "$0.011", pct: 20 },
];

export const LABOR_PROCESSES: ReadonlyArray<LaborProcess> = [
  {
    id: "warp",
    name: "Warping",
    status: "bad",
    verdict: {
      amount: "$47k over budget",
      tone: "bad",
      actual: "$171k",
      budget: "$124k",
      lead: "85% of it is a symptom, not a staffing gap.",
      rest: "The chain below shows why: machine downtime idles crews, and the shift runs overtime to catch up.",
    },
    chain: [
      { src: "Ignition", value: "14h", label: "machine downtime · Warp-02, Creel-3", tone: "hot" },
      { src: "MES × roster", value: "6h", label: "crews idle, waiting on the line", tone: "hot" },
      { src: "Roster", value: "+412h", label: "overtime booked to recover the plan", tone: "warn" },
      { src: "TM1", value: "$31k", label: "of the $47k overrun traces to this path", tone: "hot" },
    ],
    chainFoot:
      "The bearing on Warp-02 and the creel changeovers cost 14h of run time; crews sat 6h of that; recovering the plan booked 412 overtime hours — $31k. It's not labor overspending, it's a machine problem paid for in labor.",
    lenses: {
      cause: [
        { label: "Machine downtime", sub: "Warp-02, Creel-3", pct: 66, tone: "hot", value: "$31k", rising: true },
        { label: "Late sequencing", sub: "warp starts bunched", pct: 19, tone: "warn", value: "$9k", rising: true },
        { label: "Genuine volume", sub: "above-plan yardage", pct: 15, tone: "ok", value: "$7k" },
      ],
      cc: [
        { label: "500209 · Warp", sub: "primary center", pct: 60, tone: "hot", value: "$28k", rising: true },
        { label: "500184 · Warp", sub: "secondary", pct: 40, tone: "warn", value: "$19k", rising: true },
      ],
      shift: [
        { label: "Nights", sub: "22:00–06:00", pct: 58, tone: "hot", value: "$27k", rising: true },
        { label: "Days", sub: "06:00–14:00", pct: 27, tone: "warn", value: "$13k" },
        { label: "Swing", sub: "14:00–22:00", pct: 15, tone: "ok", value: "$7k" },
      ],
      week: [
        { label: "Wk 366", sub: "latest", pct: 30, tone: "hot", value: "$14k", rising: true },
        { label: "Wk 365", pct: 26, tone: "hot", value: "$12k", rising: true },
        { label: "Wk 364", pct: 24, tone: "warn", value: "$11k" },
        { label: "Wk 363", pct: 20, tone: "warn", value: "$10k" },
      ],
    },
    trend: {
      series: [0.038, 0.039, 0.04, 0.041, 0.043, 0.045, 0.046, 0.048, 0.049, 0.052, 0.054, 0.056],
      band: 0.045,
      lead: "Worsening 4 of the last 6 periods.",
      rest: "This is a trend, not a spike — it broke the band and kept climbing.",
      tone: "bad",
    },
    benchmarkRead: {
      lead: "Warping is the plant's worst",
      rest: "— and its gap to Tufting is widening period on period.",
    },
    surfaced: 3,
    makeActionId: "act-labor",
  },
  {
    id: "tuft",
    name: "Tufting",
    status: "warn",
    verdict: {
      amount: "$18k over budget",
      tone: "bad",
      actual: "$96k",
      budget: "$78k",
      lead: "61% is a machine story",
      rest: "— Tuft-04 vibration stops feed the overtime, though volume plays a larger part here than in Warping.",
    },
    chain: [
      { src: "Ignition", value: "9h", label: "machine downtime · Tuft-04", tone: "hot" },
      { src: "MES × roster", value: "3h", label: "crews idle, waiting on the line", tone: "hot" },
      { src: "Roster", value: "+240h", label: "overtime booked to recover the plan", tone: "warn" },
      { src: "TM1", value: "$11k", label: "of the $18k overrun traces to this path", tone: "hot" },
    ],
    chainFoot:
      "Tuft-04's bearing stopped the line 9h; crews idled 3h; 240 overtime hours recovered the plan — $11k. The remaining overrun is genuine above-plan volume.",
    lenses: {
      cause: [
        { label: "Machine downtime", sub: "Tuft-04", pct: 42, tone: "hot", value: "$11k", rising: true },
        { label: "Genuine volume", sub: "2 above-plan runs", pct: 40, tone: "warn", value: "$5k" },
        { label: "Late sequencing", pct: 18, tone: "ok", value: "$2k" },
      ],
      cc: [{ label: "500184 · Tuft", sub: "primary", pct: 100, tone: "hot", value: "$18k", rising: true }],
      shift: [
        { label: "Days", sub: "06:00–14:00", pct: 50, tone: "warn", value: "$9k" },
        { label: "Nights", sub: "22:00–06:00", pct: 39, tone: "warn", value: "$7k", rising: true },
        { label: "Swing", sub: "14:00–22:00", pct: 11, tone: "ok", value: "$2k" },
      ],
      week: [
        { label: "Wk 366", sub: "latest", pct: 30, tone: "hot", value: "$5k", rising: true },
        { label: "Wk 365", pct: 28, tone: "warn", value: "$5k" },
        { label: "Wk 364", pct: 24, tone: "warn", value: "$4k" },
        { label: "Wk 363", pct: 22, tone: "warn", value: "$4k" },
      ],
    },
    trend: {
      series: [0.04, 0.041, 0.043, 0.044, 0.046, 0.044, 0.043, 0.045, 0.047, 0.046, 0.047, 0.048],
      band: 0.045,
      lead: "Broke the band twice in six periods.",
      rest: "Watch, not yet a clear trend.",
      tone: "warn",
    },
    benchmarkRead: {
      lead: "Second-worst,",
      rest: "and closing on Warping. Both are the plant's constraint machines.",
    },
    surfaced: 2,
    makeActionId: "act-wo",
  },
  {
    id: "coat",
    name: "Coating",
    status: "ok",
    verdict: {
      amount: "$4k under budget",
      tone: "good",
      actual: "$52k",
      budget: "$56k",
      lead: "Coating is under budget.",
      rest: "Downtime is minimal and overtime is inside its band — nothing here needs a look.",
    },
    chain: [
      { src: "Ignition", value: "2h", label: "machine downtime · minor", tone: "warn" },
      { src: "MES × roster", value: "0h", label: "no crews idled", tone: "warn" },
      { src: "Roster", value: "+40h", label: "overtime on genuine volume", tone: "warn" },
      { src: "TM1", value: "$1k", label: "traces to this path", tone: "warn" },
    ],
    chainFoot: "Negligible downtime, no idle crews, 40 overtime hours on genuine volume — $1k. A healthy process.",
    lenses: {
      cause: [
        { label: "Genuine volume", sub: "normal runs", pct: 70, tone: "ok", value: "$1k" },
        { label: "Machine downtime", sub: "minor", pct: 30, tone: "mute", value: "$0.4k" },
      ],
      cc: [{ label: "500209 · Coat", sub: "primary", pct: 100, tone: "ok", value: "$4k" }],
      shift: [
        { label: "Days", sub: "06:00–14:00", pct: 60, tone: "ok", value: "$2k" },
        { label: "Nights", sub: "22:00–06:00", pct: 40, tone: "ok", value: "$2k" },
      ],
      week: [
        { label: "Wk 366", sub: "latest", pct: 30, tone: "ok", value: "$1k" },
        { label: "Wk 365", pct: 25, tone: "ok", value: "$1k" },
        { label: "Wk 364", pct: 25, tone: "ok", value: "$1k" },
        { label: "Wk 363", pct: 20, tone: "ok", value: "$1k" },
      ],
    },
    trend: {
      series: [0.028, 0.028, 0.029, 0.028, 0.027, 0.028, 0.028, 0.029, 0.028, 0.028, 0.028, 0.028],
      band: 0.045,
      lead: "Flat and inside band.",
      rest: "No movement worth acting on.",
      tone: "good",
    },
    benchmarkRead: { lead: "Mid-pack and stable.", rest: "Not a concern this period." },
    surfaced: 0,
  },
  {
    id: "prim",
    name: "Primary",
    status: "ok",
    verdict: {
      amount: "on budget",
      tone: "good",
      actual: "$41k",
      budget: "$41k",
      lead: "Primary is on budget.",
      rest: "Overtime is trivial — no chain worth tracing.",
    },
    chain: [
      { src: "Ignition", value: "1h", label: "machine downtime · minimal", tone: "warn" },
      { src: "MES × roster", value: "0h", label: "no crews idled", tone: "warn" },
      { src: "Roster", value: "+18h", label: "a handful of hours on volume", tone: "warn" },
      { src: "TM1", value: "$0.4k", label: "traces to this path", tone: "warn" },
    ],
    chainFoot: "Minimal downtime, no idle, a handful of overtime hours on volume. Healthy.",
    lenses: {
      cause: [{ label: "Genuine volume", pct: 100, tone: "ok", value: "$0.4k" }],
      cc: [{ label: "500184 · Primary", pct: 100, tone: "ok", value: "$0.4k" }],
      shift: [{ label: "Days", pct: 100, tone: "ok", value: "$0.4k" }],
      week: [{ label: "Wk 366", pct: 100, tone: "ok", value: "$0.4k" }],
    },
    trend: {
      series: [0.02, 0.02, 0.021, 0.02, 0.02, 0.019, 0.02, 0.02, 0.02, 0.021, 0.02, 0.02],
      band: 0.045,
      lead: "Flat.",
      rest: "Nothing to see.",
      tone: "good",
    },
    benchmarkRead: { lead: "Second-lowest OT/SY", rest: "in the plant." },
    surfaced: 0,
  },
  {
    id: "final",
    name: "Final",
    status: "ok",
    verdict: {
      amount: "$2k over budget",
      tone: "warn",
      actual: "$23k",
      budget: "$21k",
      lead: "Final is marginally over",
      rest: "on genuine volume — not a machine or sequencing story.",
    },
    chain: [
      { src: "Ignition", value: "3h", label: "shear downtime · Shear-1", tone: "warn" },
      { src: "MES × roster", value: "1h", label: "minor idle", tone: "warn" },
      { src: "Roster", value: "+70h", label: "overtime, largely above-plan volume", tone: "warn" },
      { src: "TM1", value: "$2k", label: "traces to this path", tone: "warn" },
    ],
    chainFoot: "Some shear downtime, minor idle, overtime largely on above-plan finishing volume.",
    lenses: {
      cause: [
        { label: "Genuine volume", sub: "finishing surge", pct: 70, tone: "warn", value: "$1.4k" },
        { label: "Machine downtime", sub: "Shear-1", pct: 30, tone: "ok", value: "$0.6k" },
      ],
      cc: [{ label: "500209 · Final", pct: 100, tone: "warn", value: "$2k" }],
      shift: [
        { label: "Days", pct: 55, tone: "ok", value: "$1.1k" },
        { label: "Nights", pct: 45, tone: "ok", value: "$0.9k" },
      ],
      week: [
        { label: "Wk 366", pct: 30, tone: "warn", value: "$0.6k" },
        { label: "Wk 365", pct: 25, tone: "ok", value: "$0.5k" },
        { label: "Wk 364", pct: 25, tone: "ok", value: "$0.5k" },
        { label: "Wk 363", pct: 20, tone: "ok", value: "$0.4k" },
      ],
    },
    trend: {
      series: [0.009, 0.009, 0.01, 0.01, 0.01, 0.01, 0.011, 0.01, 0.011, 0.011, 0.011, 0.011],
      band: 0.045,
      lead: "Slight uptick,",
      rest: "volume-driven, within tolerance.",
      tone: "warn",
    },
    benchmarkRead: { lead: "Lowest OT/SY", rest: "in the plant." },
    surfaced: 0,
  },
];

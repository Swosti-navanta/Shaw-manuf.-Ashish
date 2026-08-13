// The Scheduling (Sawyer) domain: three belts, the runs sitting on them, and
// the rules the released sequence has to respect.

/** Which Phosphor glyph stands for a belt. Named rather than imported here so
 *  the domain module stays free of React. */
export type BeltIcon = "tufting" | "backing" | "finishing";

/** A belt is a production line with its own track on the board. */
export interface Belt {
  id: BeltId;
  /** The process, not the asset number — "Tufting", not "Tufting 3". The
   *  numbers were plant-asset ids that meant nothing outside the plant. */
  name: string;
  icon: BeltIcon;
  /** The line that gates the whole plant — an hour lost here is lost
   *  everywhere, so the board marks it. */
  constraint?: boolean;
  /** Shown under the name when the belt is behind plan. */
  note?: string;
}

export type BeltId = "tufting" | "backing" | "finishing";

export const BELTS: ReadonlyArray<Belt> = [
  { id: "tufting", name: "Tufting", icon: "tufting" },
  { id: "backing", name: "Backing", icon: "backing", constraint: true, note: "constraint · 12% slow" },
  { id: "finishing", name: "Finishing", icon: "finishing" },
];

/** Style family drives changeover cost — the purge between two runs depends
 *  on how far apart their colours are, not on the runs themselves. */
export type StyleFamily = "aria" | "meridian" | "cascade" | "dune";

/** How light the family runs. Sequencing light → dark keeps purges cheap; a
 *  dark → light jump forces a full purge. */
export const FAMILY_DEPTH: Record<StyleFamily, number> = {
  aria: 1,
  dune: 2,
  meridian: 3,
  cascade: 4,
};

export interface Run {
  id: string;
  label: string;
  family: StyleFamily;
  /** Hours of belt time. Drives the block's width on the track. */
  hours: number;
  dyeLot?: string;
  order?: string;
  /** A fixed install date — this run cannot slip. */
  fixed?: boolean;
  /** Left edge accent on the block. */
  accent: string;
  /**
   * Pins the run to a clock offset (hours from board start) instead of
   * flowing it after the previous one. Downstream operations need this:
   * finishing can't begin before backing has produced the goods, so the board
   * would otherwise draw an order flowing backwards in time.
   */
  startAt?: number;
}

/** Changeover cost between two style families, keyed by the sorted pair. The
 *  cascade → dune jump is the expensive one: a dark lot followed by a light
 *  one forces a full purge. */
export const CHANGEOVER: Record<string, number> = {
  "aria|dune": 320,
  "aria|meridian": 480,
  "aria|cascade": 1240,
  "dune|meridian": 640,
  "cascade|meridian": 920,
  "cascade|dune": 1840,
};

export function changeoverCost(a: Run | undefined, b: Run | undefined): number {
  if (!a || !b) return 0;
  if (a.family === b.family) return 0;
  return CHANGEOVER[[a.family, b.family].sort().join("|")] ?? 0;
}

/**
 * Changeover *time*, in hours. A changeover costs money and belt time, and on
 * a constraint line the time is what actually hurts — so the board draws it as
 * a hatched setup segment on the bar rather than only pricing it.
 *
 * Going darker is a rinse; going lighter is a full purge, which is why the
 * campaign rule sequences light → dark.
 */
export function changeoverHours(a: Run | undefined, b: Run | undefined): number {
  if (!a || !b || a.family === b.family) return 0;
  const drop = FAMILY_DEPTH[a.family] - FAMILY_DEPTH[b.family];
  // Dark → light: full purge. Light → dark: a short rinse between shades.
  return drop > 0 ? 0.25 + drop * 0.25 : 0.25;
}

/** A rule the schedule has to respect. `hard` rules cannot be broken;
 *  `soft` ones cost money when they are. */
export type RuleStrength = "hard" | "soft";

export interface ScheduleRule {
  id: string;
  text: string;
  strength: RuleStrength;
  /** Detail line — e.g. the claims that produced the rule. */
  detail?: string;
  /** Written by Wren from a claim pattern rather than configured up front.
   *  These render highlighted: the system learning is the point. */
  fromQuality?: boolean;
}

export const BASE_RULES: ReadonlyArray<ScheduleRule> = [
  { id: "shade-whole", text: "Keep a dye lot whole when an order is shade-critical", strength: "soft" },
  { id: "locked", text: "Nothing moves inside the frozen window — now + 3.5h", strength: "hard" },
  { id: "campaign", text: "Campaign light → dark to cut changeover", strength: "soft" },
];

/** The rule Wren sends upstream once the three-claim pattern is confirmed. */
export const QUALITY_RULE: ScheduleRule = {
  id: "never-split-fixed",
  text: "Never split a dye lot where an order has a fixed install date",
  detail: "CLM-2291 · CLM-2205 · CLM-2154",
  strength: "hard",
  fromQuality: true,
};

/**
 * Why a person moved a run off Sawyer's slot. A canned list rather than free
 * text: these get counted — "how often does the agent get the slot wrong, and
 * for what reason" is the question that improves the model, and prose can't
 * be aggregated.
 */
export const OVERRIDE_REASONS = [
  "Customer asked to pull it forward",
  "Yarn or material won't be ready in time",
  "Operator or crew availability",
  "Balancing load across the belt",
  "Keeping the campaign light → dark",
  "Downstream line needs it sooner",
] as const;

export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

/** Whether the current sequence holds, and why. */
export interface Verdict {
  level: "good" | "bad";
  message: string;
  changeover: number;
}

/** When a backlog item can realistically be placed. */
export type Horizon = "today" | "week";

export interface BacklogItem {
  id: string;
  label: string;
  family: StyleFamily;
  hours: number;
  dyeLot?: string;
  order?: string;
  customer?: string;
  qty: number;
  /** Promised date as shown to the customer. */
  promised: string;
  /** A crew is booked — the date cannot move. */
  fixed?: boolean;
  horizon: Horizon;
  /** Which belt Sawyer would put it on. The belt is the agent's call — what
   *  a person overrides is the slot within it. */
  belt: BeltId;
  /** Sawyer's recommended insertion index among that belt's existing runs.
   *  0 = first of the day; length = last. */
  slot: number;
  /**
   * Sawyer's read on the placement, as two short structured lines rather than
   * a sentence — the IRIS "Iris Insight" column pattern. An insight column has
   * to be scannable down the column; prose forces you to read every row.
   * `note` carries the full reasoning for the row tooltip.
   */
  insight: { headline: string; detail: string };
  note: string;
  /** Shade-critical lots must run whole. */
  shadeCritical?: boolean;
}

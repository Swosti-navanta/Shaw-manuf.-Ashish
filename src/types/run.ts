// The Make (Rowan) domain: a run against the released plan, the deviation it
// opened, and the costed options for recovering it.

/**
 * Every decision the engine touches lands in exactly one lane. Which lane it
 * takes is set by the plant's Thresholds dial — so when something reaches a
 * person, the UI can always say which rule sent it there.
 */
export type Lane = "auto" | "limit" | "person";

export const LANE_LABEL: Record<Lane, string> = {
  auto: "Automated",
  limit: "Inside limits",
  person: "Needs you",
};

export const LANE_MEANING: Record<Lane, string> = {
  auto: "The agent just did this — nobody had to ask, chase or assemble it.",
  limit: "The agent acted to the edge of the limit you set, then stopped and asked.",
  person: "Judgement — the agent prepared everything; the call is yours.",
};

/** The drill-down kinds the detail drawer knows how to render. */
export type DetailKind =
  | "yarn"
  | "dyelot"
  | "batch"
  | "roll"
  | "order"
  | "claim"
  | "machine"
  | "workorder"
  | "kpi"
  | "option"
  | "feed";

export interface FeedEvent {
  /** Clock time on the shift, or "now" for events added by a decision. */
  time: string;
  lane: Lane;
  /** Which agent acted — or "You". */
  agent: string;
  /** Body text. `strong` segments render bold; used for the figures that
   *  carry the argument (rates, dates, costs). */
  text: FeedSegment[];
}

export type FeedSegment = { t: string; strong?: boolean };

/** Shorthand for authoring feed copy: "plain |bold| plain". */
export function seg(raw: string): FeedSegment[] {
  return raw
    .split("|")
    .filter((s) => s.length > 0)
    .map((s, i) => ({ t: s, strong: i % 2 === 1 }));
}

export type OptionId = "A" | "B" | "C";

/** What accepting an option does to the schedule — Sawyer reads this. */
export type OptionEffect = "reorder" | "split" | "expedite";

export interface RecoveryOption {
  id: OptionId;
  title: string;
  detail: string;
  /** Signed cost as shown, e.g. "+$1,840" or "$0". */
  cost: string;
  /** What the cost is for — "changeover", "overtime". */
  costLabel: string;
  effect: OptionEffect;
  /** Rowan's pick. Exactly one option carries this. */
  recommended?: boolean;
  /** Repeats a cause that has already produced a claim. */
  risky?: boolean;
  /** Cost breakdown rows shown in the option drawer. */
  breakdown: ReadonlyArray<{ label: string; value: string; net?: boolean; bad?: boolean }>;
  /** Effect on the schedule, as label → value. */
  schedule: ReadonlyArray<{ label: string; value: string; bad?: boolean }>;
}

export interface Measurement {
  metric: string;
  spec: string;
  actual: string;
  pass: boolean;
}

export interface DowntimeReason {
  reason: string;
  minutes: number;
  /** Ties back to today's dye-lot problem rather than being routine. */
  linked?: boolean;
}

export interface Claim {
  id: string;
  month: string;
  batch: string;
  dyeLot: string;
  rolls: string;
  cause: string;
}

export interface OrderRef {
  id: string;
  customer: string;
  city: string;
  qty: number;
  promised: string;
  /** A crew is booked — the date cannot move. */
  fixed: boolean;
  /**
   * How much jeopardy the promise is actually in. An order record is mostly
   * reference material, so `info` is the norm — reserve `warning` for a
   * commitment the current plan puts at risk, and `danger` for one already
   * missed. Colour that shouts on every order teaches people to ignore it.
   */
  risk: "info" | "warning" | "danger";
  /** The one-line read on this order, shown as the drawer's lead. Written per
   *  order rather than templated — what matters differs each time. */
  headline: string;
  detail: string;
}

export interface LineState {
  name: string;
  achieved: number;
  standard: number;
  oee: number;
  constraint?: boolean;
  pmWindow?: string;
  vibration?: { current: string; baseline: string };
}

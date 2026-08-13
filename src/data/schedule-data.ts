// The released sequence on Plant 12 today, plus the backlog waiting for a
// slot. Illustrative data — one board, one contested belt.
//
// Backing 2 is the belt everything turns on: it carries DL-4471 (shade-
// critical, committed to a fixed install) and it is running 12% slow, so the
// order of its three runs is the decision Rowan escalated.

import type { BacklogItem, BeltId, Run } from "@/types/schedule";

/**
 * Board window — the ruler every run is measured against.
 *
 * Two days rather than one shift. A single-shift board could only ever show
 * you what is already committed; a 48-hour horizon is the first view where
 * moving something is a real question, because there is somewhere to move it
 * to. It is also the window the constraint model's locked-window rule is
 * written about, so the rule and the picture now describe the same span.
 *
 * `startHour` is hours past midnight on day one; the board runs 06:00 today
 * through 06:00 two days later.
 */
export const BOARD = {
  startHour: 6,
  endHour: 54,
  /** How far past *now* the floor cannot react: staging the yarn, dressing the
   *  creel, assigning a crew. Everything from the start of the board to
   *  `now + freezeLeadHours` is immovable — the earlier part because it has
   *  already run, the rest because there isn't time to change it.
   *
   *  Measured forward from now rather than as a fixed block of the board. A
   *  freeze pinned to the board window silently grows when the window does,
   *  and a whole day of "frozen" on a two-day board is a freeze nobody
   *  believes. */
  freezeLeadHours: 3.4,
} as const;

export const BOARD_HOURS = BOARD.endHour - BOARD.startHour;

/**
 * Planned outages — belt time that is spoken for but produces nothing.
 *
 * Deliberately separate from the idle gaps the layout already creates. A belt
 * waiting on the belt upstream is idle, not under maintenance, and labelling
 * one as the other would tell a scheduler they can't use time they can. These
 * are the windows where the belt is genuinely unavailable.
 *
 * `start` is hours from board start.
 */
export const MAINTENANCE: ReadonlyArray<{
  belt: BeltId;
  start: number;
  hours: number;
  label: string;
}> = [
  // The constraint belt, overnight: vibration on Backing 2 is what Rowan
  // raised the work order against, and this is when it gets looked at.
  { belt: "backing", start: 19, hours: 3, label: "Maintenance · Backing 2 PM" },
  { belt: "tufting", start: 25, hours: 2, label: "Maintenance · creel service" },
];

export const RUNS: Record<string, Run> = {
  b1: {
    id: "b1",
    label: "Cascade Twist",
    family: "cascade",
    hours: 3.5,
    dyeLot: "DL-4471",
    order: "ORD-77310",
    fixed: true,
    accent: "#3F3F47",
  },
  b2: {
    id: "b2",
    label: "Meridian",
    family: "meridian",
    hours: 2.5,
    dyeLot: "DL-4488",
    order: "ORD-77412",
    accent: "#A16207",
  },
  b3: {
    id: "b3",
    label: "Dune blend",
    family: "dune",
    hours: 2,
    dyeLot: "DL-4479",
    order: "ORD-77341",
    accent: "#0F766E",
  },
};

/** The contested belt, in released order. */
export const BACKING_ORDER: ReadonlyArray<string> = ["b1", "b2", "b3"];

/** The two belts that aren't in play today — shown so the board reads as a
 *  plant, not a single line. */
export const STATIC_BELTS: Record<Exclude<BeltId, "backing">, ReadonlyArray<Run>> = {
  tufting: [
    {
      id: "t1",
      label: "Aria Loop",
      family: "aria",
      hours: 2,
      dyeLot: "DL-4463",
      order: "ORD-77298",
      accent: "#6B7280",
    },
    {
      id: "t2",
      label: "Dune blend",
      family: "dune",
      hours: 2.5,
      dyeLot: "DL-4479",
      order: "ORD-77341",
      accent: "#0F766E",
    },
  ],
  finishing: [
    {
      id: "f1",
      label: "Cascade Twist",
      family: "cascade",
      hours: 2.5,
      // Same dye lot as b1 — this is that lot's next operation, which is what
      // the order-flow connector between the two belts is drawing.
      dyeLot: "DL-4471",
      order: "ORD-77310",
      accent: "#3F3F47",
      // Finishing can't start before Backing 2 has produced the goods —
      // ORD-77310 comes off Backing 2 at 09:30. Pinning it keeps the order's
      // path through the plant flowing forwards in time.
      startAt: 3.5,
    },
  ],
};

/**
 * Runs with no slot yet. This is the queue the Scheduler actually works from:
 * what can still be placed today, and what has until the end of the week.
 * Sawyer's note on each is the reason it is or isn't easy to place.
 */
export const BACKLOG: ReadonlyArray<BacklogItem> = [
  {
    id: "bk1",
    label: "Cascade Twist · Dune 240",
    family: "cascade",
    hours: 1.5,
    dyeLot: "DL-4471",
    order: "ORD-77310",
    customer: "Kestrel Flooring",
    qty: 900,
    promised: "18 Aug",
    fixed: true,
    horizon: "today",
    belt: "backing",
    // Queued into Backing's free time, campaigned with the other Cascade lot.
    slot: 99,
    shadeCritical: true,
    insight: { headline: "Same day as the rest of DL-4471", detail: "shade drifts overnight" },
    note: "Balance of the shade-critical lot. It has to run the same day as b1 — hold it over and the shade drifts.",
  },
  {
    id: "bk2",
    label: "Meridian · Slate 118",
    family: "meridian",
    hours: 2,
    dyeLot: "DL-4492",
    order: "ORD-77455",
    customer: "Halloran Contract",
    qty: 740,
    promised: "22 Aug",
    horizon: "today",
    belt: "tufting",
    // Queued behind the lighter Aria lot, so the purge into it stays cheap.
    slot: 99,
    insight: { headline: "Cheapest purge on the board", detail: "+$480 · light → dark" },
    note: "Runs behind the Aria lot — light → dark, the cheapest purge on the board.",
  },
  {
    id: "bk3",
    label: "Dune blend · Ash 040",
    family: "dune",
    hours: 2.5,
    order: "ORD-77468",
    customer: "Pell & Rowe",
    qty: 1120,
    promised: "25 Aug",
    horizon: "week",
    belt: "finishing",
    // Queued after Cascade clears Finishing 1.
    slot: 99,
    insight: { headline: "Thursday, once Cascade clears", detail: "date has slack" },
    note: "Date has slack. Cheapest here on Thursday, once Cascade clears Finishing 1.",
  },
  {
    id: "bk4",
    label: "Aria Loop · Bone 012",
    family: "aria",
    hours: 3,
    dyeLot: "DL-4501",
    order: "ORD-77470",
    customer: "Vantage Interiors",
    qty: 1450,
    promised: "26 Aug",
    horizon: "week",
    belt: "tufting",
    // Lightest lot waiting, so it leads the proposed campaign.
    slot: 99,
    insight: { headline: "Leads the campaign — lightest lot", detail: "never after Cascade" },
    note: "Lightest lot in the queue — run it first in any campaign, never after Cascade.",
  },
  {
    id: "bk5",
    label: "Cascade Twist · Umber 310",
    family: "cascade",
    hours: 2,
    dyeLot: "DL-4507",
    order: "ORD-77481",
    customer: "Kestrel Flooring",
    qty: 610,
    promised: "27 Aug",
    horizon: "week",
    belt: "backing",
    // Campaigned directly behind the other Cascade lot — free purge.
    slot: 99,
    shadeCritical: true,
    insight: { headline: "Campaign behind Cascade", detail: "$0 · purge is free" },
    note: "Campaign it behind the other Cascade run and the purge is free.",
  },
];

export const HORIZON_LABEL: Record<"today" | "week", string> = {
  today: "Today",
  week: "This week",
};

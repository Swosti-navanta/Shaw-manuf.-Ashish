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
    orders: 2,
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
  // Tufting runs greige yarn, so each is identified by its yarn lot (Y-…), not
  // a dye lot — colour doesn't exist yet at this stage.
  tufting: [
    { id: "t1", label: "Aria Loop", family: "aria", hours: 2, yarn: "Y-30877", orders: 2, accent: "#6B7280" },
    { id: "t2", label: "Dune blend", family: "dune", hours: 2.5, yarn: "Y-31004", orders: 1, accent: "#0F766E" },
    { id: "t3", label: "Cascade Twist", family: "cascade", hours: 2, yarn: "Y-30918", orders: 1, accent: "#3F3F47" },
  ],
  finishing: [
    { id: "f1", label: "Cascade Twist", family: "cascade", hours: 2.5, dyeLot: "DL-4471", order: "ORD-77310", orders: 2, accent: "#3F3F47" },
    { id: "f2", label: "Meridian", family: "meridian", hours: 2, dyeLot: "DL-4488", order: "ORD-77412", accent: "#A16207" },
    /* Pinned behind backing: DL-4479 clears BAK-01 at 15:00, and a roll cannot
       be sheared before the coat exists. Its upstream card is on the contested
       belt, so the precedence has to be held from this end. */
    { id: "f3", label: "Dune blend", family: "dune", hours: 2, dyeLot: "DL-4479", order: "ORD-77341", accent: "#0F766E", startAt: 9 },
  ],
};

/**
 * The floor as work centres, each with its own lanes.
 *
 * Shaw names them the way the plant does: tufting is counted in *machines*, the
 * wet and finishing processes in *lines*. One lane per centre is the contested
 * belt Sawyer is actually arguing about — it wires to the interactive process
 * belt in context, so it drags, proposes and re-sequences. The rest are static
 * display lanes: they carry the plant's load so an oversubscribed constraint
 * reads against a floor that's genuinely busy, not against empty track.
 *
 * A `belt` makes a lane interactive (it mirrors that process's sequence); a
 * `runs` list makes it a static lane that only shows what it's running.
 */
export interface BoardLane {
  id: string;
  /** The asset code the floor uses — TUF-01, BECK-1, BAK-02. */
  code: string;
  /** The one-line spec under the code. */
  descriptor: string;
  constraint?: boolean;
  /** Interactive lanes mirror a process belt in context; static lanes don't. */
  belt?: BeltId;
  runs?: ReadonlyArray<Run>;
}

export interface WorkCentre {
  id: string;
  name: string;
  /** "3 machines" / "2 lines" — the count and the unit Shaw labels it by. */
  unit: string;
  constraint?: boolean;
  lanes: ReadonlyArray<BoardLane>;
}

export const WORK_CENTRES: ReadonlyArray<WorkCentre> = [
  {
    id: "tufting",
    name: "Tufting",
    unit: "3 machines",
    lanes: [
      { id: "tuf-01", code: "TUF-01", descriptor: "1/10 gauge · 12 ft", belt: "tufting" },
      {
        id: "tuf-02",
        code: "TUF-02",
        descriptor: "1/10 gauge · 12 ft",
        runs: [
          { id: "d-tuf2a", label: "Meridian", family: "meridian", hours: 2.5, yarn: "Y-30918", orders: 1, accent: "#A16207" },
          { id: "d-tuf2c", label: "Cascade Twist", family: "cascade", hours: 2.5, yarn: "Y-30902", orders: 1, accent: "#3F3F47" },
          { id: "d-tuf2b", label: "Aria Loop", family: "aria", hours: 3, yarn: "Y-30877", orders: 1, accent: "#6B7280", startAt: 9 },
        ],
      },
      {
        id: "tuf-03",
        code: "TUF-03",
        descriptor: "5/64 gauge · 12 ft",
        runs: [
          { id: "d-tuf3a", label: "Cascade Twist", family: "cascade", hours: 3, yarn: "Y-30918", orders: 2, accent: "#3F3F47" },
          { id: "d-tuf3b", label: "Aria Loop", family: "aria", hours: 2.5, yarn: "Y-30877", orders: 1, accent: "#6B7280" },
          { id: "d-tuf3c", label: "Meridian", family: "meridian", hours: 2, yarn: "Y-30930", orders: 1, accent: "#A16207" },
        ],
      },
    ],
  },
  {
    id: "dyeing",
    name: "Dyeing",
    unit: "2 lines",
    lanes: [
      {
        id: "beck-1",
        code: "BECK-1",
        descriptor: "batch · shade sequenced",
        runs: [
          { id: "d-beck1b", label: "Aria Loop", family: "aria", hours: 2, dyeLot: "DL-4463", order: "ORD-77298", accent: "#6B7280" },
          { id: "d-beck1a", label: "Meridian", family: "meridian", hours: 2, dyeLot: "DL-4488", order: "ORD-77412", accent: "#A16207" },
          /* Lands between tufting clearing at 10:45 and backing starting at
             13:00 — the beck ahead of it was shortened to make that room,
             rather than pinning this card and having the pack override it. */
          { id: "d-beck1c", label: "Dune blend", family: "dune", hours: 2, dyeLot: "DL-4479", order: "ORD-77341", accent: "#0F766E" },
        ],
      },
      {
        id: "cdr-1",
        code: "CDR-1",
        descriptor: "continuous range",
        runs: [
          { id: "d-cdr1b", label: "Cascade Twist", family: "cascade", hours: 2, dyeLot: "DL-4507", order: "ORD-77380", accent: "#3F3F47" },
          { id: "d-cdr1a", label: "Cascade Twist", family: "cascade", hours: 2.5, dyeLot: "DL-4471", order: "ORD-77310", orders: 2, accent: "#3F3F47" },
          { id: "d-cdr1c", label: "Meridian", family: "meridian", hours: 2, dyeLot: "DL-4492", order: "ORD-77455", accent: "#A16207" },
        ],
      },
    ],
  },
  {
    id: "backing",
    name: "Backing",
    unit: "2 lines",
    constraint: true,
    lanes: [
      { id: "bak-01", code: "BAK-01", descriptor: "precoat + secondary · constraint", constraint: true, belt: "backing" },
      {
        id: "bak-02",
        code: "BAK-02",
        descriptor: "precoat + secondary",
        runs: [
          { id: "d-bak2b", label: "Aria Loop", family: "aria", hours: 2, dyeLot: "DL-4463", order: "ORD-77298", accent: "#6B7280" },
          { id: "d-bak2c", label: "Meridian", family: "meridian", hours: 2, dyeLot: "DL-4488", order: "ORD-77412", accent: "#A16207" },
        ],
      },
    ],
  },
  {
    id: "finishing",
    name: "Finishing",
    unit: "2 lines",
    lanes: [
      { id: "fin-01", code: "FIN-01", descriptor: "shear · inspect · roll", belt: "finishing" },
      {
        id: "fin-02",
        code: "FIN-02",
        descriptor: "shear · inspect · roll",
        runs: [
          { id: "d-fin2a", label: "Aria Loop", family: "aria", hours: 2, dyeLot: "DL-4463", order: "ORD-77298", accent: "#6B7280" },
          { id: "d-fin2b", label: "Cascade Twist", family: "cascade", hours: 2.5, dyeLot: "DL-4471", order: "ORD-77310", accent: "#3F3F47" },
          { id: "d-fin2c", label: "Meridian", family: "meridian", hours: 2, dyeLot: "DL-4492", order: "ORD-77455", accent: "#A16207" },
        ],
      },
    ],
  },
];

/** Every static display run by id — for lot/fixed lookups on the board. */
export const STATIC_LANE_RUNS: ReadonlyArray<Run> = WORK_CENTRES.flatMap((wc) =>
  wc.lanes.flatMap((l) => l.runs ?? []),
);

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
    yarn: "Y-30930",
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
    yarn: "Y-30877",
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


/**
 * The yarn each dye lot was built from.
 *
 * Downstream of the dye house a run has a colour, but it still came from a
 * draw — and when a claim comes back the question is which draw, not just which
 * shade. Held as a map rather than repeated on every run so the two can't drift.
 */
export const YARN_FOR_DYE: Record<string, string> = {
  "DL-4463": "Y-30877",
  "DL-4471": "Y-30918",
  "DL-4479": "Y-31004",
  "DL-4488": "Y-30918",
  "DL-4492": "Y-30930",
  "DL-4501": "Y-30877",
  "DL-4507": "Y-30902",
};

/**
 * The roll number a run produces once it reaches finishing.
 *
 * Only finishing has one: a roll is a physical output, and it does not exist
 * until the goods come off the line. Upstream stages are identified by the lot
 * they are running — yarn at tufting, yarn *and* dye lot once colour exists.
 *
 * Derived once from declaration order rather than written on every literal, so
 * two runs can never quietly share a number.
 */
export const ROLL_NO: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  let n = 1041;
  [
    ...Object.values(RUNS),
    ...STATIC_BELTS.tufting,
    ...STATIC_BELTS.finishing,
    ...STATIC_LANE_RUNS,
  ].forEach((r) => {
    if (!out[r.id]) out[r.id] = `R-${n++}`;
  });
  BACKLOG.forEach((b) => {
    if (!out[b.id]) out[b.id] = `R-${n++}`;
  });
  return out;
})();

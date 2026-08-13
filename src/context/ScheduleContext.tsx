"use client";

import {
  createContext,
  useCallback,
  useContext,

  useMemo,

  useState,
  type ReactNode,
} from "react";
import { BACKING_ORDER, RUNS, STATIC_BELTS } from "@/data/schedule-data";
import { LOCKED_HOURS } from "@/app/(portal)/scheduling/_components/board-layout";
import {
  BASE_RULES,
  changeoverCost,
  type ScheduleRule,
  type Verdict,
  type BeltId,
  type Run,
} from "@/types/schedule";
import { useRun } from "@/context/RunContext";

interface ScheduleContextValue {
  /** Run ids on Backing 2, in sequence. */
  order: ReadonlyArray<string>;
  /** DL-4471 broken across two dye runs. */
  split: boolean;
  /** False once the sequence has been touched — it has to be re-released
   *  before the floor runs to it. */
  released: boolean;
  selected: string | null;

  select: (id: string | null) => void;
  /** Step the selected run one slot earlier (-1) or later (+1). */
  move: (direction: -1 | 1) => void;
  toggleSplit: () => void;
  reRelease: () => void;

  /** Whether the current sequence holds, and the changeover it costs. */
  verdict: Verdict;
  /** The rules the schedule respects, newest first. */
  rules: ReadonlyArray<ScheduleRule>;
  addRule: (rule: ScheduleRule) => void;

  /** Placed backlog ids → the slot they went into on their belt. The belt is
   *  Sawyer's call; the slot is what a person overrides, so that's what has to
   *  be stored for the board to draw the run where it really is. */
  scheduled: ReadonlyMap<string, number>;
  schedule: (id: string, slot: number) => void;
  unschedule: (id: string) => void;

  /** Run order per belt. Backing mirrors `order`; the other two carry any
   *  reordering a person has dragged into them. */
  beltOrders: Readonly<Record<BeltId, ReadonlyArray<string>>>;
  /** Start time overrides, in hours from board start, set by dragging. */
  starts: ReadonlyMap<string, number>;
  /** Belt time allotted to a run, when a person has widened it past the
   *  nominal. A run's nominal hours come from yardage at standard rate; the
   *  belt it is on may not be running at standard, and giving it the time it
   *  actually needs is a scheduling decision rather than a data correction. */
  durations: ReadonlyMap<string, number>;
  resizeRun: (runId: string, hours: number) => DropResult;
  /** Drop a run at a point in time on its own belt. Returns why it was refused
   *  rather than silently snapping back — a board that rejects a move without
   *  saying so reads as broken rather than as governed. */
  dropRun: (runId: string, toBelt: BeltId, atHours: number) => DropResult;
}

export type DropResult = { ok: true } | { ok: false; reason: string };

/** Every run on the board by id, whichever belt it lives on. */
const RUNS_BY_ID: Record<string, Run> = {
  ...RUNS,
  ...Object.fromEntries(
    [...STATIC_BELTS.tufting, ...STATIC_BELTS.finishing].map((r) => [r.id, r]),
  ),
};

const BELT_NAME: Record<BeltId, string> = {
  tufting: "Tufting",
  backing: "Backing",
  finishing: "Finishing",
};

const ScheduleContext = createContext<ScheduleContextValue | undefined>(undefined);

/** The board each accepted option produces. Option A swaps slots 2 and 3 so
 *  ORD-77412 runs first and the dye lot stays whole; Option B splits the lot;
 *  Option C adds an overtime slot without disturbing this order. */
function boardForDecision(decision: string | null): { order: string[]; split: boolean } {
  if (decision === "A") return { order: ["b2", "b1", "b3"], split: false };
  if (decision === "B") return { order: [...BACKING_ORDER], split: true };
  return { order: [...BACKING_ORDER], split: false };
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const { decision } = useRun();

  const [order, setOrder] = useState<string[]>([...BACKING_ORDER]);
  const [split, setSplit] = useState(false);
  const [released, setReleased] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [rules, setRules] = useState<ScheduleRule[]>([...BASE_RULES]);
  const [scheduled, setScheduled] = useState<Map<string, number>>(new Map());
  const [starts, setStarts] = useState<Map<string, number>>(new Map());
  const [durations, setDurations] = useState<Map<string, number>>(new Map());
  // Tufting and Finishing keep a fixed membership — a drag moves a run in
  // time (via `starts`), never onto another belt, so which runs belong to
  // which belt never changes. Backing's `order` still varies because accepting
  // an option in Make rewrites its sequence.
  const tufting = useMemo(() => STATIC_BELTS.tufting.map((r) => r.id), []);
  const finishing = useMemo(() => STATIC_BELTS.finishing.map((r) => r.id), []);

  // Accepting an option in Make is what rebuilds this sequence — that's the
  // "the plan corrected itself" claim, so it has to actually happen here
  // rather than just being asserted on the Make page.
  //
  // Adjusted during render off a stored previous value, not in an effect: an
  // effect would paint the stale board first and then cascade a second render.
  // This is React's documented pattern for resetting state when an input
  // changes. It reacts only to a *change* in the decision, so a manual nudge
  // afterwards survives re-renders.
  const [prevDecision, setPrevDecision] = useState(decision);
  if (decision !== prevDecision) {
    setPrevDecision(decision);
    const next = boardForDecision(decision);
    setOrder(next.order);
    setSplit(next.split);
    setSelected(null);
    setReleased(true);
    setStarts(new Map());
    setDurations(new Map());
  }

  const select = useCallback(
    (id: string | null) => setSelected((cur) => (cur === id ? null : id)),
    [],
  );

  const move = useCallback(
    (direction: -1 | 1) => {
      setOrder((cur) => {
        if (!selected) return cur;
        const i = cur.indexOf(selected);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= cur.length) return cur;
        const next = [...cur];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
      setReleased(false);
    },
    [selected],
  );

  const toggleSplit = useCallback(() => {
    setSplit((s) => !s);
    setReleased(false);
  }, []);

  const reRelease = useCallback(() => {
    setReleased(true);
    setSelected(null);
  }, []);

  const addRule = useCallback((rule: ScheduleRule) => {
    setRules((cur) => (cur.some((r) => r.id === rule.id) ? cur : [rule, ...cur]));
  }, []);

  const schedule = useCallback((id: string, slot: number) => {
    setScheduled((cur) => new Map(cur).set(id, slot));
    setReleased(false);
  }, []);

  const beltOrders = useMemo(
    () => ({ tufting, backing: order, finishing }) as Record<BeltId, ReadonlyArray<string>>,
    [tufting, order, finishing],
  );

  /**
   * A drop is checked before it is applied, and the two things it can violate
   * are the two things a board like this exists to protect.
   *
   * A run cannot change belt. Tufting, Backing and Finishing are consecutive
   * processes, not interchangeable machines — a backing run on the tufting
   * belt isn't a scheduling choice, it's a category error, and letting the
   * board accept it would teach the wrong model in the first ten seconds.
   *
   * A run cannot move into the frozen window, and a fixed-date run cannot move
   * at all. The freeze runs from the start of the board to now plus the lead
   * time the floor needs — before now the work has already run, and inside the
   * lead there is no time to stage yarn or dress a creel.
   *
   * A drop sets a real start time rather than a slot. On a two-day board the
   * sequence alone can't express the move you actually want — "run this
   * tomorrow morning" is a time, and a belt that repacks from hour zero would
   * quietly drag it back to today.
   */
  const dropRun = useCallback(
    (runId: string, toBelt: BeltId, atHours: number): DropResult => {
      const fromBelt = (Object.keys(beltOrders) as BeltId[]).find((b) =>
        beltOrders[b].includes(runId),
      );
      if (!fromBelt) return { ok: false, reason: "That run isn't on a belt." };
      if (fromBelt !== toBelt) {
        return {
          ok: false,
          reason: `${BELT_NAME[fromBelt]} and ${BELT_NAME[toBelt]} are different processes — a run can move in time, not between them.`,
        };
      }
      if (RUNS_BY_ID[runId]?.fixed) {
        return {
          ok: false,
          reason: `${RUNS_BY_ID[runId].label} is committed to a fixed install date — everything else is arranged around it.`,
        };
      }
      if (atHours < LOCKED_HOURS) {
        return {
          ok: false,
          reason:
            "That lands inside the frozen window — the floor can't stage yarn and dress a creel in under 3.5 hours.",
        };
      }

      setStarts((cur) => new Map(cur).set(runId, atHours));
      setReleased(false);
      return { ok: true };
    },
    [beltOrders],
  );

  /** Widen or narrow the belt time a run is allowed. Bounded below by half an
   *  hour — a run that takes no time is not a schedule, it's a rounding error
   *  — and above by the end of the board. */
  const resizeRun = useCallback((runId: string, hours: number): DropResult => {
    if (hours < 0.5) {
      return { ok: false, reason: "A run needs at least half an hour of belt time." };
    }
    setDurations((cur) => new Map(cur).set(runId, hours));
    setReleased(false);
    return { ok: true };
  }, []);

  const unschedule = useCallback((id: string) => {
    setScheduled((cur) => {
      const next = new Map(cur);
      next.delete(id);
      return next;
    });
    setReleased(false);
  }, []);

  // Sawyer's check, recomputed on every nudge. Two ways to break it: split a
  // shade-critical lot, or let the fixed-install run drift to the back of a
  // belt that's already running slow.
  const verdict = useMemo<Verdict>(() => {
    const runs = order.map((id) => RUNS[id]);
    let changeover = 0;
    for (let i = 0; i < runs.length - 1; i++) {
      changeover += changeoverCost(runs[i], runs[i + 1]);
    }

    if (split) {
      return {
        level: "bad",
        changeover,
        message:
          "Splits DL-4471 — two dye runs won't shade-match. Last time this produced CLM-2291.",
      };
    }
    if (order.indexOf("b1") === order.length - 1) {
      return {
        level: "bad",
        changeover,
        message:
          "ORD-77310 misses its fixed install (18 Aug) — Backing 2 is running 12% slow.",
      };
    }
    return {
      level: "good",
      changeover,
      message: "Holds both dates — DL-4471 runs whole.",
    };
  }, [order, split]);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      order,
      split,
      released,
      selected,
      select,
      move,
      toggleSplit,
      reRelease,
      verdict,
      rules,
      addRule,
      scheduled,
      schedule,
      unschedule,
      beltOrders,
      starts,
      durations,
      resizeRun,
      dropRun,
    }),
    [
      order, split, released, selected, select, move, toggleSplit, reRelease,
      verdict, rules, addRule, scheduled, schedule, unschedule,
      beltOrders, starts, durations, resizeRun, dropRun,
    ],
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule(): ScheduleContextValue {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return ctx;
}

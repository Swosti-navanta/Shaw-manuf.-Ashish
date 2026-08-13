// Turning a belt's run order into positions on a clock.
//
// The board is a time axis, not a list: a run that starts at 14:00 has to sit
// under the 14:00 tick. Everything here works in hours-from-board-start, and
// only converts to percentages at the edge — so setup time, run time and the
// gaps between them all stay commensurable.

import { BOARD, BOARD_HOURS } from "@/data/schedule-data";
import { changeoverCost, changeoverHours, type BacklogItem, type Run } from "@/types/schedule";

export interface PlacedRun {
  run: Run;
  /** Hours from board start to the beginning of the setup, if any. */
  setupStart: number;
  setupHours: number;
  /** What the changeover costs — shown on the setup segment. */
  setupCost: number;
  /** Hours from board start to the beginning of the run itself. */
  start: number;
  hours: number;
}

export interface LaneLayout {
  placed: PlacedRun[];
  /** Belt hours consumed, setup included — the honest load figure. */
  loadHours: number;
  /** Share of the board consumed, 0–1. Over 1 means the belt is oversubscribed. */
  utilisation: number;
  /** True when the work no longer fits inside the board window. */
  over: boolean;
}

/** Lay a belt's runs end to end from the start of the board, inserting the
 *  changeover each transition actually requires. */
export function layoutLane(runs: ReadonlyArray<Run>): LaneLayout {
  const placed: PlacedRun[] = [];
  let cursor = 0;
  // Load is belt time actually consumed, not the finish time — a pinned run
  // can leave the belt idle in between, and idle isn't load.
  let busy = 0;

  runs.forEach((run, i) => {
    const prev = runs[i - 1];
    const setupHours = changeoverHours(prev, run);
    // A pinned run waits for its own clock time; the belt simply idles until
    // then, which is itself worth seeing on a board about capacity.
    const setupStart = run.startAt !== undefined ? Math.max(cursor, run.startAt - setupHours) : cursor;
    cursor = setupStart + setupHours;
    placed.push({
      run,
      setupStart,
      setupHours,
      setupCost: changeoverCost(prev, run),
      start: cursor,
      hours: run.hours,
    });
    cursor += run.hours;
    busy += setupHours + run.hours;
  });

  return {
    placed,
    loadHours: busy,
    utilisation: busy / BOARD_HOURS,
    // Oversubscribed when the work runs past the end of the board window.
    over: cursor > BOARD_HOURS,
  };
}

/** Hours-from-start → percentage across the track. */
export const pct = (hours: number) => `${(hours / BOARD_HOURS) * 100}%`;

/** Clock label for an offset in hours from the board start. */
export function clockAt(hours: number): string {
  const total = BOARD.startHour * 60 + Math.round(hours * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Where "now" sits on the board. Fixed rather than derived from the wall
 *  clock: the whole narrative is pinned to one shift, and a demo opened in the
 *  evening should still show the deviation mid-run. */
export const NOW_HOURS = 4.6; // 10:36

/** A gridline every 3 hours. At 48 hours an hourly grid is 48 hairlines in
 *  920px — noise, not a scale. */
export const GRID_STEP = 3;
export const GRID_HOURS = Array.from(
  { length: Math.floor(BOARD_HOURS / GRID_STEP) + 1 },
  (_, i) => i * GRID_STEP,
);

/** Labelled ticks every 6 hours. */
export const MAJOR_EVERY = 6;
export const TICKS = Array.from(
  { length: Math.floor(BOARD_HOURS / MAJOR_EVERY) + 1 },
  (_, i) => i * MAJOR_EVERY,
);

/** Offsets where the clock crosses midnight — the board's day boundaries.
 *  Drawn heavier than a tick, because "tomorrow" is the single most important
 *  distinction on a two-day board. */
export const DAY_BREAKS = Array.from(
  { length: Math.ceil((BOARD.startHour + BOARD_HOURS) / 24) },
  (_, i) => (i + 1) * 24 - BOARD.startHour,
).filter((h) => h > 0 && h < BOARD_HOURS);

/** Which day an offset falls on, from the board's first day. */
export function dayIndex(hours: number): number {
  return Math.floor((BOARD.startHour + hours) / 24);
}

export const DAY_LABEL = ["Today", "Tomorrow", "Thu"];

/**
 * Where the board stops being editable: now, plus the lead time the floor
 * needs to act on a change. Before `NOW_HOURS` the work has already run, so it
 * is history rather than a policy; between now and here the floor simply can't
 * turn around in time.
 */
export const LOCKED_HOURS = NOW_HOURS + BOARD.freezeLeadHours;

/** Runs are dragged in half-hour steps — finer than a plant schedules, and
 *  coarse enough that a drop lands where it looked like it would. */
export const SNAP_HOURS = 0.5;

/**
 * A backlog item as a run the board can lay out.
 *
 * `startAt` floors it at the end of the freeze. A belt whose committed work
 * finishes early would otherwise have its proposal packed straight onto the
 * tail — inside a window the board refuses if you drag a run there. Suggesting
 * a slot the product won't accept is worse than suggesting nothing.
 *
 * It is a floor, not a fix: `layoutLane` takes `max(cursor, startAt - setup)`,
 * so a belt already busy past the freeze keeps packing normally, and a second
 * proposal queues behind the first rather than stacking on the boundary.
 *
 * Lives here, beside the layout, because the board and the placement deck both
 * need it and they must agree. They didn't: each had its own copy, only one
 * carried the freeze floor, and the two surfaces quoted different start times
 * for the same run.
 */
export function backlogRun(b: BacklogItem): Run {
  return {
    id: b.id,
    label: b.label,
    family: b.family,
    hours: b.hours,
    dyeLot: b.dyeLot,
    order: b.order,
    fixed: b.fixed,
    startAt: LOCKED_HOURS,
    accent: "var(--color-iris-500)",
  };
}

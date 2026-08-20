"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Input,
  PanelTimeline,
  Progress,
  SegmentedControl,
  Select,
} from "@navanta-ai/design-system";
import { CaretLeft, CaretRight, MagnifyingGlass, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { useSchedule } from "@/context/ScheduleContext";
import {
  BACKLOG,
  BOARD_HOURS,
  MAINTENANCE,
  ROLL_NO,
  RUNS,
  STATIC_BELTS,
  STATIC_LANE_RUNS,
  WORK_CENTRES,
  YARN_FOR_DYE,
} from "@/data/schedule-data";
import { type BacklogItem, type BeltId, type Run } from "@/types/schedule";
import DrillLink from "@/components/ui/DrillLink";
import YarnCone from "@/components/ui/YarnCone";
import RunDeckModal from "./RunDeckModal";
import RunReviewModal from "./RunReviewModal";
import { buildWeave, chainFor, type WeaveNode } from "./weave";
import { scheduleViolations } from "./schedule-rules";
import {
  backlogRun as baseBacklogRun,
  DAY_BREAKS,
  DAY_LABEL,
  GRID_HOURS,
  LOCKED_HOURS,
  SNAP_HOURS,
  TICKS,
  NOW_HOURS,
  clockAt,
  dayIndex,
  layoutLane,
  pct,
  type LaneLayout,
  type PlacedRun,
} from "./board-layout";

/** Every run on the board by id, whichever lane it belongs to. */
const RUN_BY_ID: Record<string, Run> = {
  ...RUNS,
  ...Object.fromEntries(
    [...STATIC_BELTS.tufting, ...STATIC_BELTS.finishing, ...STATIC_LANE_RUNS].map((r) => [r.id, r]),
  ),
};

/** One rendered lane: its work centre, its layout, and — for the interactive
 *  lane — the proposals waiting on it. */
interface LaneView {
  id: string;
  code: string;
  descriptor: string;
  centreName: string;
  centreUnit: string;
  /** True on the first lane of a work centre — carries the group heading. */
  firstInCentre: boolean;
  constraint: boolean;
  /** The process belt this lane mirrors, when it is interactive. */
  belt?: BeltId;
  layout: LaneLayout;
  ghosts: PlacedRun[];
}

/** A drag in progress. `slot` is where the run would land if you let go now,
 *  recomputed on every move so the insertion marker is never a guess. */
type DragMode = "move" | "resize";

interface DragState {
  runId: string;
  belt: BeltId;
  /** Moving the run in time, or changing how much belt time it gets. */
  mode: DragMode;
  /** Where the press started, so a click can be told from a drag. */
  fromX: number;
  /** False until the pointer has travelled far enough to mean it. */
  moved: boolean;
  /** Hours between the run's start and where inside it you grabbed. Preserved
   *  for the whole drag, so the bar moves with the cursor instead of jumping
   *  its left edge to it — the difference between dragging a thing and
   *  teleporting it. */
  grabOffset: number;
  /** Where the run would start if you let go now, snapped. */
  previewStart: number;
  /** How long it would run for, snapped. */
  previewHours: number;
  /** The lane the pointer is currently over — not necessarily the run's own. */
  overBelt: BeltId | null;
  /** False when the drop would be refused, so the bar can say so while it
   *  moves rather than after it lands. */
  valid: boolean;
}

/** The board draws the style name only — the lot and order are the sub-line,
 *  so repeating them in the title would truncate both. */
function backlogRun(b: BacklogItem): Run {
  return { ...baseBacklogRun(b), label: b.label.split(" · ")[0] };
}

/** Splice placed runs into a belt's sequence at their slots. Later slots are
 *  applied first so an earlier insertion doesn't shift the ones behind it. */
function insertAt(base: Run[], placed: { slot: number; run: Run }[]): Run[] {
  const out = [...base];
  [...placed]
    .sort((a, b) => b.slot - a.slot)
    .forEach(({ slot, run }) => out.splice(Math.min(slot, out.length), 0, run));
  return out;
}

/** Left gutter carrying the belt name and its load. Fixed so the overlay that
 *  draws the order-flow connector can line up with the tracks exactly. */
const GUTTER = 152;
const AXIS_H = 50;

/** Height of the tick row at the foot of the axis. The band above it holds the
 *  day names and the now-pill, so neither lands on a clock label. */
const TICK_ROW_H = 18;

/** Pixels of travel before a press counts as a drag rather than a click. */
const DRAG_SLOP = 4;

/** Pixels per hour. Fixed at the scale where a two-hour run is legible and a
 *  changeover is visible; the 48-hour window is reached by scrolling rather
 *  than by shrinking everything until nothing can be read. */
type Zoom = 12 | 24 | 48;
/** One fixed density for the whole board, at the scale where a two-hour run is
 *  legible and a changeover is visible. Longer windows are reached by scrolling
 *  rather than by shrinking everything until nothing can be read — at 48h in a
 *  card this wide, a squeezed bar shows "Casca…" and nothing else. */
const PX_PER_HOUR = 76;

/** Where each window scrolls to — the hour it opens on, so a jump always lands
 *  on work rather than on the tail of the board. */
const JUMP_HOUR: Record<Zoom, number> = { 12: 0, 24: 12, 48: 24 };

/** The window options, on a DS segmented control. */
const WINDOWS = [
  { value: "12", label: "12h" },
  { value: "24", label: "24h" },
  { value: "48", label: "48h" },
];
// Tall enough for the constraint belt's gutter, which carries the most: name,
// the "12% slow" flag, the load bar and its figure. Sizing the row to the
// busiest belt keeps all three the same height without cramping that one —
// and now also for a bar carrying three lines rather than two.
const TRACK_H = 88;
/** The division bar that heads each work centre — the plant's own grouping,
 *  drawn full width above its machines/lines. */
const HEADER_H = 30;

/** Breathing space under the timeline header, before the first work centre —
 *  so the axis reads as its own band and doesn't crowd the lanes. */
const AXIS_GAP = 12;

/** Calendar dates for the board's three days. Pinned to the demo's shift
 *  (12 Aug 2026) so the timeline reads as real dates, not just "Tomorrow". */
const DAY_DATE = ["12 Aug", "13 Aug", "14 Aug"];

/** Breathing room before hour zero, so a run starting at 06:00 doesn't sit on
 *  the gutter's border.
 *
 *  Applied to the lane *and* to the axis, which is the only way it can work:
 *  a bar's x-position is its time, so inset the track without insetting the
 *  clock and every bar lands under the wrong label. Both resolve their
 *  percentages against the same inset box, so 06:00 and the run that starts
 *  at 06:00 move together and stay in register. */
const TRACK_INSET = 16;

/** Maintenance reads in slate blue, not the amber a changeover uses: a belt
 *  being worked on and a belt changing colour are different reasons it isn't
 *  producing, and the board shouldn't spell them the same way. */
const MAINT_HATCH = "rgba(37,99,235,.13)";
const MAINT_BD = "rgba(37,99,235,.42)";
const MAINT_INK = "#1D4ED8";

/** Run bar height inside the lane. Shorter than the lane so a bar reads as an
 *  object sitting in a row rather than as the row itself — with room for the
 *  name, the window it runs in, and its lot. */
const BAR_H = 60;

/**
 * Three belts against one clock, drawn as a resource Gantt: position is time.
 * A run starting at 14:00 sits under the 14:00 gridline, changeover is a
 * hatched setup segment on the bar rather than a floating price, and each belt
 * carries its own load — so an oversubscribed constraint reads at a glance
 * instead of having to be worked out.
 *
 * Only Backing is interactive: it's the contested belt, and nudging a run
 * there is how you discover Sawyer is checking the rules.
 */
export default function ScheduleBoard() {
  const {
    beltOrders, split, selected, select, move, scheduled, schedule,
    starts, durations, resizeRun, dropRun,
  } = useSchedule();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  /** Which run's details are open. A click on a bar used to draw a selection
   *  ring and nothing else, which told you the run existed and no more. */
  const [detail, setDetail] = useState<{ runId: string; anchor: DOMRect } | null>(null);
  /** The run whose full record is open. */
  const [review, setReview] = useState<string | null>(null);
  const [hoverGhost, setHoverGhost] = useState<string | null>(null);
  /** The proposal opened for review rather than accepted outright. */
  const [placing, setPlacing] = useState<BacklogItem | null>(null);
  /** Which work centre is shown, and which window the board is scrolled to.
   *  The window is a jump, not a zoom: the density never changes, so a run at
   *  hour 40 is drawn exactly as legibly as one at hour 2. */
  const [zoom, setZoom] = useState<Zoom>(12);
  const [startAt, setStartAt] = useState<number>(0);
  const [centre, setCentre] = useState<string>("all");
  /** Free text that dims the runs it does not match. */
  const [query, setQuery] = useState("");
  /** Grace timer so the pointer can travel from a card onto one of its lines
   *  without the weave vanishing under it. */
  const pxPerHour = PX_PER_HOUR;

  /** Move the viewport to an hour on the board. The density never changes, so
   *  this scrolls rather than rescales. */
  const scrollToHour = useCallback((hour: number) => {
    scrollerRef.current?.scrollTo({ left: hour * PX_PER_HOUR, behavior: "smooth" });
  }, []);

  /** Times you can jump to, every six hours across the board, named by the day
   *  they fall on so "18:00" is never ambiguous on a two-day window. */
  const START_OPTIONS = useMemo(
    () =>
      Array.from({ length: Math.floor(BOARD_HOURS / 6) }, (_, i) => i * 6).map((h) => ({
        value: String(h),
        label: `${DAY_LABEL[dayIndex(h)] ?? ""} ${clockAt(h)}`.trim(),
      })),
    [],
  );
  /** Set when a pointerup ends a real drag. The button's click fires straight
   *  afterwards, and letting it through would pop the details open every time
   *  you moved something. */
  const draggedRef = useRef(false);
  const tracksRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // The drag lives in a ref and is only mirrored into state for rendering.
  // Reading it from the render closure would mean any pointer events that land
  // in the same frame as the press see a stale null — React hasn't re-rendered
  // yet — and the whole drag is silently dropped.
  const dragRef = useRef<DragState | null>(null);

  // Backlog items placed on the board join their belt at the slot they were
  // placed into — Sawyer's, or the one a person overrode it to.
  const placedFromBacklog = useMemo(() => {
    const byBelt: Record<string, { slot: number; run: Run }[]> = {};
    BACKLOG.filter((b) => scheduled.has(b.id)).forEach((b) => {
      (byBelt[b.belt] ??= []).push({ slot: scheduled.get(b.id) ?? b.slot, run: backlogRun(b) });
    });
    return byBelt;
  }, [scheduled]);

  const lanes = useMemo<LaneView[]>(() => {
    const out: LaneView[] = [];
    const centres = centre === "all" ? WORK_CENTRES : WORK_CENTRES.filter((w) => w.id === centre);
    centres.forEach((wc) => {
      wc.lanes.forEach((lane, li) => {
        const common = {
          id: lane.id,
          code: lane.code,
          descriptor: lane.descriptor,
          centreName: wc.name,
          centreUnit: wc.unit,
          firstInCentre: li === 0,
          constraint: Boolean(lane.constraint),
        };

        if (lane.belt) {
          // Interactive lane — mirrors a process belt's sequence in context.
          // A dragged run carries its own start; the rest still pack behind
          // whatever precedes them. Sorting by effective start keeps the lane
          // in the order it is drawn, so a run pushed to tomorrow stops being
          // treated as if it were still second in line.
          const belt = lane.belt;
          const base = (beltOrders[belt].map((id) => RUN_BY_ID[id]).filter(Boolean) as Run[])
            .map((r) => {
              const startAt = starts.get(r.id);
              const hours = durations.get(r.id);
              return startAt === undefined && hours === undefined
                ? r
                : { ...r, ...(startAt !== undefined && { startAt }), ...(hours !== undefined && { hours }) };
            })
            .sort((a, b) => (a.startAt ?? -1) - (b.startAt ?? -1));
          const runs = insertAt(base, placedFromBacklog[belt] ?? []);
          const layout = layoutLane(runs);

          // Everything still waiting for this belt, laid into its *free* time.
          // Same-family lots are grouped so a campaign forms and the purge
          // between them is free — what Sawyer's note on each row claims.
          const waiting = BACKLOG.filter((b) => !scheduled.has(b.id) && b.belt === belt)
            .slice()
            .sort((a, b) => a.family.localeCompare(b.family));
          const proposed = layoutLane([...runs, ...waiting.map(backlogRun)]);
          const ghosts = proposed.placed.filter((p) => waiting.some((b) => b.id === p.run.id));

          out.push({ ...common, belt, layout, ghosts });
        } else {
          // Static display lane — carries its own runs, no drag, no proposals.
          out.push({ ...common, layout: layoutLane(lane.runs ?? []), ghosts: [] });
        }
      });
    });
    return out;
  }, [beltOrders, placedFromBacklog, starts, durations, scheduled, centre]);

  // Work centres, and the vertical offset of every lane once the division bars
  // are stacked in. A header bar sits above each centre's first lane, so a
  // lane's top is no longer index × row height — these offsets are what the
  // drag resolve, the drag chip and the order-flow connectors measure against.
  const groups = useMemo(() => {
    const g: {
      centreName: string;
      centreUnit: string;
      constraint: boolean;
      laneIdx: number[];
    }[] = [];
    lanes.forEach((lane, i) => {
      if (lane.firstInCentre) {
        g.push({ centreName: lane.centreName, centreUnit: lane.centreUnit, constraint: lane.constraint, laneIdx: [i] });
      } else {
        g[g.length - 1].laneIdx.push(i);
      }
    });
    return g.map((grp) => ({
      ...grp,
      avg: Math.round(
        (grp.laneIdx.reduce((n, i) => n + lanes[i].layout.utilisation, 0) / grp.laneIdx.length) * 100,
      ),
    }));
  }, [lanes]);

  const laneTop = useMemo(() => {
    const tops: number[] = [];
    let y = AXIS_GAP;
    lanes.forEach((lane, i) => {
      if (lane.firstInCentre) y += HEADER_H;
      tops[i] = y;
      y += TRACK_H;
    });
    return tops;
  }, [lanes]);

  /** The weave — material connections between cards across work centres,
   *  rebuilt whenever the visible lanes change so re-orders, placements and
   *  the centre filter are always reflected. */
  const weave = useMemo(() => {
    const nodes: WeaveNode[] = [];
    /* Proposals count. A suggestion to tuft a draw that is already being
       tufted on the next machine along is the same mistake as scheduling it
       there — it just hasn't been accepted yet, which is exactly when it is
       cheapest to catch. */
    const proposals: WeaveNode[] = [];

    lanes.forEach((lane, laneIdx) => {
      const centreIdx = WORK_CENTRES.findIndex((w) => w.name === lane.centreName);
      lane.ghosts.forEach((g) => {
        proposals.push({
          runId: g.run.id,
          laneIdx,
          laneCode: lane.code,
          centreIdx,
          centreName: lane.centreName,
          start: g.start,
          hours: g.hours,
          label: g.run.label,
          family: g.run.family,
          dyeLot: g.run.dyeLot,
          yarn: g.run.yarn,
          order: g.run.order,
          fixed: g.run.fixed,
        });
      });
      lane.layout.placed.forEach((p) => {
        nodes.push({
          runId: p.run.id,
          laneIdx,
          laneCode: lane.code,
          centreIdx,
          centreName: lane.centreName,
          start: p.start,
          hours: p.hours,
          label: p.run.label,
          family: p.run.family,
          dyeLot: p.run.dyeLot,
          yarn: p.run.yarn,
          order: p.run.order,
          fixed: p.run.fixed,
        });
      });
    });
    /* The rules, checked against what is actually laid out rather than against
       the fixture — a lane's cards are packed and re-sequenced at render, so
       the placement the reader sees is the only one worth validating. Dev only:
       this catches authoring mistakes in the data, and both of the ones it
       catches were invisible on the board until a lot's whole route was read
       in one list. */
    if (process.env.NODE_ENV !== "production") {
      const bad = scheduleViolations([...nodes, ...proposals]);
      if (bad.length) {
        console.error(
          `Schedule violates ${bad.length} rule${bad.length === 1 ? "" : "s"}:\n` +
            bad.map((v) => `  · [${v.rule}] ${v.message}`).join("\n"),
        );
      }
    }

    return buildWeave(nodes);
  }, [lanes]);

  /* Opening a card lights the material's whole route and dims everything else
     — the same treatment the search filter uses, because it answers the same
     question: which of these cards am I looking at? A lot's stages sit on four
     different lanes, so the board is the only place the route can be seen as a
     shape rather than read as a list. */
  const litChain = useMemo(() => {
    if (!detail) return null;
    const route = chainFor(detail.runId, weave);
    const ids = new Set<string>([detail.runId, ...route.map((n) => n.runId)]);
    return ids.size > 1 ? ids : null;
  }, [detail, weave]);




  /** Pointer position → the hour under it and the lane it is over. Measured
   *  off the track element, whose rect already accounts for scrollLeft. */
  const resolve = useCallback(
    (clientX: number, clientY: number) => {
      const box = tracksRef.current?.getBoundingClientRect();
      if (!box) return null;
      // The inset shifts hour zero, so the pointer has to be measured against
      // the same box the bars are drawn in.
      const hours =
        ((clientX - box.left - TRACK_INSET) / (box.width - TRACK_INSET)) * BOARD_HOURS;
      // Division bars break the uniform row grid, so the lane under the pointer
      // is found against the real offsets rather than by dividing by row height.
      const rel = clientY - box.top - AXIS_H;
      const laneIndex = laneTop.findIndex((top) => rel >= top && rel < top + TRACK_H);
      return { hours, overBelt: lanes[laneIndex]?.belt ?? null };
    },
    [lanes, laneTop],
  );

  /** Nudge the scroller when the cursor reaches its edge, so a run can be
   *  dragged into tomorrow without letting go — at 12h zoom tomorrow is
   *  entirely off-screen, and a drag you have to abandon to scroll isn't one. */
  const autoScroll = useCallback((clientX: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const edge = 56;
    if (clientX > box.right - edge) el.scrollBy({ left: 14 });
    else if (clientX < box.left + edge) el.scrollBy({ left: -14 });
  }, []);

  const setDragState = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const onPointerDown = (
    e: React.PointerEvent,
    runId: string,
    belt: BeltId,
    runStart: number,
    runHours: number,
    mode: DragMode = "move",
  ) => {
    if (RUN_BY_ID[runId]?.fixed) return;
    // Capture keeps the drag alive when the pointer leaves the bar. It throws
    // if the pointer id isn't currently active, and a throw here would abort
    // the handler before the drag state is ever set.
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* no active pointer — the drag still works, it just won't follow
         outside the element */
    }
    setRefusal(null);
    const at = resolve(e.clientX, e.clientY);
    setDragState({
      runId,
      belt,
      mode,
      fromX: e.clientX,
      moved: false,
      // Moving tracks where inside the bar you grabbed; resizing tracks the
      // grip's offset from the run's end, so neither jumps on first move.
      grabOffset: at ? at.hours - (mode === "move" ? runStart : runStart + runHours) : 0,
      previewStart: runStart,
      previewHours: runHours,
      overBelt: belt,
      valid: true,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const cur = dragRef.current;
    if (!cur) return;
    const at = resolve(e.clientX, e.clientY);
    if (!at) return;
    autoScroll(e.clientX);

    const snap = (h: number) => Math.round(h / SNAP_HOURS) * SNAP_HOURS;
    const raw = at.hours - cur.grabOffset;
    const moved = cur.moved || Math.abs(e.clientX - cur.fromX) > DRAG_SLOP;

    if (cur.mode === "resize") {
      const previewHours = Math.max(
        SNAP_HOURS,
        Math.min(BOARD_HOURS - cur.previewStart, snap(raw - cur.previewStart)),
      );
      setDragState({ ...cur, previewHours, moved, valid: previewHours >= SNAP_HOURS });
      return;
    }

    const previewStart = Math.max(
      0,
      Math.min(BOARD_HOURS - cur.previewHours, snap(raw)),
    );
    setDragState({
      ...cur,
      previewStart,
      overBelt: at.overBelt,
      moved,
      valid: at.overBelt === cur.belt && previewStart >= LOCKED_HOURS,
    });
  };

  const onPointerUp = () => {
    const cur = dragRef.current;
    if (!cur) return;
    const { runId, mode, overBelt, previewStart, previewHours, moved } = cur;
    setDragState(null);
    // A press that never travelled is a click. Attempting a drop where the bar
    // already sits would refuse it for being inside the locked window, which is
    // a confusing thing to say about "I selected this".
    draggedRef.current = moved;
    if (!moved) return;
    const result =
      mode === "resize"
        ? resizeRun(runId, previewHours)
        : overBelt
          ? dropRun(runId, overBelt, previewStart)
          : { ok: true as const };
    if (!result.ok) setRefusal(result.reason);
    else select(runId);
  };

  /** Whether a run answers the search. Empty query matches everything, so the
   *  board reads normally until someone actually looks for something. */
  const matches = useCallback(
    (run: Run) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [run.label, run.dyeLot, run.yarn, run.order]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    },
    [query],
  );

  const trackWidth = BOARD_HOURS * pxPerHour;

  // The board's days, as spans across the clock — for the timeline header's day
  // tier, its alternating bands, and its boundary dividers.
  const axisDays = DAY_LABEL.slice(0, DAY_BREAKS.length + 1).map((label, d) => ({
    label,
    date: DAY_DATE[d] ?? "",
    from: d === 0 ? 0 : DAY_BREAKS[d - 1],
    to: d < DAY_BREAKS.length ? DAY_BREAKS[d] : BOARD_HOURS,
  }));

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {/* Board toolbar — its own band under the tabs, full-bleed to the card's
          edges so it reads as a bar rather than as content floating above the
          board. Negative margins undo the board's padding. */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{
          gap: 10,
          margin: "-12px -18px 4px",
          padding: "10px 18px",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        {/* Search at the far left, view controls at the far right: "find a run"
            and "change the view" are different jobs and shouldn't crowd. */}
        <span className="inline-flex" style={{ minWidth: 210, maxWidth: 280, flex: "0 1 auto" }}>
          <Input
            size="md"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search run, lot or order"
            iconLeft={<MagnifyingGlass size={14} />}
            clearable
            onClear={() => setQuery("")}
            aria-label="Search the board"
          />
        </span>
        <span className="inline-flex items-center" style={{ gap: 8 }}>
          <span className="inline-flex" style={{ minWidth: 150 }}>
            <Select size="md" value={centre} onValueChange={setCentre}>
              <Select.Trigger aria-label="Belt">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All belts</Select.Item>
                {WORK_CENTRES.map((wc) => (
                  <Select.Item key={wc.id} value={wc.id}>
                    {wc.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </span>
          <SegmentedControl
            size="md"
            options={WINDOWS}
            value={String(zoom)}
            onValueChange={(v) => {
              const z = Number(v) as Zoom;
              setZoom(z);
              scrollToHour(JUMP_HOUR[z]);
            }}
          />
          <span className="inline-flex" style={{ minWidth: 150 }}>
            <Select
              size="md"
              value={String(startAt)}
              onValueChange={(v) => {
                setStartAt(Number(v));
                scrollToHour(Number(v));
              }}
            >
              <Select.Trigger aria-label="Start time">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {START_OPTIONS.map((o) => (
                  <Select.Item key={o.value} value={o.value}>
                    {o.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </span>
        </span>
      </div>

      {/* Gutter is a fixed column outside the scroller; only the tracks move.
          A belt name that scrolls away from its own bar makes a two-day board
          unreadable the moment you look at tomorrow. */}
      <Legend />

      <div className="flex">
        <div className="shrink-0" style={{ width: GUTTER }}>
          {/* The corner where the gutter meets the timeline header. It carries
              the day the board opens on, so the header reads as one band across
              both columns instead of leaving an empty box beside a label that
              is floating in the track. */}
          <div
            className="flex items-end"
            style={{ height: AXIS_H, paddingBottom: TICK_ROW_H + 2 }}
          >
            <span className="inline-flex items-baseline" style={{ gap: 6, whiteSpace: "nowrap" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--ds-text-primary)",
                }}
              >
                {DAY_LABEL[0]}
              </span>
              <span style={{ fontSize: 10, color: "var(--ds-text-placeholder, var(--text-muted))" }}>
                {DAY_DATE[0]}
              </span>
            </span>
          </div>
          {/* Breathing space below the header, matched on the track side. */}
          <div style={{ height: AXIS_GAP }} />
          {groups.map((g) => (
            <div key={g.centreName}>
              {/* Division bar — the work centre's own heading, over its lanes.
                  Fully outlined; the gutter caps the left, the track caps the
                  right, so the two halves read as one bounded bar. */}
              <div
                className="flex items-center"
                style={{
                  height: HEADER_H,
                  padding: "0 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-default)",
                  borderRight: "none",
                  borderRadius: "7px 0 0 7px",
                }}
              >
                <span
                  className="truncate"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: g.constraint ? "var(--lane-limit-ink)" : "var(--ds-text-primary)",
                  }}
                >
                  {g.centreName}
                </span>
                <span
                  className="truncate"
                  style={{ marginLeft: 6, fontSize: 12, color: "var(--ds-text-secondary)" }}
                >
                  {g.centreUnit}
                </span>
              </div>
              {g.laneIdx.map((i, li) => (
                <div
                  key={lanes[i].id}
                  className="flex items-center"
                  style={{
                    height: TRACK_H,
                    borderTop: li === 0 ? "none" : "1px solid var(--border-light)",
                  }}
                >
                  <LaneGutter lane={lanes[i]} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div ref={scrollerRef} className="flex-1 min-w-0" style={{ overflowX: "auto" }}>
          <div
            ref={tracksRef}
            className="relative"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerDownCapture={(e) => {
              // Anything that isn't a bar dismisses the card; anything that
              // isn't a weave line or its info card unpins the weave.
              const el = e.target as Element;
              if (!el.closest("button")) setDetail(null);
            }}
            style={{ width: trackWidth, touchAction: drag ? "none" : undefined }}
          >
            {/* Timeline header — a day tier over an hour tier, so a day name
                and a clock reading never share a pixel. Alternating day bands
                and full-height boundary rules make "which day" readable before
                any label. */}
            <div
              className="relative"
              style={{
                height: AXIS_H,
                borderBottom: "1px solid var(--border-light)",
                background: "var(--surface-base)",
              }}
            >
              {/* Same inset as the lanes, so a tick sits over its own bar. */}
              <div className="absolute" style={{ left: TRACK_INSET, right: 0, top: 0, bottom: 0 }}>
              {/* Alternating day bands. */}
              {axisDays.map((day, d) => (
                <span
                  key={`band-${day.label}`}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: pct(day.from),
                    width: pct(day.to - day.from),
                    top: 0,
                    bottom: 0,
                    background: d % 2 === 1 ? "var(--surface-raised)" : "transparent",
                  }}
                />
              ))}
              {/* Day boundaries, full height of the header. */}
              {DAY_BREAKS.map((h) => (
                <span
                  key={`axis-div-${h}`}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: pct(h),
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: "var(--border-default)",
                  }}
                />
              ))}

              {/* Day labels — the day, then its date, at the head of each span.
                  The first day is named in the gutter corner instead, so the
                  two columns share one header rather than repeating it. */}
              {axisDays.slice(1).map((day, di) => {
                const d = di + 1;
                return (
                <span
                  key={day.label}
                  className="inline-flex items-baseline"
                  style={{
                    position: "absolute",
                    left: pct(day.from),
                    top: 8,
                    gap: 6,
                    paddingLeft: d === 0 ? 0 : 8,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: d === 0 ? "var(--ds-text-primary)" : "var(--ds-text-secondary)",
                    }}
                  >
                    {day.label}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--ds-text-placeholder, var(--text-muted))" }}>
                    {day.date}
                  </span>
                </span>
                );
              })}

              {/* Hour tier. */}
              <div className="absolute inset-x-0" style={{ bottom: 0, height: TICK_ROW_H }}>
                {/* Minor ticks every 3h, for a finer scale under the labels. */}
                {GRID_HOURS.map((h) => (
                  <span
                    key={`minor-${h}`}
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: pct(h),
                      bottom: 0,
                      width: 1,
                      height: h % 6 === 0 ? 6 : 3,
                      background: h % 6 === 0 ? "var(--border-strong)" : "var(--border-default)",
                    }}
                  />
                ))}
                {TICKS.map((hours, i) => {
                  const isLast = i === TICKS.length - 1;
                  // Centred over its own tick. The first label can afford this
                  // now that the track is inset: half a clock reading is about
                  // 14px, which fits inside TRACK_INSET, so it no longer needs
                  // to hug the tick and let the rule cut through its first
                  // digit. The last one still hugs — nothing sits right of it.
                  const shift = isLast ? "translateX(-100%)" : "translateX(-50%)";
                  return (
                    <span
                      key={hours}
                      style={{
                        position: "absolute",
                        left: pct(hours),
                        top: 1,
                        transform: shift,
                        fontSize: 11,
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--ds-text-secondary)",
                      }}
                    >
                      {clockAt(hours)}
                    </span>
                  );
                })}
              </div>
              </div>
            </div>

            {/* Breathing space below the timeline header, matched in the gutter. */}
            <div style={{ height: AXIS_GAP }} />

            {lanes.map((lane) => {
              const { belt, layout, ghosts } = lane;
              return (
              <Fragment key={lane.id}>
              {/* The division bar, matched in height to the gutter heading so
                  the two columns read as one full-width bar over the group. */}
              {lane.firstInCentre && (
                <div
                  aria-hidden="true"
                  className="flex items-center"
                  style={{
                    height: HEADER_H,
                    paddingLeft: TRACK_INSET,
                    background: "var(--surface-raised)",
                    // The track half of the division bar — top/bottom/right, so
                    // with the gutter's left cap the whole thing is outlined.
                    border: "1px solid var(--border-default)",
                    borderLeft: "none",
                    borderRadius: "0 7px 7px 0",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--ds-text-secondary)", whiteSpace: "nowrap" }}>
                    {groups.find((g) => g.centreName === lane.centreName)?.avg ?? 0}% avg
                    {lane.constraint ? " · constraint" : ""}
                  </span>
                </div>
              )}
              <div
                role="group"
                aria-label={`${lane.code}, ${lane.centreName}${lane.constraint ? ", the constraint" : ""} — ${formatHours(layout.loadHours)} of ${BOARD_HOURS}h scheduled`}
                className="relative"
                style={{
                  height: TRACK_H,
                  // Square and flush. A rounded lane pinches its own gridlines
                  // at both ends, so the hour marks stop lining up across
                  // belts — the one thing a resource Gantt has to get right.
                  overflow: "hidden",
                  background: lane.constraint ? "#FFFDF7" : "var(--surface-base)",
                  borderTop: lane.firstInCentre ? "none" : "1px solid var(--border-light)",
                }}
              >
                {/* Everything on the time scale lives in here, inset from the
                    lane's left edge. Bars are absolutely positioned, so they
                    resolve against this box rather than the lane — which is why
                    padding on the lane itself moved nothing. The lane keeps its
                    own full-width background, so the row still meets the gutter. */}
                <div
                  className="absolute"
                  style={{ left: TRACK_INSET, right: 0, top: 0, bottom: 0 }}
                >
                <Gridlines />
                <DayBreaks />
                <LockedWindow />
                {belt && <Maintenance belt={belt} />}
                {ghosts.map((g) => (
                  <Ghost
                    key={g.run.id}
                    placed={g}
                    process={lane.centreName}
                    pxWidth={g.hours * pxPerHour}
                    active={hoverGhost === g.run.id}
                    onActive={(on) => setHoverGhost(on ? g.run.id : null)}
                    onOpen={() => {
                      const item = BACKLOG.find((x) => x.id === g.run.id);
                      if (item) setPlacing(item);
                      setHoverGhost(null);
                    }}
                    onPlace={() => {
                      // `slot` is past the end of every belt, so the run lands
                      // exactly where its ghost was drawn. A proposal that
                      // moves the moment you accept it isn't a proposal.
                      const item = BACKLOG.find((b) => b.id === g.run.id);
                      if (item) schedule(item.id, item.slot);
                      setHoverGhost(null);
                    }}
                  />
                ))}

                {layout.placed.map((p) => {
                  const isDragging = Boolean(drag?.moved) && drag?.runId === p.run.id;
                  // Faded when it misses the search, or when a card is open
                  // and this one is not part of that material's route.
                  const dim =
                    !matches(p.run) || (litChain !== null && !litChain.has(p.run.id));
                  // Only the lanes wired to a process belt take a drag, open a
                  // details card, or split a lot. The rest display their load.
                  if (!belt) {
                    return (
                      <Block
                        key={p.run.id}
                        placed={p}
                        process={lane.centreName}
                        splitLot={false}
                        interactive={false}
                        selected={false}
                        dim={dim}
                        onSelect={() => {}}
                      />
                    );
                  }
                  return (
                    <Block
                      key={p.run.id}
                      placed={p}
                      process={lane.centreName}
                      splitLot={belt === "backing" && split && p.run.id === "b1"}
                      dim={dim}
                      interactive
                      dragging={isDragging}
                      // While dragging, the bar renders where it would land
                      // rather than where it currently is. The setup segment
                      // stays behind at the committed position — it belongs to
                      // the transition, and the transition hasn't happened yet.
                      previewStart={isDragging ? drag?.previewStart : undefined}
                      previewHours={isDragging ? drag?.previewHours : undefined}
                      invalid={isDragging && !drag?.valid}
                      expanded={detail?.runId === p.run.id}
                      onResizeStep={(d) => resizeRun(p.run.id, Math.max(SNAP_HOURS, p.hours + d))}
                      onDragStart={(e) =>
                        onPointerDown(e, p.run.id, belt, p.start, p.hours, "move")
                      }
                      onResizeStart={(e) =>
                        onPointerDown(e, p.run.id, belt, p.start, p.hours, "resize")
                      }
                      selected={selected === p.run.id}
                      onSelect={(el) => {
                        if (draggedRef.current) {
                          draggedRef.current = false;
                          return;
                        }
                        select(p.run.id);
                        setDetail((cur) =>
                          cur?.runId === p.run.id
                            ? null
                            : { runId: p.run.id, anchor: el.getBoundingClientRect() },
                        );
                      }}
                    />
                  );
                })}
                </div>
              </div>
              </Fragment>
              );
            })}

            {/* The weave — material connections for the hovered card, drawn at
                the track layer so a line can cross lanes without being clipped
                by them. Hidden while dragging: two overlays talking about the
                same card at once is noise. */}

            {/* The time readout rides above the bar being dragged. It lives
                here rather than inside the bar because a lane clips its own
                overflow, and a chip that sits above the bar would be cut off
                by the very lane it belongs to. */}
            {drag?.moved && <DragTimeChip drag={drag} lanes={lanes} laneTop={laneTop} />}

            {/* Details, at the track layer for the same reason as the drag
                chip: a lane clips its own overflow, so a card anchored under a
                bar would be sliced off by the lane it belongs to. */}


          </div>
        </div>
      </div>

      {detail && !drag && (
        <RunPopover
          runId={detail.runId}
          anchor={detail.anchor}
          lanes={lanes}
          journey={chainFor(detail.runId, weave)}
          index={beltOrders.backing.indexOf(detail.runId)}
          orderLength={beltOrders.backing.length}
          inSequence={beltOrders.backing.includes(detail.runId)}
          onMove={move}
          onReview={() => {
            setReview(detail.runId);
            setDetail(null);
          }}
          onClose={() => setDetail(null)}
        />
      )}

      {review &&
        (() => {
          const lane = lanes.find((l) => l.layout.placed.some((p) => p.run.id === review));
          const placed = lane?.layout.placed.find((p) => p.run.id === review);
          return lane && placed ? (
            <RunReviewModal
              placed={placed}
              beltName={`${lane.code} · ${lane.centreName}`}
              onClose={() => setReview(null)}
            />
          ) : null;
        })()}

      {placing && (
        <RunDeckModal item={placing} onClose={() => setPlacing(null)} />
      )}

      {refusal && (
        <span
          className="type-caption"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--surface-danger)",
            color: "var(--text-danger)",
          }}
        >
          {refusal}
        </span>
      )}

    </div>
  );
}

/* ─── Gutter ────────────────────────────────────────────────────────────── */

/** "9h", "4.75h" — trailing zeros dropped so the column stays scannable. */
const formatHours = (h: number) =>
  `${Number(h.toFixed(2)).toString().replace(/\.0+$/, "")}h`;

/**
 * A bar's sub-line, named the way the stage names things.
 *
 * Tufting runs greige yarn, so it carries the yarn lot alone — no colour exists
 * yet. Dyeing and backing carry both: the yarn it came from and the dye lot it
 * became. Finishing carries the roll, because by then the output is a physical
 * thing with its own number. Using one identifier everywhere would have meant
 * showing a dye lot on a belt where dye hasn't happened.
 */
function runSubline(run: Run, process?: string): string {
  const orders = run.orders ?? (run.order ? 1 : 0);
  const count = orders ? `${orders} order${orders === 1 ? "" : "s"}` : null;

  if (process === "Finishing") {
    return [ROLL_NO[run.id] ?? run.id, count].filter(Boolean).join(" · ");
  }
  if (process === "Dyeing" || process === "Backing") {
    const yarn = run.yarn ?? (run.dyeLot ? YARN_FOR_DYE[run.dyeLot] : undefined);
    return [yarn, run.dyeLot].filter(Boolean).join(" · ") || (count ?? "");
  }
  // Tufting, and anything else that hasn't been dyed.
  return [run.yarn ?? run.dyeLot, count].filter(Boolean).join(" · ");
}

function LaneGutter({ lane }: { lane: LaneView }) {
  const { layout } = lane;
  const pctLoad = Math.round(layout.utilisation * 100);
  const tone = layout.over
    ? "var(--text-danger)"
    : lane.constraint
      ? "var(--lane-limit-ink)"
      : "var(--ds-text-secondary)";

  return (
    <div
      className="flex flex-col justify-center h-full w-full"
      // Fills the fixed gutter column (rather than shrinking to its own text),
      // so the load bar is the same width in every lane. Left inset matches the
      // division bar above, so code, descriptor and bar all align under it.
      style={{ gap: 3, minWidth: 0, paddingLeft: 12, paddingRight: 12 }}
      title={`${layout.loadHours.toFixed(2)}h of ${BOARD_HOURS}h, changeover included`}
    >
      <span className="flex items-baseline justify-between" style={{ gap: 8 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ds-text-primary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {lane.code}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: tone, fontVariantNumeric: "tabular-nums" }}>
          {pctLoad}%
        </span>
      </span>
      <span
        className="truncate"
        style={{ fontSize: 10, color: "var(--ds-text-secondary)" }}
      >
        {lane.descriptor}
      </span>
      <Progress
        value={Math.min(100, pctLoad)}
        size="sm"
        variant={layout.over ? "error" : lane.constraint ? "warning" : "neutral"}
        aria-label={`${lane.code} load`}
      />
    </div>
  );
}

/**
 * A run that hasn't been placed yet, drawn where Sawyer proposes to put it.
 *
 * It sits in the belt's free time, after everything committed and clear of the
 * freeze — the only position that is true of a run nobody has placed yet.
 *
 * The whole ghost is the button. There is one thing to do with a proposal and
 * hiding it behind a second target would only add a click.
 */
function Ghost({
  placed,
  process,
  pxWidth,
  active,
  onActive,
  onPlace,
  onOpen,
}: {
  placed: PlacedRun;
  /** The work centre this lane sits in — it decides which identifier the bar
   *  carries, since a dye lot means nothing on a belt that hasn't dyed. */
  process?: string;
  /** Rendered width in pixels, so the actions can degrade to icons on a
   *  proposal too narrow to hold a word. */
  pxWidth: number;
  active: boolean;
  onActive: (on: boolean) => void;
  onPlace: () => void;
  onOpen: () => void;
}) {
  const { run, start, hours } = placed;
  const sub = runSubline(run, process);
  const where = `${clockAt(start)} to ${clockAt(start + hours)}`;
  const roomForWords = pxWidth >= 132;

  return (
    <div
      role="group"
      aria-label={`Proposed: ${run.label}${sub ? `, ${sub}` : ""}, ${where}`}
      onPointerEnter={() => onActive(true)}
      onPointerLeave={() => onActive(false)}
      // Focus bubbles in React, so tabbing to either action reveals both —
      // otherwise a keyboard user would be operating controls they can't see.
      onFocus={() => onActive(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onActive(false);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="transition-colors"
      style={{
        position: "absolute",
        left: pct(start),
        width: pct(hours),
        top: (TRACK_H - BAR_H) / 2,
        height: BAR_H,
        zIndex: active ? 5 : 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
        whiteSpace: "nowrap",
        padding: "0 8px 0 33px",
        borderRadius: 6,
        textAlign: "left",
        border: `1px dashed ${active ? "var(--color-iris-500)" : "var(--color-iris-400)"}`,
        background: active ? "var(--color-iris-100)" : "var(--color-iris-50)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 7,
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0.55,
        }}
      >
        <YarnCone colour={run.accent} height={24} />
      </span>

      {active ? (
        // Two actions, because a proposal invites two different questions:
        // "yes, do it" and "what is this, exactly". Answering the second by
        // placing it first and undoing would be a worse trade.
        <span className="flex items-center" style={{ gap: 6 }}>
          <button
            type="button"
            onClick={onPlace}
            aria-label={`Place ${run.label} at ${where}`}
            title={`Place at ${where}`}
            className="inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-iris-700)]"
            style={{
              gap: 4,
              height: 22,
              padding: roomForWords ? "0 8px" : 0,
              width: roomForWords ? undefined : 22,
              justifyContent: "center",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 600,
              color: "#FFFFFF",
              background: "var(--color-iris-700)",
            }}
          >
            <Plus size={10} weight="bold" />
            {roomForWords && "Place"}
          </button>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open ${run.label} to review or change its placement`}
            title="Open to review or change the placement"
            className="inline-flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-iris-700)]"
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              cursor: "pointer",
              border: "1px solid var(--color-iris-400)",
              background: "var(--surface-base)",
              color: "var(--color-iris-700)",
            }}
          >
            <PencilSimple size={11} weight="bold" />
          </button>
        </span>
      ) : (
        <>
          <span
            className="truncate"
            style={{
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--color-iris-700)",
            }}
          >
            {run.label}
          </span>
          <span
            className="truncate"
            style={{
              fontSize: 10,
              lineHeight: 1.35,
              color: "var(--color-iris-700)",
              opacity: 0.72,
            }}
          >
            {sub || "proposed"}
          </span>
        </>
      )}
    </div>
  );
}

/* ─── Track furniture ───────────────────────────────────────────────────── */

function Gridlines() {
  return (
    <>
      {GRID_HOURS.map((h) => (
        <span
          key={h}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: pct(h),
            top: 0,
            bottom: 0,
            width: 1,
            // Hour zero is left bare. A rule there lands inside the track's
            // inset, where it reads as a stray border a few pixels off the
            // gutter rather than as the start of the day — and the gap stops
            // looking like padding at all. The lane's own left edge already
            // marks where the board begins.
            background: h > 0 && h % 6 === 0 ? "var(--border-light)" : "transparent",
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

/**
 * The immovable head of the board — ground, not a block.
 *
 * Two bands, because they are immovable for different reasons and a person
 * asking "why can't I touch this?" deserves different answers. Up to the now
 * line the work has already run: that isn't a policy, it's history. From there
 * to the end of the freeze the floor simply can't turn around in time —
 * staging yarn, dressing a creel, finding a crew. Only the second one is a
 * rule, and only the second one could be argued with.
 */
function LockedWindow() {
  return (
    <>
      <span
        aria-hidden="true"
        title="already run"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: pct(NOW_HOURS),
          background: "rgba(113,113,123,.055)",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden="true"
        title="frozen — the floor can't react inside this"
        style={{
          position: "absolute",
          left: pct(NOW_HOURS),
          top: 0,
          bottom: 0,
          width: pct(LOCKED_HOURS - NOW_HOURS),
          borderRight: "1px dashed var(--border-strong)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/**
 * Planned outages, drawn as ground beneath the runs.
 *
 * A gap on a belt is ambiguous on its own — it could be slack you can fill or
 * time that is already spoken for, and those lead to opposite decisions. Only
 * the declared windows are labelled; the layout's other gaps stay unlabelled
 * because a belt waiting on the belt upstream is idle, not under maintenance.
 */
function Maintenance({ belt }: { belt: BeltId }) {
  const windows = MAINTENANCE.filter((m) => m.belt === belt);
  if (!windows.length) return null;

  return (
    <>
      {windows.map((m) => (
        <span
          key={`${m.belt}-${m.start}`}
          role="img"
          aria-label={`${m.label}, ${clockAt(m.start)} to ${clockAt(m.start + m.hours)}`}
          title={`${m.label} · ${clockAt(m.start)}–${clockAt(m.start + m.hours)}`}
          className="flex items-center justify-center"
          style={{
            position: "absolute",
            left: pct(m.start),
            width: pct(m.hours),
            top: 6,
            bottom: 6,
            zIndex: 1,
            overflow: "hidden",
            whiteSpace: "nowrap",
            padding: "0 6px",
            borderRadius: 4,
            border: `1px solid ${MAINT_BD}`,
            background: `repeating-linear-gradient(45deg, ${MAINT_HATCH}, ${MAINT_HATCH} 5px, transparent 5px, transparent 10px)`,
          }}
        >
          <span
            className="truncate"
            style={{ fontSize: 10, fontWeight: 600, color: MAINT_INK }}
          >
            {m.label}
          </span>
        </span>
      ))}
    </>
  );
}

/** Midnight, drawn solid across every track. A run that crosses this line
 *  runs overnight, which is a different conversation from one that doesn't. */
function DayBreaks() {
  return (
    <>
      {DAY_BREAKS.map((h) => (
        <span
          key={h}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: pct(h),
            top: 0,
            bottom: 0,
            width: 1,
            background: "var(--border-strong)",
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

/* ─── Blocks ────────────────────────────────────────────────────────────── */

function Block({
  placed,
  process,
  splitLot,
  interactive,
  dim,
  dragging,
  previewStart,
  previewHours,
  invalid,
  expanded,
  onDragStart,
  onResizeStart,
  onResizeStep,
  selected,
  onSelect,
}: {
  placed: PlacedRun;
  process?: string;
  splitLot: boolean;
  interactive: boolean;
  /** Faded because it doesn't answer the board's search. */
  dim?: boolean;
  dragging?: boolean;
  previewStart?: number;
  previewHours?: number;
  invalid?: boolean;
  expanded?: boolean;
  onDragStart?: (e: React.PointerEvent) => void;
  onResizeStart?: (e: React.PointerEvent) => void;
  onResizeStep?: (delta: number) => void;
  selected: boolean;
  onSelect: (el: HTMLElement) => void;
}) {
  const { run, setupStart, setupHours, setupCost } = placed;
  const start = previewStart ?? placed.start;
  const hours = previewHours ?? placed.hours;

  return (
    <>
      {setupHours > 0 && (
        <Setup start={setupStart} hours={setupHours} cost={setupCost} />
      )}
      {/* Where it came from, kept faintly visible while it moves — a calendar
          shows you the slot you are vacating. */}
      {dragging && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: pct(placed.start),
            width: pct(placed.hours),
            top: (TRACK_H - BAR_H) / 2,
            height: BAR_H,
            borderRadius: "0 8px 8px 0",
            border: "1px dashed var(--border-strong)",
            background: "rgba(113,113,123,.05)",
            zIndex: 1,
          }}
        />
      )}
      {splitLot ? (
        <>
          <Bar
            run={run}
            process={process}
            dim={dim}
            start={start}
            hours={hours / 2}
            label={`${run.dyeLot} · A`}
            meta="split dye run"
            interactive={interactive}
            selected={selected}
            dragging={dragging}
            invalid={invalid}
            onDragStart={onDragStart}
            onSelect={onSelect}
            risky
          />
          <Bar
            run={run}
            process={process}
            dim={dim}
            start={start + hours / 2}
            hours={hours / 2}
            label={`${run.dyeLot} · B`}
            meta="shade risk"
            interactive={interactive}
            selected={selected}
            dragging={dragging}
            invalid={invalid}
            onDragStart={onDragStart}
            onSelect={onSelect}
            risky
          />
        </>
      ) : (
        <Bar
          run={run}
          process={process}
          dim={dim}
          start={start}
          hours={hours}
          interactive={interactive}
          selected={selected}
          dragging={dragging}
          invalid={invalid}
          expanded={expanded}
          onDragStart={onDragStart}
          onResizeStart={onResizeStart}
          onResizeStep={onResizeStep}
          onSelect={onSelect}
        />
      )}
    </>
  );
}

/** Changeover, drawn as hatched belt time attached to the run it precedes —
 *  the standard resource-Gantt convention for setup vs run. On a constraint
 *  line the minutes matter as much as the dollars, so it takes real width. */
function Setup({ start, hours, cost }: { start: number; hours: number; cost: number }) {
  return (
    <span
      role="img"
      aria-label={`Changeover, ${Math.round(hours * 60)} minutes, $${cost.toLocaleString()}`}
      title={`Changeover ${Math.round(hours * 60)} min · $${cost.toLocaleString()}`}
      style={{
        position: "absolute",
        left: pct(start),
        width: pct(hours),
        top: (TRACK_H - BAR_H) / 2,
        height: BAR_H,
        borderRadius: "5px 0 0 5px",
        background:
          "repeating-linear-gradient(45deg, rgba(158,57,0,.14), rgba(158,57,0,.14) 3px, transparent 3px, transparent 6px)",
        border: "1px solid var(--lane-limit-bd)",
        borderRight: "none",
        zIndex: 1,
      }}
    />
  );
}

function Bar({
  run,
  process,
  dim,
  start,
  hours,
  label,
  meta,
  interactive,
  selected,
  dragging,
  invalid,
  expanded,
  onDragStart,
  onResizeStart,
  onResizeStep,
  onSelect,
  risky,
}: {
  run: Run;
  process?: string;
  dim?: boolean;
  start: number;
  hours: number;
  label?: string;
  meta?: string;
  interactive: boolean;
  dragging?: boolean;
  invalid?: boolean;
  expanded?: boolean;
  onDragStart?: (e: React.PointerEvent) => void;
  onResizeStart?: (e: React.PointerEvent) => void;
  onResizeStep?: (delta: number) => void;
  selected: boolean;
  onSelect: (el: HTMLElement) => void;
  risky?: boolean;
}) {
  const sub = meta ?? runSubline(run, process);

  const style: React.CSSProperties = {
    position: "absolute",
    left: pct(start),
    width: pct(hours),
    top: (TRACK_H - BAR_H) / 2,
    height: BAR_H,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    overflow: "hidden",
    padding: "8px 8px 8px 33px",
    borderRadius: 8,
    background: "var(--surface-base)",
    border: `1px solid ${risky ? "var(--lane-limit-bd)" : "var(--border-default)"}`,
    // A soft drop shadow at rest so each run reads as a card sitting on the
    // board rather than a flat block painted onto it. Selection adds the ring
    // over the shadow; a drag lifts it further off the surface.
    boxShadow: dragging
      ? `0 8px 20px rgba(24,24,27,.20), 0 0 0 2px ${
          invalid ? "var(--text-danger)" : "var(--color-iris-500)"
        }`
      : selected
        ? "0 0 0 2px var(--color-iris-500), 0 2px 5px rgba(24,24,27,.12)"
        : "0 1px 2px rgba(24,24,27,.10), 0 2px 5px rgba(24,24,27,.07)",
    textAlign: "left",
    opacity: dim ? 0.28 : 1,
    // Lifted off the board while it moves, and settling with a short ease when
    // it lands. The transition is switched off during the drag itself so the
    // bar tracks the cursor exactly rather than lagging behind it.
    zIndex: dragging ? 6 : 2,
    transform: dragging ? "translateY(-1px)" : undefined,
    transition: dragging ? "none" : "left 140ms cubic-bezier(.2,.7,.3,1)",
  };

  const body = (
    <>
      {/* The run's colour as the thing it actually is — a cone of that yarn.
          A flat strip said "this run has a colour"; the cone says which. */}
      <span
        aria-hidden="true"
        style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)" }}
      >
        <YarnCone colour={run.accent} height={26} />
      </span>
      <span
        className="truncate"
        style={{ fontSize: 11, fontWeight: 600, color: "var(--ds-text-primary)", lineHeight: 1.3 }}
      >
        {label ?? run.label}
        {run.fixed && <span style={{ color: "var(--text-danger)" }}> · fixed</span>}
      </span>
      {/* The window, on the bar rather than only in its tooltip. A Gantt puts
          time on the x-axis, but reading a card's start off the axis means
          tracking a column header several lanes away — and the whole point of
          a route is that its stages sit on different lanes. */}
      <span
        className="truncate"
        style={{
          fontSize: 9.5,
          lineHeight: 1.3,
          color: "var(--ds-text-placeholder, var(--text-muted))",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {clockAt(start)}–{clockAt(start + hours)}
      </span>
      {sub && (
        <span
          className="truncate"
          style={{
            fontSize: 10,
            lineHeight: 1.35,
            color: risky ? "var(--text-danger)" : "var(--ds-text-secondary)",
          }}
        >
          {sub}
        </span>
      )}
    </>
  );

  const title = `${run.label} · ${clockAt(start)}–${clockAt(start + hours)} (${hours}h)`;


  if (!interactive) {
    return (
      <span style={style} title={title}>
        {body}
      </span>
    );
  }

  // A pinned run can be inspected but not moved — its date is the constraint
  // everything else is arranged around, so the cursor says so before the drag
  // is refused.
  const movable = !run.fixed;

  // The bar's own text is the run's name and lot; the time, the belt and what
  // clicking does are only in `title`, which screen readers do not reliably
  // expose and touch never does. The label states all of it.
  const spoken =
    `${run.label}${run.fixed ? ", fixed date" : ""}, ` +
    `${clockAt(start)} to ${clockAt(start + hours)}, ${formatHours(hours)}` +
    (sub ? `, ${sub}` : "") +
    (movable ? ". Open details" : ". Fixed date, cannot be moved. Open details");

  return (
    <>
      <button
        type="button"
       
        onClick={(e) => onSelect(e.currentTarget)}
        onPointerDown={movable ? onDragStart : undefined}
        // Not `aria-pressed`: this isn't a toggle, it opens a details card.
        aria-haspopup="dialog"
        aria-expanded={expanded ?? false}
        aria-label={spoken}
        title={movable ? `${title} · drag to move` : `${title} · fixed date, can't move`}
        className="transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-iris-500)]"
        style={{
          ...style,
          cursor: movable ? (dragging ? "grabbing" : "grab") : "pointer",
          touchAction: movable ? "none" : undefined,
        }}
      >
        {body}
      </button>

      {/* Trailing grip: widen the belt time this run is allowed. A sibling of
          the bar rather than a child of it — it used to be a `role="presentation"`
          span *inside* the button, which is both invalid (an interactive
          control nested in a control) and unreachable without a mouse.
          As a real button it takes focus and arrow keys.

          Only the end is grabbable: the start is set by dragging the bar, and a
          two-handled bar invites moving a run by its left edge, which silently
          changes duration as well as time. */}
      {onResizeStart && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e);
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            onResizeStep?.(e.key === "ArrowRight" ? SNAP_HOURS : -SNAP_HOURS);
          }}
          role="slider"
          aria-label={`Belt time for ${run.label}`}
          aria-valuetext={`${formatHours(hours)}, ending ${clockAt(start + hours)}`}
          aria-valuenow={hours}
          aria-valuemin={SNAP_HOURS}
          aria-valuemax={BOARD_HOURS - start}
          title="Drag, or use arrow keys, to give this run more belt time"
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-iris-500)]"
          style={{
            position: "absolute",
            left: `calc(${pct(start + hours)} - 10px)`,
            top: (TRACK_H - BAR_H) / 2,
            height: BAR_H,
            width: 10,
            zIndex: 3,
            cursor: "ew-resize",
            background: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 2,
              height: 14,
              borderRadius: 1,
              background: "var(--border-strong)",
              opacity: dragging ? 1 : 0.55,
            }}
          />
        </button>
      )}
    </>
  );
}

/** What a calendar tells you while you drag: where this lands. Without it you
 *  are aiming a block at a gridline and hoping. */
function DragTimeChip({
  drag,
  lanes,
  laneTop,
}: {
  drag: DragState;
  lanes: ReadonlyArray<{ belt?: BeltId }>;
  laneTop: ReadonlyArray<number>;
}) {
  const run = RUN_BY_ID[drag.runId];
  if (!run) return null;
  const laneIndex = lanes.findIndex((l) => l.belt === drag.belt);
  const nominal = run.hours;
  const end = drag.previewStart + drag.previewHours;

  return (
    <span
      aria-live="polite"
      style={{
        position: "absolute",
        left: pct(drag.previewStart),
        top: AXIS_H + (laneTop[laneIndex] ?? 0) - 10,
        transform: "translateY(-100%)",
        zIndex: 8,
        whiteSpace: "nowrap",
        fontSize: 10,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        color: "#FFFFFF",
        background: drag.valid ? "var(--color-iris-700)" : "var(--text-danger)",
        borderRadius: 4,
        padding: "3px 7px",
        boxShadow: "0 2px 6px rgba(24,24,27,.24)",
        pointerEvents: "none",
      }}
    >
      {drag.mode === "resize"
        ? `${formatHours(drag.previewHours)} belt time · ends ${clockAt(end)}${
            drag.previewHours > nominal ? ` · +${formatHours(drag.previewHours - nominal)}` : ""
          }`
        : drag.valid
          ? `${clockAt(drag.previewStart)} – ${clockAt(end)}`
          : drag.overBelt !== drag.belt
            ? "different belt — can't move here"
            : "frozen — can't move here"}
    </span>
  );
}

/**
 * What a run is, on one click.
 *
 * Deliberately a card and not the full deck: the question a board provokes is
 * "what is this and why is it here", and answering it shouldn't cost the board
 * itself. Anything that needs the whole record has a link out to it.
 *
 * It reads from the laid-out run rather than the raw data, so the times shown
 * are the times drawn — including a widened allowance, which is exactly the
 * thing you would want to check after dragging an edge.
 */
function RunPopover({
  runId,
  anchor,
  lanes,
  journey,
  index,
  orderLength,
  inSequence,
  onMove,
  onReview,
  onClose,
}: {
  runId: string;
  anchor: DOMRect;
  lanes: ReadonlyArray<{ code: string; centreName: string; constraint: boolean; layout: LaneLayout }>;
  /** Every stage this material passes through, tufting first. */
  journey: ReadonlyArray<WeaveNode>;
  index: number;
  orderLength: number;
  inSequence: boolean;
  onMove: (d: -1 | 1) => void;
  onReview: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Scrolling or resizing moves the bar out from under a fixed card, so the
    // card goes rather than drifting away from what it describes.
    //
    // Registered a frame late on purpose: clicking a bar focuses it, and the
    // browser scrolls the track container to bring a focused child into view.
    // That scroll fires in the same tick as the click, so a listener attached
    // immediately would close the card before it had been seen once.
    const frame = requestAnimationFrame(() => {
      window.addEventListener("scroll", onClose, true);
      window.addEventListener("resize", onClose);
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const laneIndex = lanes.findIndex((l) => l.layout.placed.some((p) => p.run.id === runId));
  if (laneIndex < 0) return null;
  const lane = lanes[laneIndex];
  const placed = lane.layout.placed.find((p) => p.run.id === runId);
  if (!placed) return null;

  const { run, hours, start, setupHours, setupCost } = placed;
  const nominal = RUN_BY_ID[run.id]?.hours ?? hours;
  const widened = hours > nominal;

  const rows: Array<{ k: string; v: React.ReactNode }> = [
    { k: "Line", v: `${lane.code} · ${lane.centreName}${lane.constraint ? " · the constraint" : ""}` },
    {
      k: "Runs",
      v: `${clockAt(start)} – ${clockAt(start + hours)} · ${formatHours(hours)}`,
    },
    ...(widened
      ? [{
          k: "Allowance",
          v: (
            <span style={{ color: "var(--color-iris-700)" }}>
              +{formatHours(hours - nominal)} over the {formatHours(nominal)} nominal
            </span>
          ),
        }]
      : []),
    {
      k: "Changeover in",
      v:
        setupHours > 0
          ? `${formatHours(setupHours)} · $${setupCost.toLocaleString()}`
          : "none — same family",
    },
    ...(run.yarn
      ? [{ k: "Yarn lot", v: <DrillLink kind="yarn" id={run.yarn} /> }]
      : run.dyeLot
        ? [{ k: "Dye lot", v: <DrillLink kind="dyelot" id={run.dyeLot} /> }]
        : []),
    ...(() => {
      const n = run.orders ?? (run.order ? 1 : 0);
      if (n > 1) return [{ k: "Orders", v: `${n} orders` }];
      return run.order ? [{ k: "Order", v: <DrillLink kind="order" id={run.order} /> }] : [];
    })(),
  ];

  // Fixed and portalled. The track scroller sets `overflow-x: auto`, which
  // makes the cross axis a clipping context too, so anything drawn inside it
  // gets its bottom sliced off. A popover has to leave that box entirely.
  const W = 268;
  const left = Math.max(12, Math.min(anchor.left, window.innerWidth - W - 12));
  const below = anchor.bottom + 8;
  const fitsBelow = below + 220 < window.innerHeight;

  return createPortal(
    <div
      role="dialog"
      aria-label={`${run.label} details`}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left,
        ...(fitsBelow ? { top: below } : { bottom: window.innerHeight - anchor.top + 8 }),
        zIndex: 1200,
        width: W,
        borderRadius: 10,
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        boxShadow: "0 12px 28px rgba(24,24,27,.18)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-start justify-between"
        style={{ gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border-light)" }}
      >
        <span className="flex flex-col" style={{ gap: 1, minWidth: 0 }}>
          <span className="type-body-medium truncate" style={{ color: "var(--ds-text-primary)" }}>
            {run.label}
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {run.fixed ? "Fixed install date — can't move" : "Drag to move · grip to widen"}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ background: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}
        >
          <X size={13} weight="bold" color="var(--ds-text-secondary)" />
        </button>
      </div>

      <div className="flex flex-col">
        {rows.map((r, i) => (
          <span
            key={r.k}
            className="flex items-baseline justify-between"
            style={{
              gap: 12,
              padding: "7px 12px",
              borderTop: i === 0 ? "none" : "1px solid var(--border-light)",
            }}
          >
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {r.k}
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-primary)", textAlign: "right" }}>
              {r.v}
            </span>
          </span>
        ))}
      </div>

      {/* Where this material has been and where it is going.
          The board draws one card per stage on its own belt, so a lot's route
          through the plant is only visible by reading four lanes at once. The
          stages are the same genealogy the hover overlay used to draw as lines
          across the board — read here instead, where each one can carry its
          belt and its clock rather than needing to be hovered to exist. */}
      {journey.length > 1 && (
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-light)" }}>
          <PanelTimeline
            title="Through the plant"
            idPrefix={`run-${run.id}`}
            milestones={journey.map((n) => ({
              id: n.runId,
              label: `${n.centreName} · ${n.laneCode}`,
              /* Position in the route, not wall-clock: the card you opened is
                 where the material is, everything before it is done and
                 everything after is still to come. */
              status:
                n.runId === run.id
                  ? ("active" as const)
                  : n.centreIdx < (journey.find((x) => x.runId === run.id)?.centreIdx ?? 0)
                    ? ("completed" as const)
                    : ("pending" as const),
              date: `${clockAt(n.start)} – ${clockAt(n.start + n.hours)}`,
              events: [],
            }))}
          />
        </div>
      )}

      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 8, padding: "9px 12px", borderTop: "1px solid var(--border-light)" }}
      >
        {inSequence && !run.fixed ? (
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <Button
              variant="outline"
              size="sm"
              iconLeft={<CaretLeft size={12} weight="bold" />}
              disabled={index <= 0}
              onClick={() => onMove(-1)}
            >
              Earlier
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconRight={<CaretRight size={12} weight="bold" />}
              disabled={index >= orderLength - 1}
              onClick={() => onMove(1)}
            >
              Later
            </Button>
          </span>
        ) : (
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {run.fixed ? "Pinned to its date" : "Not in the nudgeable sequence"}
          </span>
        )}
        <Button variant="primary" size="sm" onClick={onReview}>
          Review
        </Button>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Legend ────────────────────────────────────────────────────────────── */

function Legend() {
  return (
    <div className="flex items-center flex-wrap" style={{ gap: 16, paddingTop: 2 }}>
      <Key
        swatch={
          <span
            style={{
              width: 14,
              height: 10,
              borderRadius: 3,
              border: "1px solid var(--lane-limit-bd)",
              background:
                "repeating-linear-gradient(45deg, rgba(158,57,0,.16), rgba(158,57,0,.16) 3px, transparent 3px, transparent 6px)",
            }}
          />
        }
        label="changeover"
      />
      <Key
        swatch={
          <span style={{ width: 14, height: 10, borderRadius: 3, background: "rgba(113,113,123,.14)" }} />
        }
        label="already run"
      />
      <Key
        swatch={
          <span
            style={{
              width: 14,
              height: 10,
              borderRadius: 3,
              borderRight: "1px dashed var(--border-strong)",
            }}
          />
        }
        label="frozen — now + 3.5h"
      />
      <Key
        swatch={
          <span
            style={{
              width: 14,
              height: 10,
              borderRadius: 3,
              border: "1px dashed var(--border-strong)",
              background: "var(--surface-base)",
            }}
          />
        }
        label="proposed — click to place"
      />
      <Key
        swatch={
          <span
            style={{
              width: 14,
              height: 10,
              borderRadius: 3,
              border: `1px solid ${MAINT_BD}`,
              background: `repeating-linear-gradient(45deg, ${MAINT_HATCH}, ${MAINT_HATCH} 3px, transparent 3px, transparent 6px)`,
            }}
          />
        }
        label="maintenance"
      />
    </div>
  );
}

function Key({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 6 }}>
      {/* The swatch restates the label in colour; announcing it as well would
          make every legend entry arrive twice. */}
      <span aria-hidden="true" className="inline-flex">
        {swatch}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--ds-text-secondary)",
        }}
      >
        {label}
      </span>
    </span>
  );
}


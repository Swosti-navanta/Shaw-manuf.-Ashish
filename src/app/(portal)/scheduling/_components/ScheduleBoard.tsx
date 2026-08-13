"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Progress } from "@navanta-ai/design-system";
import { CaretLeft, CaretRight, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { useSchedule } from "@/context/ScheduleContext";
import { BACKLOG, BOARD_HOURS, MAINTENANCE, RUNS, STATIC_BELTS } from "@/data/schedule-data";
import { BELTS, type BacklogItem, type BeltId, type Run } from "@/types/schedule";
import DrillLink from "@/components/ui/DrillLink";
import RunDeckModal from "./RunDeckModal";
import RunReviewModal from "./RunReviewModal";
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
  layoutLane,
  pct,
  type LaneLayout,
  type PlacedRun,
} from "./board-layout";

/** Every run on the board by id, whichever belt it belongs to. */
const RUN_BY_ID: Record<string, Run> = {
  ...RUNS,
  ...Object.fromEntries(
    [...STATIC_BELTS.tufting, ...STATIC_BELTS.finishing].map((r) => [r.id, r]),
  ),
};

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
const PX_PER_HOUR = 76;
// Tall enough for the constraint belt's gutter, which carries the most: name,
// the "12% slow" flag, the load bar and its figure. Sizing the row to the
// busiest belt keeps all three the same height without cramping that one.
const TRACK_H = 76;
// Rows sit flush and are separated by a rule instead of a gap, so the gutter
// and the track read as one grid rather than two lists that happen to align.
const ROW_GAP = 0;
const ROW_H = TRACK_H + ROW_GAP;

/** Breathing room before hour zero, so a run starting at 06:00 doesn't sit on
 *  the gutter's border. Applied as padding on the lane and on the axis — both
 *  then resolve their percentages against the same inset box, so the bars stay
 *  under their own gridlines. */
const TRACK_INSET = 8;

/** Run bar height inside the lane. Shorter than the lane so a bar reads as an
 *  object sitting in a row rather than as the row itself. */
const BAR_H = 48;

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

  const lanes = useMemo(() => {
    return BELTS.map((belt) => {
      // A dragged run carries its own start; the rest still pack in sequence
      // behind whatever precedes them. Sorting by effective start keeps the
      // lane in the order it is actually drawn, so a run pushed to tomorrow
      // stops being treated as if it were still second in line.
      const base = (beltOrders[belt.id]
        .map((id) => RUN_BY_ID[id])
        .filter(Boolean) as Run[])
        .map((r) => {
          const startAt = starts.get(r.id);
          const hours = durations.get(r.id);
          return startAt === undefined && hours === undefined
            ? r
            : { ...r, ...(startAt !== undefined && { startAt }), ...(hours !== undefined && { hours }) };
        })
        // Unpinned runs sort to -1 so they keep packing from the head of the
        // belt in their existing order; a pinned one sorts to its own time.
        // Array.sort is stable, so equal keys preserve the sequence.
        .sort((a, b) => (a.startAt ?? -1) - (b.startAt ?? -1));
      const runs = insertAt(base, placedFromBacklog[belt.id] ?? []);
      const layout = layoutLane(runs);

      // Everything still waiting for this belt, laid into the belt's *free*
      // time rather than at a slot inside the committed run.
      //
      // A proposal shown mid-sequence has to be drawn over a bar that is
      // already there — two runs claiming one hour — or the committed bars
      // have to shift to make room, which misrepresents the plan that the
      // floor is actually running. Appending is the only position that is true
      // of a run before anybody has placed it: this is when it would go if you
      // said yes now.
      //
      // Same-family lots are grouped so a campaign forms and the purge between
      // them is free, which is what Sawyer's note on each row claims.
      const waiting = BACKLOG.filter((b) => !scheduled.has(b.id) && b.belt === belt.id)
        .slice()
        .sort((a, b) => a.family.localeCompare(b.family));
      const proposed = layoutLane([...runs, ...waiting.map(backlogRun)]);
      const ghosts = proposed.placed.filter((p) => waiting.some((b) => b.id === p.run.id));

      return { belt, layout, ghosts, waiting };
    });
  }, [beltOrders, placedFromBacklog, starts, durations, scheduled]);

  // The manufacturing-order connector: when one order touches more than one
  // belt, link its operations so the order's path through the plant is visible.
  // This is what separates a production board from a generic calendar.
  const flows = useMemo(() => buildFlows(lanes), [lanes]);

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
      const laneIndex = Math.floor((clientY - box.top - AXIS_H) / ROW_H);
      return { hours, overBelt: lanes[laneIndex]?.belt.id ?? null };
    },
    [lanes],
  );

  /** Nudge the scroller when the cursor reaches its edge, so a run can be
   *  dragged into tomorrow without letting go — at 12h zoom tomorrow is
   *  entirely off-screen, and a drag you have to abandon to scroll isn't one. */
  const autoScroll = useCallback((clientX: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const edge = 56;
    if (clientX > box.right - edge) el.scrollLeft += 14;
    else if (clientX < box.left + edge) el.scrollLeft -= 14;
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

  const trackWidth = BOARD_HOURS * PX_PER_HOUR;

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {/* Gutter is a fixed column outside the scroller; only the tracks move.
          A belt name that scrolls away from its own bar makes a two-day board
          unreadable the moment you look at tomorrow. */}
      <div className="flex">
        <div className="shrink-0" style={{ width: GUTTER }}>
          <div
            style={{ height: AXIS_H, borderBottom: "1px solid var(--border-default)" }}
          />
          {lanes.map(({ belt, layout }, i) => (
            <div
              key={belt.id}
              className="flex items-center"
              style={{
                height: TRACK_H,
                borderTop: i === 0 ? "none" : "1px solid var(--border-light)",
                borderBottom:
                  i === lanes.length - 1 ? "1px solid var(--border-light)" : undefined,
              }}
            >
              <BeltGutter
                name={belt.name}
                note={belt.note}
                constraint={belt.constraint}
                layout={layout}
              />
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
              // Anything that isn't a bar dismisses the card.
              if (!(e.target as Element).closest("button")) setDetail(null);
            }}
            style={{ width: trackWidth, touchAction: drag ? "none" : undefined }}
          >
            {/* Axis: days on their own row above the clock, so a day name and
                a time can never land on the same pixel. */}
            <div
              className="relative"
              style={{
                height: AXIS_H,
                paddingLeft: TRACK_INSET,
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              {DAY_LABEL.slice(0, DAY_BREAKS.length + 1).map((label, d) => {
                const from = d === 0 ? 0 : DAY_BREAKS[d - 1];
                const to = d < DAY_BREAKS.length ? DAY_BREAKS[d] : BOARD_HOURS;
                return (
                  <span
                    key={label}
                    style={{
                      position: "absolute",
                      left: pct(from),
                      width: pct(to - from),
                      top: 0,
                      // The first day starts at the track inset, so it lines up
                      // with 06:00 beneath it. Later days sit just clear of the
                      // midnight rule they follow.
                      paddingLeft: d === 0 ? 0 : 6,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ds-text-placeholder, var(--text-muted))",
                      borderLeft: d === 0 ? "none" : "1px solid var(--border-default)",
                    }}
                  >
                    {label}
                  </span>
                );
              })}

              <div
                className="absolute inset-x-0"
                style={{
                  bottom: 0,
                  height: TICK_ROW_H,
                  borderBottom: "1px solid var(--border-strong)",
                }}
              >
                {TICKS.map((hours, i) => {
                  const isLast = i === TICKS.length - 1;
                  // End labels hug their tick instead of centring on it, or
                  // half of each falls outside the track.
                  const shift = i === 0 ? "none" : isLast ? "translateX(-100%)" : "translateX(-50%)";
                  return (
                    <span key={hours}>
                      <span
                        style={{
                          position: "absolute",
                          left: pct(hours),
                          top: 0,
                          transform: shift,
                          fontSize: 11,
                          fontWeight: 500,
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--ds-text-secondary)",
                        }}
                      >
                        {clockAt(hours)}
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: pct(hours),
                          bottom: 0,
                          width: 1,
                          height: 5,
                          background: "var(--border-strong)",
                        }}
                      />
                    </span>
                  );
                })}
                <NowCap />
              </div>
            </div>

            {lanes.map(({ belt, layout, ghosts }, laneIndex) => (
              <div
                key={belt.id}
                role="group"
                aria-label={`${belt.name} belt${belt.constraint ? ", the constraint" : ""} — ${formatHours(layout.loadHours)} of ${BOARD_HOURS}h scheduled`}
                className="relative"
                style={{
                  height: TRACK_H,
                  paddingLeft: TRACK_INSET,
                  // Square and flush. A rounded lane pinches its own gridlines
                  // at both ends, so the hour marks stop lining up across
                  // belts — the one thing a resource Gantt has to get right.
                  overflow: "hidden",
                  background: belt.constraint ? "#FFFDF7" : "var(--surface-base)",
                  borderTop:
                    laneIndex === 0 ? "none" : "1px solid var(--border-light)",
                }}
              >
                <Gridlines />
                <DayBreaks />
                <LockedWindow />
                <Maintenance belt={belt.id} />
                <NowLine />
                {ghosts.map((g) => (
                  <Ghost
                    key={g.run.id}
                    placed={g}
                    pxWidth={g.hours * PX_PER_HOUR}
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
                  return (
                    <Block
                      key={p.run.id}
                      placed={p}
                      splitLot={belt.id === "backing" && split && p.run.id === "b1"}
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
                        onPointerDown(e, p.run.id, belt.id, p.start, p.hours, "move")
                      }
                      onResizeStart={(e) =>
                        onPointerDown(e, p.run.id, belt.id, p.start, p.hours, "resize")
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
            ))}

            {/* The time readout rides above the bar being dragged. It lives
                here rather than inside the bar because a lane clips its own
                overflow, and a chip that sits above the bar would be cut off
                by the very lane it belongs to. */}
            {drag?.moved && <DragTimeChip drag={drag} lanes={lanes} />}

            {/* Details, at the track layer for the same reason as the drag
                chip: a lane clips its own overflow, so a card anchored under a
                bar would be sliced off by the lane it belongs to. */}


            {/* Connectors share the track element, so their x-positions are the
                same percentages the blocks use. */}
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{ left: 0, right: 0, top: AXIS_H, bottom: 0 }}
            >
              {flows.map((f) => (
                <OrderFlow key={f.order} {...f} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {detail && !drag && (
        <RunPopover
          runId={detail.runId}
          anchor={detail.anchor}
          lanes={lanes}
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
              beltName={lane.belt.name}
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

      <Legend />
    </div>
  );
}

/* ─── Gutter ────────────────────────────────────────────────────────────── */

/** "9h", "4.75h" — trailing zeros dropped so the column stays scannable. */
const formatHours = (h: number) =>
  `${Number(h.toFixed(2)).toString().replace(/\.0+$/, "")}h`;

function BeltGutter({
  name,
  note,
  constraint,
  layout,
}: {
  name: string;
  note?: string;
  constraint?: boolean;
  layout: LaneLayout;
}) {
  const pctLoad = Math.round(layout.utilisation * 100);
  const tone = layout.over
    ? "var(--text-danger)"
    : constraint
      ? "var(--lane-limit-ink)"
      : "var(--ds-text-primary)";

  return (
    <div className="flex flex-col justify-center h-full" style={{ gap: 5 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ds-text-primary)" }}>
        {name}
      </span>
      {note && (
        <span
          style={{
            fontSize: 10,
            color: "var(--lane-limit-ink)",
          }}
        >
          {note}
        </span>
      )}
      {/* Load as a bar plus the figure. The bar makes the three belts
          comparable at a glance down the gutter; the number is the precision
          the bar can't carry. */}
      <span
        className="flex flex-col"
        style={{ gap: 4 }}
        title={`${layout.loadHours.toFixed(2)}h of ${BOARD_HOURS}h, changeover included`}
      >
        <Progress
          value={Math.min(100, pctLoad)}
          size="sm"
          variant={layout.over ? "error" : constraint ? "warning" : "neutral"}
          aria-label={`${name} load`}
        />
        <span style={{ fontSize: 10, color: tone, whiteSpace: "nowrap" }}>
          {formatHours(layout.loadHours)}/{BOARD_HOURS}h · {pctLoad}%
        </span>
      </span>
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
  pxWidth,
  active,
  onActive,
  onPlace,
  onOpen,
}: {
  placed: PlacedRun;
  /** Rendered width in pixels, so the actions can degrade to icons on a
   *  proposal too narrow to hold a word. */
  pxWidth: number;
  active: boolean;
  onActive: (on: boolean) => void;
  onPlace: () => void;
  onOpen: () => void;
}) {
  const { run, start, hours } = placed;
  const sub = [run.dyeLot, run.order].filter(Boolean).join(" · ");
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
        padding: "0 8px 0 11px",
        borderRadius: "0 6px 6px 0",
        textAlign: "left",
        border: `1px dashed ${active ? "var(--color-iris-500)" : "var(--color-iris-400)"}`,
        background: active ? "var(--color-iris-100)" : "var(--color-iris-50)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: run.accent,
          opacity: 0.45,
        }}
      />

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
            background: h % 6 === 0 ? "var(--border-light)" : "transparent",
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
            border: "1px solid var(--lane-limit-bd)",
            background:
              "repeating-linear-gradient(45deg, rgba(158,57,0,.11), rgba(158,57,0,.11) 5px, transparent 5px, transparent 10px)",
          }}
        >
          <span
            className="truncate"
            style={{ fontSize: 10, fontWeight: 600, color: "var(--lane-limit-ink)" }}
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

function NowLine() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: pct(NOW_HOURS),
        top: 0,
        bottom: 0,
        width: 1.5,
        background: "var(--run-actual-line)",
        opacity: 0.7,
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}

/** The "now" marker's label, sitting in the axis strip above the lanes. */
function NowCap() {
  return (
    <span
      style={{
        position: "absolute",
        left: pct(NOW_HOURS),
        // Clear of the tick row: the pill used to sit on top of the clock
        // labels, hiding the one reading it exists to locate.
        bottom: TICK_ROW_H + 4,
        transform: "translateX(-50%)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: "#FFFFFF",
        background: "var(--run-actual-line)",
        borderRadius: 4,
        padding: "1px 5px",
        whiteSpace: "nowrap",
      }}
    >
      now {clockAt(NOW_HOURS)}
    </span>
  );
}

/* ─── Blocks ────────────────────────────────────────────────────────────── */

function Block({
  placed,
  splitLot,
  interactive,
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
  splitLot: boolean;
  interactive: boolean;
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
  const sub = meta ?? [run.dyeLot, run.order].filter(Boolean).join(" · ");

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
    padding: "8px 8px 8px 11px",
    // Right corners only: the accent stripe is flush to the left edge, and
    // rounding that corner would clip the one thing identifying the run.
    borderRadius: "0 8px 8px 0",
    background: "var(--surface-base)",
    border: `1px solid ${risky ? "var(--lane-limit-bd)" : "var(--border-default)"}`,
    boxShadow: dragging
      ? `0 8px 20px rgba(24,24,27,.20), 0 0 0 2px ${
          invalid ? "var(--text-danger)" : "var(--color-iris-500)"
        }`
      : selected
        ? "0 0 0 2px var(--color-iris-500)"
        : "none",
    textAlign: "left",
    // Lifted off the board while it moves, and settling with a short ease when
    // it lands. The transition is switched off during the drag itself so the
    // bar tracks the cursor exactly rather than lagging behind it.
    zIndex: dragging ? 6 : 2,
    transform: dragging ? "translateY(-1px)" : undefined,
    transition: dragging ? "none" : "left 140ms cubic-bezier(.2,.7,.3,1)",
  };

  const body = (
    <>
      <span
        aria-hidden="true"
        style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: run.accent }}
      />
      <span
        className="truncate"
        style={{ fontSize: 11, fontWeight: 600, color: "var(--ds-text-primary)", lineHeight: 1.3 }}
      >
        {label ?? run.label}
        {run.fixed && <span style={{ color: "var(--text-danger)" }}> · fixed</span>}
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
}: {
  drag: DragState;
  lanes: ReadonlyArray<{ belt: { id: BeltId } }>;
}) {
  const run = RUN_BY_ID[drag.runId];
  if (!run) return null;
  const laneIndex = lanes.findIndex((l) => l.belt.id === drag.belt);
  const nominal = run.hours;
  const end = drag.previewStart + drag.previewHours;

  return (
    <span
      aria-live="polite"
      style={{
        position: "absolute",
        left: pct(drag.previewStart),
        top: AXIS_H + laneIndex * ROW_H - 10,
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
  index,
  orderLength,
  inSequence,
  onMove,
  onReview,
  onClose,
}: {
  runId: string;
  anchor: DOMRect;
  lanes: ReadonlyArray<{ belt: { id: BeltId; name: string; constraint?: boolean }; layout: LaneLayout }>;
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
    { k: "Belt", v: `${lane.belt.name}${lane.belt.constraint ? " · the constraint" : ""}` },
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
    ...(run.dyeLot ? [{ k: "Dye lot", v: <DrillLink kind="dyelot" id={run.dyeLot} /> }] : []),
    ...(run.order ? [{ k: "Order", v: <DrillLink kind="order" id={run.order} /> }] : []),
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

/* ─── Order flow across belts ───────────────────────────────────────────── */

interface Flow {
  order: string;
  fromLane: number;
  fromHours: number;
  toLane: number;
  toHours: number;
}

/** One manufacturing order can touch several belts. Link its operations so the
 *  order's path through the plant is legible — the Asprova resource-chart
 *  convention, and the thing a generic calendar can't show. */
function buildFlows(
  lanes: ReadonlyArray<{ layout: LaneLayout }>,
): Flow[] {
  const byOrder = new Map<string, { lane: number; end: number; start: number }[]>();

  lanes.forEach(({ layout }, lane) => {
    layout.placed.forEach((p) => {
      if (!p.run.order || p.run.order === "—") return;
      const list = byOrder.get(p.run.order) ?? [];
      list.push({ lane, end: p.start + p.hours, start: p.start });
      byOrder.set(p.run.order, list);
    });
  });

  const flows: Flow[] = [];
  byOrder.forEach((ops, order) => {
    if (ops.length < 2) return;
    const sorted = [...ops].sort((a, b) => a.lane - b.lane);
    for (let i = 0; i < sorted.length - 1; i++) {
      flows.push({
        order,
        fromLane: sorted[i].lane,
        fromHours: sorted[i].end,
        toLane: sorted[i + 1].lane,
        toHours: sorted[i + 1].start,
      });
    }
  });
  return flows;
}

/**
 * Down-and-across connector, drawn with positioned elements rather than SVG:
 * `<polyline points>` only accepts user units, so percentage x-coordinates are
 * silently dropped and nothing renders. CSS percentages track the blocks on
 * resize for free.
 */
function OrderFlow({ fromHours, fromLane, toHours, toLane }: Flow) {
  const y1 = fromLane * ROW_H + TRACK_H / 2;
  const y2 = toLane * ROW_H + TRACK_H / 2;
  const mid = (y1 + y2) / 2;
  const dash = "1px dashed var(--color-iris-400)";

  const left = Math.min(fromHours, toHours);
  const width = Math.abs(toHours - fromHours);

  return (
    <>
      {/* Down from the source operation */}
      <span
        style={{
          position: "absolute",
          left: pct(fromHours),
          top: y1,
          height: mid - y1,
          borderLeft: dash,
        }}
      />
      {/* Across to the next belt */}
      <span
        style={{
          position: "absolute",
          left: pct(left),
          width: pct(width),
          top: mid,
          borderTop: dash,
        }}
      />
      {/* Down into the target operation, with a cap at the handoff */}
      <span
        style={{
          position: "absolute",
          left: pct(toHours),
          top: mid,
          height: y2 - mid,
          borderLeft: dash,
        }}
      />
      <span
        style={{
          position: "absolute",
          left: pct(toHours),
          top: y2 - 2.5,
          width: 5,
          height: 5,
          marginLeft: -2.5,
          borderRadius: "50%",
          background: "var(--color-iris-500)",
        }}
      />
    </>
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
              border: "1px solid var(--lane-limit-bd)",
              background:
                "repeating-linear-gradient(45deg, rgba(158,57,0,.16), rgba(158,57,0,.16) 3px, transparent 3px, transparent 6px)",
            }}
          />
        }
        label="maintenance"
      />
      <Key
        swatch={<span style={{ width: 14, height: 0, borderTop: "1.5px dashed var(--color-iris-400)" }} />}
        label="same order, next belt"
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


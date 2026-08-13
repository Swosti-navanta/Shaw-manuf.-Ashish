"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AiStar,
  Button,
  PanelInfoGrid,
  Select,
  Tabs,
} from "@navanta-ai/design-system";
import { ArrowsClockwise, CaretLeft, CaretRight, Check, PencilSimple, X } from "@phosphor-icons/react";
import { useSchedule } from "@/context/ScheduleContext";
import { BOARD_HOURS, RUNS, STATIC_BELTS } from "@/data/schedule-data";
import {
  BELTS,
  OVERRIDE_REASONS,
  changeoverCost,
  changeoverHours,
  type BacklogItem,
  type BeltId,
  type OverrideReason,
  type Run,
} from "@/types/schedule";
import { backlogRun, clockAt, layoutLane } from "./board-layout";
import DrillLink from "@/components/ui/DrillLink";

const beltName = (id: string) => BELTS.find((b) => b.id === id)?.name ?? id;

type DeckTab = "placement" | "commitment" | "constraints";

const TABS: { id: DeckTab; label: string }[] = [
  { id: "placement", label: "Placement" },
  { id: "commitment", label: "Commitment" },
  { id: "constraints", label: "Constraints" },
];

/**
 * The run deck — what Sawyer proposes for one queued run, and the override.
 *
 * Shaped after the IRIS demand deck: an agent summary card carrying the
 * recommendation and the action band, with the analysis in tabs beneath, so
 * the reasoning stays on screen while you decide.
 *
 * The belt override lives here rather than as a dropdown in the queue: moving
 * a run to a different line changes what the constraint carries and what the
 * sequence costs, so it deserves a decision surface, not an inline control.
 */
export default function RunDeckModal({
  item,
  initialView = "default",
  onClose,
}: {
  item: BacklogItem;
  /** "override" opens straight into the editor — used by the queue's override
   *  button, so one click lands on the picker rather than two. */
  initialView?: "default" | "override";
  onClose: () => void;
}) {
  const { scheduled, schedule, unschedule, order } = useSchedule();
  const [tab, setTab] = useState<DeckTab>("placement");
  const [editing, setEditing] = useState(initialView === "override");
  // The belt is Sawyer's call. What a person overrides is the slot within it —
  // where in the day's sequence this run lands.
  const [slot, setSlot] = useState(item.slot);
  const [reason, setReason] = useState<OverrideReason | "">("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const placedSlot = scheduled.get(item.id);
  const activeSlot = placedSlot ?? slot;
  const existing = beltRuns(item.belt, order);
  const fit = fitOnBelt(item.belt, item, order, activeSlot);
  const overridden = activeSlot !== item.slot;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center"
      style={{ background: "rgba(15, 16, 35, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Run deck · ${item.label}`}
        className="relative mt-6 mb-6 mx-4 w-full max-w-[860px] rounded-[16px] flex flex-col overflow-hidden"
        style={{
          background: "var(--surface-base)",
          boxShadow: "var(--shadow-modal, 0 24px 60px rgba(15,16,35,.28))",
          maxHeight: "calc(100vh - 48px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between shrink-0"
          style={{ gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex flex-col min-w-0" style={{ gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ds-text-primary)" }}>
              {item.label}
            </span>
            <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
              {item.order && <DrillLink kind="order" id={item.order} />}
              <Dot />
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {item.customer}
              </span>
              <Dot />
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {item.qty.toLocaleString()} lin yd · {item.hours}h
              </span>
              {item.shadeCritical && <Chip tone="warn">Shade-critical</Chip>}
              {item.fixed && <Chip tone="bad">Fixed install</Chip>}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} weight="bold" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col" style={{ padding: 20, gap: 16 }}>
            {/* Sawyer summary + action band */}
            <section
              style={{
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--border-default)",
                background: "var(--color-iris-50)",
              }}
            >
              <div className="flex flex-col" style={{ gap: 6, padding: "14px 16px" }}>
                <span className="flex items-center" style={{ gap: 8 }}>
                  <AiStar size={16} />
                  <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                    Sawyer&apos;s placement
                  </span>
                </span>
                <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
                  {item.note}
                </p>
              </div>

              {/* The belt is always on screen — where a run lands is the
                  substance of this decision, not a detail behind a button.
                  Override only unlocks moving it. */}
              <div style={{ padding: "0 16px 14px" }}>
                <SlotPicker
                  existing={existing}
                  candidate={backlogRun(item)}
                  slot={activeSlot}
                  interactive={editing}
                  onSlot={setSlot}
                />
              </div>

              {placedSlot !== undefined ? (
                <CommittedBand
                  where={`${beltName(item.belt)} · ${slotLabel(placedSlot, existing)}`}
                  overridden={placedSlot !== item.slot}
                  onUndo={() => unschedule(item.id)}
                />
              ) : editing ? (
                <OverrideBand
                  belt={item.belt}
                  slot={slot}
                  recommended={item.slot}
                  existing={existing}
                  reason={reason}
                  onReason={setReason}
                  onCancel={() => {
                    setSlot(item.slot);
                    setReason("");
                    setEditing(false);
                  }}
                  onConfirm={() => {
                    schedule(item.id, slot);
                    setEditing(false);
                  }}
                />
              ) : (
                <ActionBand
                  headline={`Place on ${beltName(item.belt)} at ${fit.startsAt} — ${slotLabel(item.slot, existing)}`}
                  detail={item.insight.detail}
                  placeLabel={`Place on ${beltName(item.belt)}`}
                  onOverride={() => setEditing(true)}
                  onPlace={() => schedule(item.id, item.slot)}
                />
              )}
            </section>

            <Tabs
              variant="underline"
              tabs={TABS}
              activeTab={tab}
              onChange={(id) => setTab(id as DeckTab)}
            />

            {tab === "placement" && (
              <PanelInfoGrid
                title={`On ${beltName(item.belt)} · ${slotLabel(activeSlot, existing)}${overridden ? " — overridden" : ""}`}
                rows={[
                  { label: "Starts", value: fit.startsAt },
                  { label: "Runs until", value: fit.endsAt },
                  { label: "Follows", value: fit.follows },
                  {
                    label: "Changeover",
                    value:
                      fit.changeover > 0
                        ? `$${fit.changeover.toLocaleString()} · ${Math.round(fit.setupHours * 60)} min`
                        : "None — same style family",
                  },
                  {
                    label: "Belt load after",
                    value: `${fit.loadAfter}% of the ${BOARD_HOURS}h board`,
                  },
                  {
                    label: "Fits the day",
                    value: fit.fits ? "Yes" : "No — runs past 18:00",
                  },
                ]}
              />
            )}

            {tab === "commitment" && (
              <PanelInfoGrid
                title="What this run owes"
                rows={[
                  { label: "Order", value: item.order ? <DrillLink kind="order" id={item.order} /> : "—" },
                  { label: "Customer", value: item.customer ?? "—" },
                  { label: "Quantity", value: `${item.qty.toLocaleString()} lin yd` },
                  { label: "Promised", value: item.promised },
                  {
                    label: "Type",
                    value: item.fixed ? "Fixed install · crew booked" : "Movable ± a few days",
                  },
                  { label: "Dye lot", value: item.dyeLot ?? "No dye lot" },
                ]}
              />
            )}

            {tab === "constraints" && <Constraints item={item} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Bands ─────────────────────────────────────────────────────────────── */

function ActionBand({
  headline,
  detail,
  placeLabel,
  onOverride,
  onPlace,
}: {
  headline: string;
  detail: string;
  placeLabel: string;
  onOverride: () => void;
  onPlace: () => void;
}) {
  return (
    <div
      className="flex items-end justify-between flex-wrap"
      style={{
        padding: 12,
        gap: 16,
        background: "var(--color-iris-100)",
      }}
    >
      <div className="flex flex-col">
        <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
          Recommended placement · {detail}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {headline}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 8 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={onOverride}
          iconLeft={<PencilSimple size={14} weight="bold" />}
        >
          Override placement
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onPlace}
          iconLeft={<Check size={14} weight="bold" />}
        >
          {placeLabel}
        </Button>
      </div>
    </div>
  );
}

/** The editor row under the belt view: what moving it means, the reason, and
 *  the commit. The picker itself lives above and is always visible — this
 *  band only appears once Override has unlocked it. */
function OverrideBand({
  belt,
  slot,
  recommended,
  existing,
  reason,
  onReason,
  onCancel,
  onConfirm,
}: {
  belt: BeltId;
  slot: number;
  recommended: number;
  existing: Run[];
  reason: OverrideReason | "";
  onReason: (r: OverrideReason) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const diverges = slot !== recommended;
  // A reason is only meaningful when the person actually moved it. Confirming
  // Sawyer's own slot isn't an override and shouldn't ask for one.
  const needsReason = diverges && reason === "";
  return (
    <div
      className="flex flex-col"
      style={{
        padding: 12,
        gap: 10,
        background: "var(--color-iris-100)",
      }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
          Moving the placement on {beltName(belt)}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {diverges
            ? `${slotLabel(slot, existing)} — overrides Sawyer`
            : `${slotLabel(slot, existing)} — Sawyer's pick`}
        </span>
      </div>

      {diverges && (
        <div className="flex flex-col" style={{ gap: 4 }}>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            Reason for the override
          </span>
          <Select
            value={reason}
            onValueChange={(v) => onReason(v as OverrideReason)}
            size="sm"
          >
            <Select.Trigger aria-label="Reason for the override">
              <Select.Value placeholder="Pick a reason" />
            </Select.Trigger>
            <Select.Content>
              {OVERRIDE_REASONS.map((r) => (
                <Select.Item key={r} value={r}>
                  {r}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-end" style={{ gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          disabled={needsReason}
          iconLeft={<Check size={14} weight="bold" />}
        >
          {diverges ? "Confirm override" : "Confirm placement"}
        </Button>
      </div>
    </div>
  );
}

function CommittedBand({
  where,
  overridden,
  onUndo,
}: {
  where: string;
  overridden: boolean;
  onUndo: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{
        padding: 12,
        gap: 16,
        background: "var(--surface-success)",
        borderTop: "1px solid var(--border-success, #A6F4C5)",
      }}
    >
      <div className="flex flex-col">
        <span className="type-caption" style={{ color: "var(--text-success)" }}>
          {overridden ? "Overridden — placed by you" : "Placed as recommended"}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {where}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onUndo}
        iconLeft={<ArrowsClockwise size={14} weight="bold" />}
      >
        Take off the belt
      </Button>
    </div>
  );
}

/* ─── Constraints tab ───────────────────────────────────────────────────── */

function Constraints({ item }: { item: BacklogItem }) {
  const { rules } = useSchedule();
  const constraintBelt = BELTS.find((b) => b.id === item.belt)?.constraint;

  const checks = [
    {
      ok: !item.shadeCritical,
      text: item.shadeCritical
        ? "Shade-critical lot must run whole, adjacent to the rest of its dye lot"
        : "Not shade-critical — no dye-lot adjacency to hold",
    },
    {
      ok: !constraintBelt,
      text: constraintBelt
        ? "Goes on the constraint line — an hour here is an hour off the whole plant"
        : "Not on the constraint line",
    },
    {
      ok: !item.fixed,
      text: item.fixed
        ? "Fixed install — the promised date cannot move"
        : "Date has slack",
    },
  ];

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
          What this placement has to respect
        </span>
        <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--surface-raised)" }}>
          {checks.map((c, i) => (
            <div
              key={c.text}
              className="flex items-start"
              style={{
                gap: 10,
                padding: "12px 16px",
                borderBottom: i < checks.length - 1 ? "1px solid var(--border-default)" : undefined,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  marginTop: 5,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flex: "none",
                  background: c.ok ? "var(--text-success)" : "var(--lane-limit-ink)",
                }}
              />
              <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                {c.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      <PanelInfoGrid
        title="Rules in force"
        rows={rules.map((r) => ({
          label: r.strength === "hard" ? "Hard" : "Soft",
          value: r.text,
        }))}
      />
    </div>
  );
}

/* ─── Placement math ────────────────────────────────────────────────────── */

/**
 * The belt, drawn, with the run being placed shown where it would land.
 *
 * A dropdown of slot names ("After Meridian") makes you hold the day in your
 * head. Here the blocks are sized by time, so you can see what the run lands
 * between, how far it pushes everything behind it, and whether it still fits
 * the shift — which is the whole question.
 *
 * Click any existing run to drop in behind it, or the leading gap to go first.
 */
function SlotPicker({
  existing,
  candidate,
  slot,
  interactive,
  onSlot,
}: {
  existing: Run[];
  candidate: Run;
  slot: number;
  /** Read-only until Override unlocks it — the picture is always worth
   *  showing, but moving a run is a deliberate act. */
  interactive: boolean;
  onSlot: (n: number) => void;
}) {
  const at = Math.max(0, Math.min(slot, existing.length));
  const sequence = [...existing];
  sequence.splice(at, 0, candidate);
  const layout = layoutLane(sequence);

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <div
        className="flex items-center justify-between"
        style={{ fontSize: 10, color: "var(--ds-text-secondary)" }}
      >
        {["06:00", "09:00", "12:00", "15:00", "18:00"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      <div
        className="relative"
        style={{
          height: 54,
          borderRadius: 10,
          background: "var(--surface-base)",
          border: "1px solid var(--border-default)",
          overflow: "hidden",
        }}
      >
        {/* Hour gridlines, so the widths read as time rather than as size. */}
        {Array.from({ length: BOARD_HOURS + 1 }, (_, h) => (
          <span
            key={h}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${(h / BOARD_HOURS) * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: h % 3 === 0 ? "var(--border-default)" : "var(--border-light)",
            }}
          />
        ))}

        {/* "First of the day" target — the gap before everything. */}
        {interactive && (
          <SlotTarget active={at === 0} onClick={() => onSlot(0)} left="0%" width="4%" label="Place first" />
        )}

        {layout.placed.map((p, i) => {
          const isCandidate = p.run.id === candidate.id;
          // Index of this run among the *existing* ones, for the drop target.
          const existingIndex = i > at ? i - 1 : i;
          const left = `${(p.start / BOARD_HOURS) * 100}%`;
          const width = `${(p.hours / BOARD_HOURS) * 100}%`;

          if (isCandidate) {
            return (
              <span
                key={p.run.id}
                title={`${candidate.label} · ${clockAt(p.start)}–${clockAt(p.start + p.hours)}`}
                style={{
                  position: "absolute",
                  left,
                  width,
                  top: 5,
                  bottom: 5,
                  zIndex: 2,
                  borderRadius: 6,
                  padding: "0 6px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: "var(--color-iris-50)",
                  border: "1.5px solid var(--color-iris-500)",
                  boxShadow: "0 1px 3px rgba(24,24,27,.12)",
                }}
              >
                <span
                  className="truncate"
                  style={{ fontSize: 11, fontWeight: 600, color: "var(--color-iris-700)" }}
                >
                  {candidate.label}
                </span>
                <span style={{ fontSize: 9.5, color: "var(--color-iris-700)" }}>
                  {clockAt(p.start)}–{clockAt(p.start + p.hours)}
                </span>
              </span>
            );
          }

          const blockStyle: React.CSSProperties = {
            position: "absolute",
            left,
            width,
            top: 5,
            bottom: 5,
            zIndex: 1,
            borderRadius: 6,
            padding: "0 6px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
            textAlign: "left",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-strong)",
          };

          if (!interactive) {
            return (
              <span key={p.run.id} style={blockStyle} title={`${p.run.label} · ${clockAt(p.start)}`}>
                <span
                  className="truncate"
                  style={{ fontSize: 11, fontWeight: 500, color: "var(--ds-text-primary)" }}
                >
                  {p.run.label}
                </span>
                <span style={{ fontSize: 9.5, color: "var(--ds-text-secondary)" }}>
                  {clockAt(p.start)}
                </span>
              </span>
            );
          }

          return (
            <button
              key={p.run.id}
              type="button"
              onClick={() => onSlot(existingIndex + 1)}
              title={`Place after ${p.run.label}`}
              className="transition-colors hover:brightness-95"
              style={{ ...blockStyle, cursor: "pointer" }}
            >
              <span
                className="truncate"
                style={{ fontSize: 11, fontWeight: 500, color: "var(--ds-text-primary)" }}
              >
                {p.run.label}
              </span>
              <span style={{ fontSize: 9.5, color: "var(--ds-text-secondary)" }}>
                {clockAt(p.start)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap" style={{ gap: 8 }}>
        <span className="flex items-center" style={{ gap: 6 }}>
          {interactive && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={at <= 0}
                onClick={() => onSlot(at - 1)}
                aria-label="Move earlier"
              >
                <CaretLeft size={12} weight="bold" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={at >= existing.length}
                onClick={() => onSlot(at + 1)}
                aria-label="Move later"
              >
                <CaretRight size={12} weight="bold" />
              </Button>
            </>
          )}
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {interactive
              ? `${slotLabel(at, existing)} — click a run to drop in behind it`
              : slotLabel(at, existing)}
          </span>
        </span>
        <span
          className="type-caption"
          style={{ color: layout.over ? "var(--text-danger)" : "var(--ds-text-secondary)" }}
        >
          {layout.over
            ? "Runs past 18:00 — doesn't fit the shift"
            : `Belt at ${Math.round(layout.utilisation * 100)}% after this`}
        </span>
      </div>
    </div>
  );
}

/** The leading gap — the only insertion point with no block to click. */
function SlotTarget({
  active,
  onClick,
  left,
  width,
  label,
}: {
  active: boolean;
  onClick: () => void;
  left: string;
  width: string;
  label: string;
}) {
  if (active) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="transition-colors hover:bg-[var(--color-iris-50)]"
      style={{
        position: "absolute",
        left,
        width,
        top: 5,
        bottom: 5,
        zIndex: 1,
        borderRadius: 6,
        border: "1px dashed var(--border-strong)",
        background: "transparent",
        cursor: "pointer",
      }}
    />
  );
}

/** The queued item as a board run, so the picker and the math describe the
 *  same object. */
/** The runs already on a belt, in sequence. */
function beltRuns(belt: BeltId, backingOrder: ReadonlyArray<string>): Run[] {
  return belt === "backing"
    ? backingOrder.map((id) => RUNS[id])
    : [...STATIC_BELTS[belt as Exclude<BeltId, "backing">]];
}

/** Human label for an insertion index. */
function slotLabel(slot: number, existing: Run[]): string {
  if (slot <= 0) return "First of the day";
  if (slot >= existing.length) return `Last — after ${existing[existing.length - 1]?.label ?? "everything"}`;
  return `After ${existing[slot - 1].label}`;
}

/**
 * Where this run lands if inserted at `slot`, given what's already on the
 * belt. Reuses the board's own layout so the modal can't disagree with the
 * picture.
 */
function fitOnBelt(
  belt: BeltId,
  item: BacklogItem,
  backingOrder: ReadonlyArray<string>,
  slot: number,
) {
  const base = beltRuns(belt, backingOrder);

  const candidate = backlogRun(item);

  const at = Math.max(0, Math.min(slot, base.length));
  const withRun = [...base];
  withRun.splice(at, 0, candidate);

  const after = layoutLane(withRun);
  const placed = after.placed[at];
  const prev = base[at - 1];

  return {
    startsAt: clockAt(placed.start),
    endsAt: clockAt(placed.start + placed.hours),
    follows: prev ? prev.label : "Nothing — first run of the day",
    changeover: changeoverCost(prev, candidate),
    setupHours: changeoverHours(prev, candidate),
    loadAfter: Math.round(after.utilisation * 100),
    fits: !after.over,
  };
}

/* ─── Bits ──────────────────────────────────────────────────────────────── */

function Dot() {
  return (
    <span aria-hidden="true" className="type-caption" style={{ color: "var(--border-strong)" }}>
      ·
    </span>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "bad" | "warn" }) {
  const bad = tone === "bad";
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 6px",
        borderRadius: 5,
        whiteSpace: "nowrap",
        background: bad ? "var(--surface-danger)" : "var(--lane-limit-bg)",
        color: bad ? "var(--text-danger)" : "var(--lane-limit-ink)",
      }}
    >
      {children}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button, PanelInfoGrid, Tabs } from "@navanta-ai/design-system";
import { ArrowsClockwise, Check, X } from "@phosphor-icons/react";
import { useQuality } from "@/context/QualityContext";
import { PRICING, RUN, CONSTRAINT_LINE } from "@/data/run-data";
import type { Measurement } from "@/types/run";
import { GRADE_LABEL, type Grade, type RollRow } from "@/types/quality";
import DrillLink from "@/components/ui/DrillLink";

type DeckTab = "measurements" | "origin" | "impact";

const TABS: { id: DeckTab; label: string }[] = [
  { id: "measurements", label: "Measured vs spec" },
  { id: "origin", label: "Where it came from" },
  { id: "impact", label: "What it costs" },
];

/**
 * The grade deck — one roll, everything Wren measured, and the call.
 *
 * Same shape as the Make action deck: the agent's read carries the
 * recommendation and the decision band, with the evidence in tabs beneath.
 * Wren proposes a grade and never sets one — grading the product is the line
 * the agents don't cross, so the band always ends in a person's click.
 */
export default function GradeDeckModal({
  roll,
  onClose,
}: {
  roll: RollRow;
  onClose: () => void;
}) {
  const { grades, grade, ungrade } = useQuality();
  const [tab, setTab] = useState<DeckTab>("measurements");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const decided = grades.get(roll.id) ?? roll.graded;
  const gap = PRICING.first - PRICING.second;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center"
      style={{ background: "rgba(15, 16, 35, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Grade · ${roll.id}`}
        className="relative mt-6 mb-6 mx-4 w-full max-w-[880px] rounded-[16px] flex flex-col overflow-hidden"
        style={{
          background: "var(--surface-base)",
          boxShadow: "var(--shadow-modal, 0 24px 60px rgba(15,16,35,.28))",
          maxHeight: "calc(100vh - 48px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between shrink-0"
          style={{ gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex flex-col min-w-0" style={{ gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ds-text-primary)" }}>
              {roll.id}
            </span>
            <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <DrillLink kind="batch" id={roll.batch}>
                {roll.batch}
              </DrillLink>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                ·
              </span>
              <DrillLink kind="dyelot" id={roll.dyeLot}>
                {roll.dyeLot}
              </DrillLink>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                · {roll.qty} lin yd · off the line {roll.at}
              </span>
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} weight="bold" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col" style={{ padding: 20, gap: 16 }}>
            <section
              className="flex flex-col"
              style={{
                borderRadius: 12,
                border: "1px solid var(--border-default)",
                background: "var(--color-iris-50)",
                overflow: "hidden",
              }}
            >
              <div className="flex flex-col" style={{ gap: 6, padding: "14px 16px" }}>
                <span className="flex items-center" style={{ gap: 8 }}>
                  <AiStar size={16} />
                  <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                    Wren&apos;s read
                  </span>
                </span>
                <p
                  className="type-body"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}
                >
                  {roll.measured.label} read{" "}
                  <strong
                    style={{
                      color: roll.measured.pass ? "var(--ds-text-primary)" : "var(--text-danger)",
                    }}
                  >
                    {roll.measured.actual}
                  </strong>{" "}
                  against a {roll.measured.tolerance} tolerance.{" "}
                  {roll.escalation ?? "Every reading inside spec."}
                </p>
              </div>

              {decided ? (
                <GradedBand
                  grade={decided}
                  byAgent={Boolean(roll.gradedBy?.agent) && !grades.has(roll.id)}
                  who={grades.has(roll.id) ? "you" : (roll.gradedBy?.name ?? "Wren")}
                  onUndo={() => ungrade(roll.id)}
                  undoable={grades.has(roll.id)}
                />
              ) : (
                <GradeBand
                  recommendation={roll.insight}
                  recommends={roll.recommends}
                  onGrade={(g) => {
                    grade(roll.id, g);
                    onClose();
                  }}
                />
              )}
            </section>

            <Tabs
              variant="underline"
              tabs={TABS}
              activeTab={tab}
              onChange={(id) => setTab(id as DeckTab)}
            />

            {tab === "measurements" && <Measurements rows={roll.inspection} />}

            {tab === "origin" && (
              <PanelInfoGrid
                title="Where it came from"
                rows={[
                  { label: "Yarn lot", value: <DrillLink kind="yarn" id={RUN.yarnLot} /> },
                  { label: "Dye lot", value: <DrillLink kind="dyelot" id={roll.dyeLot} /> },
                  { label: "Batch", value: <DrillLink kind="batch" id={roll.batch} /> },
                  { label: "Line", value: `${CONSTRAINT_LINE.name} · Shift ${RUN.shift}` },
                  { label: "Operator", value: RUN.operator },
                  {
                    label: "Run rate",
                    value: `${CONSTRAINT_LINE.achieved} yd/hr against std ${CONSTRAINT_LINE.standard}`,
                  },
                ]}
              />
            )}

            {tab === "impact" && (
              <div className="flex flex-col" style={{ gap: 12 }}>
                <PanelInfoGrid
                  title="What a downgrade costs"
                  rows={[
                    { label: "Quantity", value: `${roll.qty} lin yd` },
                    { label: "First quality", value: `$${PRICING.first.toFixed(2)} / yd` },
                    { label: "Seconds", value: `$${PRICING.second.toFixed(2)} / yd` },
                    { label: "Margin gap", value: `$${gap.toFixed(2)} / yd` },
                    {
                      label: "Exposure",
                      value: `$${Math.round(roll.qty * gap).toLocaleString()}`,
                    },
                  ]}
                />
                <p
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
                >
                  A downgrade, not scrap — the roll still sells. What&apos;s lost is the gap between
                  first quality and seconds, which is why the number is margin rather than value.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Bands ─────────────────────────────────────────────────────────────── */

/** Wren proposes; a person disposes. All three grades are offered — the
 *  recommendation is primary, the others are real buttons rather than a
 *  hidden override, because grading is the person's job by design. */
const GRADE_ORDER: ReadonlyArray<Grade> = ["first", "second", "hold"];
const GRADE_BUTTON: Record<Grade, string> = {
  first: "Grade first",
  second: "Grade second",
  hold: "Hold the batch",
};

function GradeBand({
  recommendation,
  recommends,
  onGrade,
}: {
  recommendation: { headline: string; detail: string };
  recommends: Grade;
  onGrade: (g: Grade) => void;
}) {
  const others = GRADE_ORDER.filter((g) => g !== recommends);
  return (
    <div
      className="flex items-end justify-between flex-wrap"
      style={{ gap: 16, padding: 12, background: "var(--color-iris-100)" }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
          Wren&apos;s recommendation · {recommendation.detail}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {recommendation.headline}
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          Wren never grades the product — the call is yours.
        </span>
      </div>
      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
        {others.map((g) => (
          <Button key={g} variant="outline" size="sm" onClick={() => onGrade(g)}>
            {GRADE_BUTTON[g]}
          </Button>
        ))}
        <Button
          variant="primary"
          size="sm"
          onClick={() => onGrade(recommends)}
          iconLeft={<Check size={14} weight="bold" />}
        >
          {GRADE_BUTTON[recommends]}
        </Button>
      </div>
    </div>
  );
}

function GradedBand({
  grade,
  byAgent,
  who,
  onUndo,
  undoable,
}: {
  grade: Grade;
  byAgent: boolean;
  who: string;
  onUndo: () => void;
  undoable: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{ gap: 16, padding: 12, background: "var(--surface-success)" }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--text-success)" }}>
          Graded {byAgent ? `by ${who} — inside the limit` : `by ${who}`}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {GRADE_LABEL[grade]}
        </span>
      </div>
      {undoable && (
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          iconLeft={<ArrowsClockwise size={14} weight="bold" />}
        >
          Undo
        </Button>
      )}
    </div>
  );
}

/* ─── Measurements ──────────────────────────────────────────────────────── */

function Measurements({ rows }: { rows: ReadonlyArray<Measurement> }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--surface-raised)" }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 100px 100px 32px",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {["Measurement", "Spec", "Actual", ""].map((h, i) => (
          <span
            key={h}
            className="type-caption"
            style={{
              color: "var(--ds-text-secondary)",
              textAlign: i === 0 ? "left" : "right",
            }}
          >
            {h}
          </span>
        ))}
      </div>
      {rows.map((m, i) => (
        <div
          key={m.metric}
          className="grid"
          style={{
            gridTemplateColumns: "1fr 100px 100px 32px",
            gap: 12,
            padding: "11px 16px",
            borderBottom: i < rows.length - 1 ? "1px solid var(--border-light)" : undefined,
          }}
        >
          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
            {m.metric}
          </span>
          <span
            className="type-body"
            style={{
              textAlign: "right",
              color: "var(--ds-text-secondary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {m.spec}
          </span>
          <span
            className="type-body"
            style={{
              textAlign: "right",
              fontWeight: m.pass ? 400 : 600,
              color: m.pass ? "var(--ds-text-primary)" : "var(--text-danger)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {m.actual}
          </span>
          <span
            style={{
              textAlign: "right",
              color: m.pass ? "var(--text-success)" : "var(--text-warning)",
            }}
          >
            {m.pass ? "✓" : "⚠"}
          </span>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button, PanelInfoGrid, PanelTimeline, Tabs } from "@navanta-ai/design-system";
import type { WeaveNode } from "./weave";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { useState } from "react";
import { useSchedule } from "@/context/ScheduleContext";
import { BACKLOG, RUNS } from "@/data/schedule-data";
import type { PlacedRun } from "./board-layout";
import { clockAt } from "./board-layout";
import DrillLink from "@/components/ui/DrillLink";

type DeckTab = "timing" | "route" | "commitment" | "rules";

const TABS: { id: DeckTab; label: string }[] = [
  { id: "timing", label: "Timing" },
  /* Its own tab rather than a section under Timing: this run's clock and the
     whole material's route are different questions, and the route was the
     longest thing on a tab that had already answered its own. */
  { id: "route", label: "Timeline" },
  { id: "commitment", label: "What it's committed to" },
  { id: "rules", label: "Rules it touches" },
];

const fmt = (h: number) => `${Number(h.toFixed(2)).toString().replace(/\.0+$/, "")}h`;

/**
 * The full record for a run already on the board.
 *
 * The popover answers "what is this"; this answers "what happens if I move
 * it". They are deliberately different depths — a board that opens a modal on
 * every click stops being a board, and a card that tries to hold the rules
 * Sawyer checks stops being a card.
 *
 * Distinct from `RunDeckModal`, which is about placing something that has no
 * slot yet. Once a run is on a belt the question changes from "where does this
 * go" to "what is it costing where it is", so the tabs are different rather
 * than the same deck reused with fields blanked out.
 */
export default function RunReviewModal({
  placed,
  beltName,
  journey,
  onClose,
}: {
  placed: PlacedRun;
  beltName: string;
  /** Every stage this material passes through, tufting first. */
  journey: ReadonlyArray<WeaveNode>;
  onClose: () => void;
}) {
  const { order, move, split, toggleSplit, rules, released, reRelease } = useSchedule();
  const [tab, setTab] = useState<DeckTab>("timing");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { run, start, hours, setupHours, setupCost } = placed;
  const nominal = RUNS[run.id]?.hours ?? hours;
  const widened = hours > nominal;
  const index = order.indexOf(run.id);
  const inSequence = index >= 0;

  // The backlog carries the commercial side — customer, promised date, whether
  // the shade is critical. A seeded board run has no backlog row, and an
  // absent field is left out rather than invented.
  const commercial = BACKLOG.find((b) => b.dyeLot === run.dyeLot || b.order === run.order);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center"
      style={{ background: "rgba(15, 16, 35, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${run.label} review`}
        className="relative mt-6 mb-6 mx-4 w-full max-w-[720px] rounded-[16px] flex flex-col overflow-hidden"
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
              {run.label}
            </span>
            <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
              {run.dyeLot && <DrillLink kind="dyelot" id={run.dyeLot} />}
              {run.order && <DrillLink kind="order" id={run.order} />}
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                · {beltName} · {clockAt(start)}–{clockAt(start + hours)}
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
                    Sawyer&apos;s read
                  </span>
                </span>
                <p
                  className="type-body"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}
                >
                  {run.fixed
                    ? "This one is committed to a fixed install date. Everything else on the belt is arranged around it, so moving anything else changes what this costs — not when it runs."
                    : setupCost > 0
                      ? `Getting onto this run costs ${fmt(setupHours)} of changeover, $${setupCost.toLocaleString()}. Moving it next to a run in the same family is what makes that number go away.`
                      : "No changeover into this one — it follows a run in the same family, which is the cheapest thing a sequence can do."}
                </p>
              </div>

              <div
                className="flex items-center justify-between flex-wrap"
                style={{ gap: 12, padding: 12, background: "var(--color-iris-100)" }}
              >
                <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
                  {run.fixed
                    ? "Fixed date — this run can't be moved"
                    : "Nudge it a slot, or drag it on the board"}
                </span>
                <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
                  {inSequence && !run.fixed && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        iconLeft={<CaretLeft size={12} weight="bold" />}
                        disabled={index <= 0}
                        onClick={() => move(-1)}
                      >
                        Earlier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        iconRight={<CaretRight size={12} weight="bold" />}
                        disabled={index >= order.length - 1}
                        onClick={() => move(1)}
                      >
                        Later
                      </Button>
                    </>
                  )}
                  {run.id === "b1" && (
                    <Button variant="outline" size="sm" onClick={toggleSplit}>
                      {split ? "Run whole" : "Split lot"}
                    </Button>
                  )}
                  {!released && (
                    <Button variant="primary" size="sm" onClick={reRelease}>
                      Re-release
                    </Button>
                  )}
                </span>
              </div>
            </section>

            <Tabs
              variant="underline"
              tabs={TABS}
              activeTab={tab}
              onChange={(id) => setTab(id as DeckTab)}
            />

            {tab === "timing" && (
              <PanelInfoGrid
                title="On the belt"
                rows={[
                  { label: "Belt", value: beltName },
                  { label: "Runs", value: `${clockAt(start)} – ${clockAt(start + hours)}` },
                  { label: "Belt time", value: fmt(hours) },
                  {
                    label: "Nominal",
                    value: widened ? (
                      <span style={{ color: "var(--color-iris-700)" }}>
                        {fmt(nominal)} · widened by {fmt(hours - nominal)}
                      </span>
                    ) : (
                      `${fmt(nominal)} · as standard`
                    ),
                  },
                  {
                    label: "Changeover in",
                    value:
                      setupHours > 0
                        ? `${fmt(setupHours)} · $${setupCost.toLocaleString()}`
                        : "none — same family",
                  },
                ]}
              />
            )}

            {tab === "route" && (
              <div className="flex flex-col" style={{ gap: 8 }}>
                <div
                  className="rounded-xl"
                  style={{ background: "var(--surface-raised)", padding: "12px 16px" }}
                >
                  <PanelTimeline
                    title=""
                    idPrefix={`review-${placed.run.id}`}
                    milestones={journey.map((n) => ({
                      id: n.runId,
                      label: `${n.centreName} · ${n.laneCode}`,
                      status:
                        n.runId === placed.run.id
                          ? ("active" as const)
                          : n.centreIdx <
                              (journey.find((x) => x.runId === placed.run.id)?.centreIdx ?? 0)
                            ? ("completed" as const)
                            : ("pending" as const),
                      date: `${clockAt(n.start)} – ${clockAt(n.start + n.hours)}`,
                      events: [],
                    }))}
                  />
                </div>
              </div>
            )}

            {tab === "commitment" && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <PanelInfoGrid
                  title="What it's committed to"
                  rows={[
                    ...(run.dyeLot
                      ? [{ label: "Dye lot", value: <DrillLink kind="dyelot" id={run.dyeLot} /> }]
                      : []),
                    ...(run.order
                      ? [{ label: "Order", value: <DrillLink kind="order" id={run.order} /> }]
                      : []),
                    ...(commercial?.customer
                      ? [{ label: "Customer", value: commercial.customer }]
                      : []),
                    ...(commercial?.promised
                      ? [{ label: "Promised", value: commercial.promised }]
                      : []),
                    {
                      label: "Date",
                      value: run.fixed ? (
                        <span style={{ color: "var(--text-danger)" }}>
                          Fixed install — no slack
                        </span>
                      ) : (
                        "Has slack"
                      ),
                    },
                    ...(commercial?.shadeCritical
                      ? [
                          {
                            label: "Shade",
                            value: (
                              <span style={{ color: "var(--text-danger)" }}>
                                Shade-critical — the lot has to stay whole
                              </span>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
                <p
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
                >
                  A run is only as movable as what it is promised to. This is the half of the
                  decision the board can&apos;t draw.
                </p>
              </div>
            )}

            {tab === "rules" && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <PanelInfoGrid
                  title="Checked on every move"
                  rows={rules.map((r) => ({
                    label: r.text,
                    value: (
                      <span
                        style={{
                          color:
                            r.strength === "hard"
                              ? "var(--text-danger)"
                              : "var(--ds-text-secondary)",
                        }}
                      >
                        {r.strength}
                      </span>
                    ),
                  }))}
                />
                <p
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
                >
                  Sawyer re-checks all of these each time the sequence changes. A hard rule refuses
                  the move; a soft one costs you money and says how much.
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

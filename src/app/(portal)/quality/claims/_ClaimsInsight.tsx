"use client";

import { useState } from "react";
import { AiStar, Button } from "@navanta-ai/design-system";
import { ArrowRight, CaretDown, Check, Info, Plus } from "@phosphor-icons/react";
import { useQuality } from "@/context/QualityContext";
import {
  CLAIMS_REVIEW,
  DEFECT_GRID,
  DEFECT_POSITIONS,
  DEFECT_STATIONS,
  REVIEWER_POOL,
  SOFT_CONSTRAINT,
} from "@/types/quality";

/* ── Panel shell ────────────────────────────────────────────────────────────
 *
 * The house panel: titled header with the scope on the right and room for a
 * control beside it. Every analytical surface in the product reads this way —
 * you learn where to look for "what is this, and what is it filtered to" once,
 * and it holds everywhere. The toggle rides in the header rather than floating
 * above the panel, because a control that doesn't sit on the thing it changes
 * makes you guess at its range.
 */
export function Panel({
  icon: Icon,
  title,
  info,
  scope,
  action,
  children,
  bodyPad = 16,
}: {
  icon: React.ComponentType<{ size?: number; weight?: "duotone" | "bold" }>;
  title: string;
  info?: string;
  scope?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyPad?: number;
}) {
  return (
    <section
      style={{
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border-default)" }}
      >
        <span className="inline-flex items-center" style={{ gap: 8 }}>
          <Icon size={15} weight="duotone" />
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {title}
          </span>
          {info && (
            <span title={info} className="inline-flex" style={{ cursor: "help" }}>
              <Info size={13} color="var(--ds-text-placeholder, var(--text-muted))" />
            </span>
          )}
        </span>
        <span className="inline-flex items-center" style={{ gap: 12 }}>
          {action}
          {scope && (
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {scope}
            </span>
          )}
        </span>
      </div>
      <div style={{ padding: bodyPad }}>{children}</div>
    </section>
  );
}

/** Small-caps section label, for the sub-headings inside a panel. */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="type-caption"
      style={{
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ds-text-placeholder, var(--text-muted))",
      }}
    >
      {children}
    </span>
  );
}

/* ── The rule ───────────────────────────────────────────────────────────────
 *
 * The decision band: the call is the headline and the primary button, and the
 * reasoning folds behind a caret. Collapsed it costs one row; a rule that
 * changes what Sawyer is allowed to do shouldn't be a section you scroll past.
 */
export function RuleBand() {
  const { sentFindings, sendFinding } = useQuality();
  const [open, setOpen] = useState(false);
  const sent = sentFindings.has(SOFT_CONSTRAINT.claimId);

  return (
    <div
      className="flex flex-col"
      style={{
        borderRadius: 14,
        border: `1px solid ${sent ? "var(--border-success, #A6F4C5)" : "var(--color-iris-200)"}`,
        background: sent ? "var(--surface-success)" : "var(--color-iris-50)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-start justify-between flex-wrap"
        style={{ gap: 16, padding: "12px 16px" }}
      >
        <div className="flex flex-col min-w-0" style={{ gap: 3 }}>
          <span className="inline-flex items-center" style={{ gap: 7 }}>
            <AiStar size={14} />
            <PanelLabel>
              {sent ? "Rule added to Sawyer's model" : "New soft constraint · proposed by Wren"}
            </PanelLabel>
          </span>
          <span
            className="type-body-medium"
            style={{ color: "var(--ds-text-primary)", maxWidth: 640 }}
          >
            {SOFT_CONSTRAINT.text}
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            Evidence: {SOFT_CONSTRAINT.evidence} · Type: {SOFT_CONSTRAINT.type}
          </span>
        </div>

        <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            iconRight={
              <CaretDown
                size={13}
                weight="bold"
                style={{
                  transform: open ? "rotate(180deg)" : undefined,
                  transition: "transform .15s",
                }}
              />
            }
          >
            How it closes
          </Button>
          {!sent && (
            <>
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                Send back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => sendFinding(SOFT_CONSTRAINT.claimId)}
                iconLeft={<Check size={14} weight="bold" />}
              >
                Accept &amp; add rule
              </Button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="flex items-stretch flex-wrap" style={{ gap: 12, padding: "0 16px 14px" }}>
          <div
            className="flex items-center justify-center"
            style={{
              gap: 20,
              padding: "12px 22px",
              borderRadius: 10,
              background: "var(--surface-base)",
              border: "1px solid var(--border-default)",
            }}
          >
            <Counter label="Before" value={SOFT_CONSTRAINT.before} />
            <ArrowRight size={16} weight="bold" color="var(--border-strong)" />
            <Counter label="On accept" value={SOFT_CONSTRAINT.after} highlight />
          </div>

          <div
            className="flex items-center flex-wrap flex-1"
            style={{
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--surface-base)",
              border: "1px solid var(--border-default)",
              minWidth: 280,
            }}
          >
            {SOFT_CONSTRAINT.pipeline.map((step, i) => (
              <span key={step.who} className="inline-flex items-center" style={{ gap: 8 }}>
                <span
                  className="flex flex-col"
                  style={{
                    gap: 1,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: step.active ? "var(--color-iris-100)" : "var(--surface-raised)",
                    border: `1px solid ${
                      step.active ? "var(--color-iris-200)" : "var(--border-default)"
                    }`,
                  }}
                >
                  <span
                    className="type-body"
                    style={{ color: "var(--ds-text-primary)", fontWeight: 500 }}
                  >
                    {step.who}
                  </span>
                  <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                    {step.what}
                  </span>
                </span>
                {i < SOFT_CONSTRAINT.pipeline.length - 1 && (
                  <ArrowRight size={12} weight="bold" color="var(--border-strong)" />
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 2 }}>
      <PanelLabel>{label}</PanelLabel>
      <span
        style={{
          fontSize: 26,
          fontWeight: 600,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: highlight ? "var(--text-success)" : "var(--ds-text-placeholder, var(--text-muted))",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── The pattern ──────────────────────────────────────────────────────────
 *
 * A six-step warm ramp, so the heatmap has real gradation rather than four
 * flat buckets. Cells index into it; the legend shows the whole scale so a
 * colour reads as a level, not a mood.
 */
const HEAT_RAMP = ["var(--surface-sunken)", "#FEF0C7", "#FEDF89", "#FEC84B", "#F79009", "#D92D20"];
/** Grid intensity (0–3) → ramp stop. Skips a step so "hot" lands on the reds. */
const CELL_STOP = [0, 1, 4, 5];

/**
 * Defects by station × position — the heatmap, as a standalone card so it can
 * sit beside the KPI column. Its hottest row is accented from the data, and
 * the scale legend rides in the header.
 */
export function DefectHeatmap() {
  const rowTotals = DEFECT_GRID.map((row) => row.reduce((n, v) => n + v, 0));
  const hotRow = rowTotals.indexOf(Math.max(...rowTotals));

  return (
    <SubCard
      title="Defects by station × position"
      info="Reports read across time, not one at a time — where the defects land over the window."
      headerRight={<HeatLegend />}
      fill
    >
      <div className="flex flex-col justify-center flex-1" style={{ gap: 8 }}>
        {DEFECT_STATIONS.map((station, r) => (
          <div key={station} className="flex items-center" style={{ gap: 10 }}>
            <span
              className="type-caption shrink-0"
              style={{
                width: 66,
                textAlign: "right",
                color: r === hotRow ? "var(--color-iris-700)" : "var(--ds-text-secondary)",
                fontWeight: r === hotRow ? 600 : undefined,
              }}
            >
              {station}
            </span>
            <div className="flex flex-1" style={{ gap: 6 }}>
              {DEFECT_GRID[r].map((intensity, c) => (
                <span
                  key={c}
                  aria-hidden="true"
                  title={`${station} · ${DEFECT_POSITIONS[c]}`}
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: 6,
                    background: HEAT_RAMP[CELL_STOP[intensity]],
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center" style={{ gap: 10, marginTop: 2 }}>
          <span className="shrink-0" style={{ width: 66 }} />
          <div className="flex flex-1" style={{ gap: 6 }}>
            {DEFECT_POSITIONS.map((p) => (
              <span
                key={p}
                className="type-caption flex-1 text-center"
                style={{ color: "var(--ds-text-secondary)" }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </SubCard>
  );
}

/** Horizontal bars with a shared axis: gridlines at each tick, the $ value and
 *  its share of the standing at-risk total on the right. The axis is what turns
 *  four bars into a comparison you can read a number off. */
/** A bordered inner card with a titled header — the sub-panel the pattern
 *  splits its two views into. */
function SubCard({
  title,
  info,
  headerRight,
  children,
  fill,
}: {
  title: string;
  info?: string;
  /** A control or legend pinned to the right of the header row. */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  /** Stretch to the height of a taller sibling in the same row. */
  fill?: boolean;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        gap: 14,
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        background: "var(--surface-base)",
        height: fill ? "100%" : undefined,
      }}
    >
      <div className="flex items-center justify-between" style={{ gap: 12 }}>
        <span className="inline-flex items-center" style={{ gap: 6 }}>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {title}
          </span>
          {info && (
            <span title={info} className="inline-flex" style={{ cursor: "help" }}>
              <Info size={13} color="var(--ds-text-placeholder, var(--text-muted))" />
            </span>
          )}
        </span>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

/** The heatmap scale, compact enough to ride in the card header. */
function HeatLegend() {
  return (
    <span className="inline-flex items-center" style={{ gap: 7 }}>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        Lower
      </span>
      <span className="inline-flex" style={{ gap: 3 }}>
        {HEAT_RAMP.map((c, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{ width: 18, height: 10, borderRadius: 2, background: c }}
          />
        ))}
      </span>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        Higher
      </span>
    </span>
  );
}

/* ── Review · provenance ────────────────────────────────────────────────────
 *
 * Who stands behind the reading, when it was refreshed, and how far the agent
 * will commit to it. A report with no reviewer and no window is a number you
 * can't act on — so it opens the page. The reviewer list is live: add from the
 * pool, drop anyone but the lead, and the "last updated" stamp follows the
 * edit, because a sign-off list you can't change isn't a sign-off.
 */
export function ReviewStrip() {
  const { window: dataWindow } = CLAIMS_REVIEW;
  const [reviewers, setReviewers] = useState(CLAIMS_REVIEW.reviewers);
  const [updated, setUpdated] = useState(CLAIMS_REVIEW.updated);
  const [picking, setPicking] = useState(false);

  const onList = new Set(reviewers.map((r) => r.initials));
  const candidates = REVIEWER_POOL.filter((p) => !onList.has(p.initials));

  const addReviewer = (initials: string) => {
    setReviewers((rs) => [...rs, { initials }]);
    setUpdated("Just now");
    setPicking(false);
  };
  const removeReviewer = (initials: string) => {
    setReviewers((rs) => rs.filter((r) => r.initials !== initials));
    setUpdated("Just now");
  };

  return (
    <section
      className="flex items-center justify-between flex-wrap"
      style={{
        gap: 24,
        padding: "14px 18px",
        borderRadius: 14,
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
      }}
    >
      <Field label="Reviewers">
        <span className="flex items-center">
          {reviewers.map((r, i) => (
            <button
              key={r.initials}
              type="button"
              onClick={r.lead ? undefined : () => removeReviewer(r.initials)}
              aria-label={r.lead ? `${r.initials} · review lead` : `Remove ${r.initials}`}
              title={r.lead ? `${r.initials} · lead` : `${r.initials} · click to remove`}
              className="review-avatar inline-flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                marginLeft: i === 0 ? 0 : -8,
                padding: 0,
                border: "2px solid var(--surface-base)",
                background: r.lead ? "var(--color-iris-600, #6941C6)" : "var(--color-iris-100)",
                color: r.lead ? "#fff" : "var(--color-iris-700)",
                fontSize: 11,
                fontWeight: 600,
                cursor: r.lead ? "default" : "pointer",
              }}
            >
              {r.initials}
            </button>
          ))}

          {candidates.length > 0 && (
            <span className="relative" style={{ marginLeft: -8 }}>
              <button
                type="button"
                onClick={() => setPicking((v) => !v)}
                aria-label="Add reviewer"
                aria-expanded={picking}
                className="inline-flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "1px dashed var(--border-strong)",
                  background: picking ? "var(--color-iris-50)" : "var(--surface-base)",
                  color: "var(--ds-text-secondary)",
                  cursor: "pointer",
                }}
              >
                <Plus size={13} weight="bold" />
              </button>

              {picking && (
                <>
                  {/* Click-away layer. */}
                  <span
                    className="fixed inset-0"
                    style={{ zIndex: 40 }}
                    onClick={() => setPicking(false)}
                  />
                  <div
                    role="menu"
                    className="absolute flex flex-col"
                    style={{
                      zIndex: 41,
                      top: 34,
                      left: 0,
                      minWidth: 208,
                      padding: 4,
                      borderRadius: 10,
                      background: "var(--surface-base)",
                      border: "1px solid var(--border-default)",
                      boxShadow: "0 8px 24px rgba(15,16,35,.16)",
                    }}
                  >
                    {candidates.map((c) => (
                      <button
                        key={c.initials}
                        type="button"
                        role="menuitem"
                        onClick={() => addReviewer(c.initials)}
                        className="review-pick flex items-center text-left"
                        style={{
                          gap: 9,
                          padding: "7px 8px",
                          borderRadius: 7,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          className="inline-flex items-center justify-center shrink-0"
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: "var(--color-iris-100)",
                            color: "var(--color-iris-700)",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {c.initials}
                        </span>
                        <span className="flex flex-col" style={{ gap: 1 }}>
                          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                            {c.name}
                          </span>
                          <span
                            className="type-caption"
                            style={{ color: "var(--ds-text-secondary)" }}
                          >
                            {c.role}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </span>
          )}
        </span>
      </Field>

      <Field label="Last updated">
        <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
          {updated}
        </span>
      </Field>

      <Field label="Data window" right>
        <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
          {dataWindow}
        </span>
      </Field>

      <style>{`
        .review-avatar { transition: transform .12s ease; }
        .review-avatar:hover { transform: translateY(-2px); }
        .review-pick:hover { background: var(--surface-raised); }
      `}</style>
    </section>
  );
}

function Field({
  label,
  children,
  right,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: 6, alignItems: right ? "flex-end" : "flex-start" }}
    >
      <PanelLabel>{label}</PanelLabel>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { SegmentedControl } from "@navanta-ai/design-system";
import {
  POVA_LENSES,
  povaChain,
  povaChainRead,
  povaLens,
  type PovaBuild,
  type PovaLens,
  type PovaRow,
} from "@/data/performance-analytics";

/**
 * The Overall read's causal chain and decomposition.
 *
 * Deliberately the same shapes the Labor analysis uses for the same two jobs —
 * source-tagged nodes ending in money, then one panel of bars with a lens
 * switch. Two visual languages for "here is the chain" and "here is the
 * breakdown" would make the four analyses read as four products.
 *
 * The bars sit above the eight-row table rather than replacing it, because the
 * two answer different questions: the bars say where the money is
 * concentrated, the table says what the actual and budget figures were. The
 * by-plant panel that used to sit lower down is gone — it is a lens here now,
 * and the same list in two places is the thing that drifts.
 */
export default function PovaAnalysis({
  period,
  build,
  onOpenCategory,
}: {
  period: string;
  build: PovaBuild;
  /** Opens a category's breakdown drawer. Only the category lens has rows
   *  with a "why" behind them, so only those bars are clickable. */
  onOpenCategory: (row: PovaRow) => void;
}) {
  const [lens, setLens] = useState<PovaLens>("category");

  const chain = povaChain(period, build);
  const rows = povaLens(lens, period, build);

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <Section title="The causal chain · how the money actually moved" scope="plan → labor → cost">
        <div className="flex items-stretch" style={{ gap: 8, overflowX: "auto" }}>
          {chain.map((node, i) => (
            <div
              key={`${node.src}-${i}`}
              className="flex items-center"
              style={{ gap: 8, flex: "1 1 0", minWidth: 132 }}
            >
              <div
                className="flex flex-col"
                style={{
                  flex: 1,
                  gap: 3,
                  padding: "11px 12px",
                  borderRadius: 10,
                  background: node.tone === "hot" ? "var(--surface-danger)" : "#FEFBF3",
                  border: `1px solid ${
                    node.tone === "hot"
                      ? "var(--border-danger, #FDA29B)"
                      : "var(--text-warning, #F79009)"
                  }`,
                }}
              >
                {/* The system of record, named. Without it the chain is four
                    numbers; with it, it is four systems agreeing. */}
                <span
                  className="type-caption"
                  style={{
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    fontSize: 9.5,
                    color: "var(--ds-text-placeholder, var(--text-muted))",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {node.src}
                </span>
                <span
                  style={{
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    fontVariantNumeric: "tabular-nums",
                    color:
                      node.tone === "hot" ? "var(--text-danger)" : "var(--text-warning, #B7791F)",
                  }}
                >
                  {node.value}
                </span>
                <span
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.35 }}
                >
                  {node.label}
                </span>
              </div>
              {i < chain.length - 1 && (
                <ArrowRight
                  size={14}
                  weight="bold"
                  color="var(--border-strong)"
                  style={{ flexShrink: 0 }}
                />
              )}
            </div>
          ))}
        </div>
        <p
          className="type-caption"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--surface-raised)",
            color: "var(--ds-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--ds-text-primary)" }}>Read it left to right:</strong>{" "}
          {povaChainRead(period, build)}
        </p>
      </Section>

      <Section
        title={`Break the ${build.summary.totalVariance.replace(/ [UF]$/, "")} down`}
        action={
          <SegmentedControl
            size="sm"
            value={lens}
            onValueChange={(v) => setLens(v as PovaLens)}
            aria-label="Decomposition lens"
            options={POVA_LENSES.map((l) => ({ value: l.id, label: l.label }))}
          />
        }
      >
        <div className="flex flex-col" style={{ gap: 10 }}>
          {rows.map((r) => (
            <div
              key={r.label}
              className={r.row ? "flex items-center transition-colors" : "flex items-center"}
              style={{
                gap: 12,
                cursor: r.row ? "pointer" : undefined,
                borderRadius: 8,
                margin: r.row ? "0 -8px" : undefined,
                padding: r.row ? "2px 8px" : undefined,
              }}
              onClick={r.row ? () => onOpenCategory(r.row!) : undefined}
              title={r.row ? "Open the category breakdown" : undefined}
              role={r.row ? "button" : undefined}
              tabIndex={r.row ? 0 : undefined}
              onKeyDown={
                r.row
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenCategory(r.row!);
                      }
                    }
                  : undefined
              }
            >
              <span className="flex flex-col shrink-0" style={{ width: 168 }}>
                <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                  {r.label}
                </span>
                {r.sub && (
                  <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                    {r.sub}
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className="flex-1"
                style={{
                  height: 14,
                  borderRadius: 5,
                  background: "var(--surface-sunken)",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${r.pct}%`,
                    borderRadius: 5,
                    background:
                      r.tone === "hot"
                        ? "var(--text-danger)"
                        : r.tone === "warn"
                          ? "var(--text-warning, #F79009)"
                          : "var(--text-success)",
                  }}
                />
              </span>
              <span
                className="type-body-medium shrink-0"
                style={{
                  width: 76,
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--ds-text-primary)",
                }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/** Local copy of the Labor view's panel chrome, so the two read identically. */
function Section({
  title,
  scope,
  action,
  children,
}: {
  title: string;
  scope?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        padding: 16,
      }}
    >
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 10, marginBottom: 12 }}
      >
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {title}
        </span>
        {action ?? (
          scope && (
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {scope}
            </span>
          )
        )}
      </div>
      {children}
    </section>
  );
}

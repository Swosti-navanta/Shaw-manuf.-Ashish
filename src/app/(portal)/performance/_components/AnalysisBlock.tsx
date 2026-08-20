"use client";

import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { SegmentedControl } from "@navanta-ai/design-system";
import type {
  ChainNode,
  ContextRead,
  LensRow,
  PovaRow,
} from "@/data/performance-analytics";

/**
 * One analysis, in the order the questions get asked: how did we get here,
 * where is it concentrated, and is it structural.
 *
 * Shared by every view that makes that argument, because it IS the same
 * argument — only the unit changes, dollars on the Overall read and OEE points
 * on Manufacturing. Four views each drawing their own chain and their own bars
 * would read as four products rather than four questions about one plant.
 */
export default function AnalysisBlock<L extends string>({
  chainTitle,
  chainScope,
  chain,
  read,
  breakdownTitle,
  lenses,
  rows,
  context,
  onOpenRow,
}: {
  chainTitle: string;
  chainScope: string;
  chain: ReadonlyArray<ChainNode>;
  read: string;
  breakdownTitle: string;
  lenses: ReadonlyArray<{ id: L; label: string }>;
  /** Rows for the active lens. */
  rows: (lens: L) => ReadonlyArray<LensRow>;
  context?: { worsening: ContextRead; outlier: ContextRead };
  /** Set where a row has a "why" behind it to open. */
  onOpenRow?: (row: PovaRow) => void;
}) {
  const [lens, setLens] = useState<L>(lenses[0].id);
  const activeRows = rows(lens);

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <Section title={chainTitle} scope={chainScope}>
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
          <strong style={{ color: "var(--ds-text-primary)" }}>Read it left to right:</strong> {read}
        </p>
      </Section>

      <Section
        title={breakdownTitle}
        action={
          <SegmentedControl
            size="sm"
            value={lens}
            onValueChange={(v) => setLens(v as L)}
            aria-label="Decomposition lens"
            options={lenses.map((l) => ({ value: l.id, label: l.label }))}
          />
        }
      >
        <div className="flex flex-col" style={{ gap: 10 }}>
          {activeRows.map((r) => (
            <div
              key={r.label}
              className="flex items-center transition-colors"
              style={{
                gap: 12,
                cursor: r.row && onOpenRow ? "pointer" : undefined,
                borderRadius: 8,
                margin: r.row && onOpenRow ? "0 -8px" : undefined,
                padding: r.row && onOpenRow ? "2px 8px" : undefined,
              }}
              onClick={r.row && onOpenRow ? () => onOpenRow(r.row!) : undefined}
              title={r.row && onOpenRow ? "Open the breakdown" : undefined}
              role={r.row && onOpenRow ? "button" : undefined}
              tabIndex={r.row && onOpenRow ? 0 : undefined}
              onKeyDown={
                r.row && onOpenRow
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenRow(r.row!);
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

        {/* Structural or a blip · this one or all of them. The two questions
            that decide whether the breakdown above is worth acting on, kept
            inside the same panel because neither means anything alone. */}
        {context && (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 10,
              marginTop: 14,
            }}
          >
            {[
              { k: "Trend assessment", r: context.worsening },
              { k: "Peer comparison", r: context.outlier },
            ].map((c) => (
              <div
                key={c.k}
                className="flex flex-col"
                style={{
                  gap: 4,
                  padding: "11px 13px",
                  borderRadius: 10,
                  background: "var(--surface-raised)",
                }}
              >
                <span
                  className="type-caption"
                  style={{
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--ds-text-placeholder, var(--text-muted))",
                  }}
                >
                  {c.k}
                </span>
                <span
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
                >
                  <strong style={{ color: "var(--ds-text-primary)" }}>{c.r.lead}</strong>{" "}
                  {c.r.rest}
                </span>
              </div>
            ))}
          </div>
        )}
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

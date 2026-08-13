"use client";

import type { ReactNode } from "react";
import { PanelAlert } from "@navanta-ai/design-system";

/**
 * A titled block inside the drawer. The heading matches the DS
 * `PanelInfoGrid` title (14px medium, primary) so a hand-built section and a
 * DS one sit at the same level — Figma node 2327:8965.
 */
export function Section({
  title,
  meta,
  children,
}: {
  title: string;
  /** Quiet right-hand count, e.g. "14 items". */
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <div className="flex items-start justify-between" style={{ gap: 12 }}>
        <span
          className="type-body font-medium"
          style={{ color: "var(--ds-text-primary)" }}
        >
          {title}
        </span>
        {meta && (
          <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
            {meta}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/** Label → value rows. Mirrors the DS PanelInfoGrid, but accepts nodes on the
 *  value side so identifiers stay drillable. */
export function KeyValues({ rows }: { rows: ReadonlyArray<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="flex flex-col" style={{ gap: 0 }}>
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-baseline justify-between"
          style={{ gap: 16, padding: "7px 0", borderTop: "1px solid var(--border-light)" }}
        >
          <dt className="type-caption" style={{ color: "var(--ds-text-secondary)", whiteSpace: "nowrap" }}>
            {r.label}
          </dt>
          <dd
            className="type-body"
            style={{ color: "var(--ds-text-primary)", textAlign: "right", minWidth: 0 }}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A ranked bar list — downtime by reason, losses by cause, claims by month.
 *  Bars are proportional to the largest value so the shape reads at a glance. */
export function Pareto({
  rows,
}: {
  rows: ReadonlyArray<{ label: string; weight: number; value: string; hot?: boolean }>;
}) {
  const max = Math.max(...rows.map((r) => r.weight), 1);
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col" style={{ gap: 4 }}>
          <div className="flex items-baseline justify-between" style={{ gap: 12 }}>
            <span className="type-caption" style={{ color: "var(--ds-text-primary)" }}>
              {r.label}
            </span>
            <span
              style={{
                fontSize: 11,
                color: r.hot ? "var(--text-danger)" : "var(--ds-text-secondary)",
              }}
            >
              {r.value}
            </span>
          </div>
          <span
            aria-hidden="true"
            style={{
              display: "block",
              height: 6,
              borderRadius: 3,
              background: "var(--surface-sunken)",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${(r.weight / max) * 100}%`,
                borderRadius: 3,
                background: r.hot ? "var(--text-danger)" : "var(--color-iris-400)",
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

/** A single number carrying the point of a section, with its unit beneath. */
export function Figure({
  value,
  caption,
  tone = "neutral",
}: {
  value: string;
  caption: ReactNode;
  tone?: "neutral" | "bad" | "good";
}) {
  const color =
    tone === "bad"
      ? "var(--text-danger)"
      : tone === "good"
        ? "var(--text-success)"
        : "var(--ds-text-primary)";
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <span
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color,
        }}
      >
        {value}
      </span>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        {caption}
      </span>
    </div>
  );
}

/**
 * The verdict at the top of a drawer — the DS `PanelAlert`. It states what
 * this record's status is and why, tinted by severity, before any detail.
 */
export function Lead({
  verdict,
  detail,
  tone = "warning",
}: {
  verdict: string;
  detail: string;
  tone?: "danger" | "warning" | "info" | "success";
}) {
  return <PanelAlert type={tone} title={verdict} description={detail} />;
}

/** A small seven-reading sparkline for the KPI drawer. */
export function Sparkline({ series, tone = "bad" }: { series: number[]; tone?: "bad" | "neutral" }) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const w = 340;
  const h = 56;
  const points = series
    .map((v, i) => {
      const x = 6 + (i * (w - 12)) / (series.length - 1);
      const y = h - 6 - ((v - min) / (max - min || 1)) * (h - 14);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      role="img"
      aria-label="Trend over the last seven readings"
      style={{ display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={tone === "bad" ? "var(--text-danger)" : "var(--color-iris-500)"}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Inline emphasis for a figure inside drawer prose. */
export function Strong({ children, tone }: { children: ReactNode; tone?: "bad" }) {
  return (
    <strong
      style={{
        fontWeight: 600,
        color: tone === "bad" ? "var(--text-danger)" : "var(--ds-text-primary)",
      }}
    >
      {children}
    </strong>
  );
}

"use client";

import type { ReactNode } from "react";

/**
 * The shared kit for the two Yarn decks.
 *
 * Both modals show the same *kinds* of thing — a titled block, a dense table, a
 * horizontal bar, a status dot — over different subjects. Building those four
 * shapes once is what keeps Modal 1 and Modal 2 reading as one surface instead
 * of two screens that happen to share a header.
 *
 * These are deliberately narrow: a table here is 5–8 rows of already-filtered
 * data inside an 880px modal, so it is a CSS grid rather than the page-level
 * DataTable. DataTable brings sorting, faceting and pagination that would all
 * be dead controls at this size.
 */

/* ─── Block ─────────────────────────────────────────────────────────────── */

/** A titled section. `caption` carries the target or the rule the block is
 *  measured against — a number without its tolerance can't be read. */
export function Block({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col" style={{ gap: 8 }}>
      <div className="flex items-baseline justify-between flex-wrap" style={{ gap: 12 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ds-text-placeholder, var(--text-muted))",
          }}
        >
          {title}
        </span>
        {caption && (
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {caption}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/* ─── Grid table ────────────────────────────────────────────────────────── */

export interface GridColumn<T> {
  key: string;
  label: string;
  /** Any valid grid-template-columns track. Defaults to `1fr`. */
  width?: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
}

/**
 * A dense read-only table.
 *
 * Numbers are right-aligned and tabular so a column can be scanned down for
 * the outlier, which is the only reason to put them in a column at all.
 */
export function GridTable<T>({
  columns,
  rows,
  rowKey,
  footer,
  note,
}: {
  columns: ReadonlyArray<GridColumn<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => string;
  /** A totals row, rendered above a heavier rule. */
  footer?: ReadonlyArray<ReactNode>;
  /** An elision line, e.g. "… 006–120". Stating what was left out beats
   *  implying the five rows shown are all there is. */
  note?: string;
}) {
  const template = columns.map((c) => c.width ?? "1fr").join(" ");

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--surface-raised)" }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: template,
          gap: 12,
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {columns.map((c) => (
          <span
            key={c.key}
            className="type-caption"
            style={{ color: "var(--ds-text-secondary)", textAlign: c.align ?? "left" }}
          >
            {c.label}
          </span>
        ))}
      </div>

      {rows.map((row, i) => (
        <div
          key={rowKey(row)}
          className="grid items-center"
          style={{
            gridTemplateColumns: template,
            gap: 12,
            padding: "10px 14px",
            borderBottom:
              i < rows.length - 1 || note || footer ? "1px solid var(--border-light)" : undefined,
          }}
        >
          {columns.map((c) => (
            <span key={c.key} style={{ textAlign: c.align ?? "left", minWidth: 0 }}>
              {c.cell(row)}
            </span>
          ))}
        </div>
      ))}

      {note && (
        <div style={{ padding: "9px 14px", borderBottom: footer ? "1px solid var(--border-light)" : undefined }}>
          <span
            className="type-caption"
            style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}
          >
            {note}
          </span>
        </div>
      )}

      {footer && (
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: template,
            gap: 12,
            padding: "10px 14px",
            borderTop: "1px solid var(--border-default)",
          }}
        >
          {footer.map((cell, i) => (
            <span
              key={columns[i]?.key ?? i}
              className="type-body-medium"
              style={{
                textAlign: columns[i]?.align ?? "left",
                color: "var(--ds-text-primary)",
                fontVariantNumeric: "tabular-nums",
                minWidth: 0,
              }}
            >
              {cell}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Cells ─────────────────────────────────────────────────────────────── */

/** A number. Tabular so columns line up on the decimal. */
export function Num({
  children,
  tone = "primary",
  bold,
}: {
  children: ReactNode;
  tone?: "primary" | "secondary" | "success" | "warn" | "danger";
  bold?: boolean;
}) {
  return (
    <span
      className="type-body"
      style={{
        color: TONE[tone],
        fontVariantNumeric: "tabular-nums",
        fontWeight: bold ? 600 : 400,
      }}
    >
      {children}
    </span>
  );
}

export function Text({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "secondary" | "success" | "warn" | "danger";
}) {
  return (
    <span className="type-body" style={{ color: TONE[tone] }}>
      {children}
    </span>
  );
}

const TONE: Record<string, string> = {
  primary: "var(--ds-text-primary)",
  secondary: "var(--ds-text-secondary)",
  success: "var(--text-success)",
  warn: "var(--text-warning, #B26B00)",
  danger: "var(--text-danger)",
};

/** A status dot with its label. The dot alone would encode meaning in colour
 *  only, which fails for anyone who can't separate the hues. */
export function Dot({
  tone,
  children,
}: {
  tone: "success" | "warn" | "danger" | "muted";
  children: ReactNode;
}) {
  const colour =
    tone === "success"
      ? "var(--text-success)"
      : tone === "warn"
        ? "var(--text-warning, #B26B00)"
        : tone === "danger"
          ? "var(--text-danger)"
          : "var(--ds-text-placeholder, var(--text-muted))";
  return (
    <span className="inline-flex items-center" style={{ gap: 6, minWidth: 0 }}>
      <span
        aria-hidden="true"
        style={{ width: 7, height: 7, borderRadius: "50%", background: colour, flexShrink: 0 }}
      />
      <span className="type-body truncate" style={{ color: colour }}>
        {children}
      </span>
    </span>
  );
}

/**
 * A horizontal bar against a target.
 *
 * The target is drawn as a notch rather than stated only in the caption: "85%
 * against a 95% target" is two numbers to hold, where a bar that visibly stops
 * short of a marker is one glance.
 */
export function Bar({
  pct,
  target,
  tone,
}: {
  pct: number;
  target?: number;
  tone: "success" | "warn" | "danger";
}) {
  const fill =
    tone === "success"
      ? "var(--text-success)"
      : tone === "warn"
        ? "var(--text-warning, #B26B00)"
        : "var(--text-danger)";
  return (
    <span
      className="relative block"
      style={{
        height: 8,
        borderRadius: 999,
        background: "var(--border-light)",
        overflow: "hidden",
      }}
    >
      <span
        className="absolute inset-y-0 left-0"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: fill, borderRadius: 999 }}
      />
      {target !== undefined && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0"
          style={{ left: `${target}%`, width: 2, background: "var(--ds-text-primary)", opacity: 0.35 }}
        />
      )}
    </span>
  );
}

/** A compliance chip — a check that either passed or is a warning. */
export function Check({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 5 }}>
      <span
        aria-hidden="true"
        style={{
          fontSize: 11,
          lineHeight: 1,
          color: pass ? "var(--text-success)" : "var(--text-warning, #B26B00)",
        }}
      >
        {pass ? "✓" : "⚠"}
      </span>
      <span
        className="type-caption"
        style={{ color: pass ? "var(--text-success)" : "var(--text-warning, #B26B00)" }}
      >
        {label}
      </span>
    </span>
  );
}

/** The closing note under a panel — why the panel is shaped the way it is. */
export function Footnote({ children }: { children: ReactNode }) {
  return (
    <p className="type-caption" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}>
      {children}
    </p>
  );
}

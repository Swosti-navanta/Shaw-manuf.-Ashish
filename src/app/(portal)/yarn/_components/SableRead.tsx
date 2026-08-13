"use client";

import { WASTE_AVOIDED, YARN_KPIS } from "@/types/yarn";

/**
 * Sable's read — waste avoided, and the four readings behind it.
 *
 * The headline is a saving rather than an exposure, which makes it the odd one
 * out among the agent surfaces. That is honest: Quality opens with money at
 * risk because grading is damage control, and Yarn opens with money kept
 * because sizing a lot correctly is the one thing here that pays before
 * anything goes wrong.
 */
export default function SableRead() {
  return (
    <section
      style={{
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        padding: "16px 18px",
      }}
    >
      <div className="flex items-baseline flex-wrap" style={{ gap: 12 }}>
        <span
          style={{
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "var(--text-success)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${WASTE_AVOIDED.toLocaleString()}
        </span>
        <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
          yarn waste avoided this week by right-sizing dye lots to the orders they serve.
        </span>
      </div>

      <div
        className="grid"
        style={{
          gap: 10,
          marginTop: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        {YARN_KPIS.map((k) => (
          <div
            key={k.label}
            className="flex flex-col"
            style={{
              gap: 4,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--border-light)",
            }}
          >
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {k.label}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: k.alert ? "var(--text-danger)" : "var(--ds-text-primary)",
              }}
            >
              {k.value}
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {k.detail}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

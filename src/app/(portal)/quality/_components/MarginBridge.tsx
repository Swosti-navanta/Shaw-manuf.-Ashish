"use client";

import Link from "next/link";
import { Button } from "@navanta-ai/design-system";
import { ArrowRight } from "@phosphor-icons/react";
import { MARGIN_BRIDGE } from "@/types/quality";

const usd = (n: number) => `$${n.toLocaleString()}`;

/**
 * The margin bridge. The headline number is only interesting because a named
 * share of it traces to one scheduling decision — that share is the whole
 * argument for Quality feeding Sawyer, so it's the first thing on the page and
 * it links straight to the claims that prove it.
 */
export default function MarginBridge() {
  const { total, fromSequencing, breakdown } = MARGIN_BRIDGE;
  const share = Math.round((fromSequencing / total) * 100);

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
            color: "var(--text-danger)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {usd(total)}
        </span>
        <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
          margin at risk this week — the first-quality-to-seconds gap, not scrap.
        </span>
      </div>

      {/* Proportional bar: the sequencing share is the only segment that means
          anything here, so it's the only one that carries colour. */}
      <div
        aria-hidden="true"
        className="flex w-full"
        style={{ gap: 2, marginTop: 14, height: 8 }}
      >
        {breakdown.map((b) => (
          <span
            key={b.label}
            title={`${b.label} · ${usd(b.value)}`}
            style={{
              width: `${(b.value / total) * 100}%`,
              borderRadius: 3,
              background: b.linked ? "var(--color-iris-500)" : "var(--surface-sunken)",
            }}
          />
        ))}
      </div>

      <div className="flex items-end justify-between flex-wrap" style={{ gap: 16, marginTop: 12 }}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          {breakdown.map((b) => (
            <span key={b.label} className="flex items-center" style={{ gap: 8 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: b.linked ? "var(--color-iris-500)" : "var(--border-strong)",
                }}
              />
              <span
                className="type-body"
                style={{
                  color: b.linked ? "var(--ds-text-primary)" : "var(--ds-text-secondary)",
                  fontWeight: b.linked ? 500 : 400,
                }}
              >
                {b.label}
              </span>
              <span
                className="type-body"
                style={{
                  color: "var(--ds-text-primary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {usd(b.value)}
              </span>
            </span>
          ))}
        </div>

        <div className="flex flex-col items-end" style={{ gap: 8 }}>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {share}% of it traces to how the work was sequenced
          </span>
          <Link href="/quality/claims">
            <Button
              variant="outline"
              size="sm"
              iconRight={<ArrowRight size={14} weight="bold" />}
            >
              See the claims behind it
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

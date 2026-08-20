"use client";

import { ArrowRight, Check } from "@phosphor-icons/react";
import { AiStar, Button } from "@navanta-ai/design-system";
import { useRun } from "@/context/RunContext";
import { ATTENTION_OVERALL, type AttentionItem } from "@/data/attention";
import { HORIZON_LABEL, MAKE_ACTIONS } from "@/types/action";

/**
 * The seam between analysis and decision, on the Overall read.
 *
 * Built on the treatment the Labor analysis already uses for the same job —
 * iris ground, the star, and one primary route to Make — because it IS the
 * same job, and a second visual language for "the engine raised this" would
 * teach people that the two pages are different products.
 *
 * What it adds over that footer is the per-item detail the POVA read needs:
 * the limit that fired, quoted rather than summarised, and the clock the
 * decision runs on. The rule is quoted so the argument can be with the limit —
 * a setting someone chose on Thresholds — rather than with the figure it
 * produced.
 */
export default function AttentionBand({ onOpenMake }: { onOpenMake: (id: string) => void }) {
  const { status, workOrderRaised } = useRun();

  /* Decided-ness is read from the run state Make writes, not tracked again
     here — two copies of "has this been decided" is how a page ends up
     disagreeing with the queue it links to. */
  const decidedLabel = (item: AttentionItem): string | null => {
    const action = MAKE_ACTIONS.find((a) => a.id === item.actionId);
    if (!action) return null;
    if (action.kind === "resequence" && status !== "open") return "Re-sequenced on Make";
    if (action.kind === "workorder" && workOrderRaised) return "Work order raised on Make";
    return null;
  };

  const live = ATTENTION_OVERALL.filter((i) => !decidedLabel(i));
  const open = live.length;

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 10,
        padding: 14,
        borderRadius: 12,
        background: open > 0 ? "var(--color-iris-50)" : "var(--surface-raised)",
        border: `1px solid ${open > 0 ? "var(--color-iris-200)" : "var(--border-default)"}`,
      }}
    >
      <span
        className="type-body inline-flex items-start"
        style={{ gap: 8, color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
      >
        <AiStar size={15} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          {open > 0 ? (
            <>
              <strong style={{ color: "var(--ds-text-primary)" }}>
                This analysis surfaced {open} thing{open === 1 ? "" : "s"} that may need a call.
              </strong>{" "}
              Decisions aren&apos;t taken here — they&apos;re raised on Make, where the whole
              plant&apos;s calls sit in one queue.
            </>
          ) : (
            <>
              <strong style={{ color: "var(--ds-text-primary)" }}>Nothing to raise.</strong>{" "}
              Everything this read surfaced has been decided.
            </>
          )}
        </span>
      </span>

      {ATTENTION_OVERALL.map((item) => {
        const done = decidedLabel(item);
        return (
          <div
            key={item.id}
            className="flex flex-col"
            style={{
              gap: 5,
              padding: "11px 13px",
              borderRadius: 10,
              border: "1px solid var(--border-light)",
              background: "var(--surface-base)",
            }}
          >
            <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                {item.subject}
              </span>
              {/* Neutral: a horizon is not a severity. "This shift" is sooner
                  than "this quarter", not worse than it, and colouring it as a
                  warning would rank the queue by the wrong thing. */}
              <span
                className="type-caption"
                style={{
                  padding: "1px 8px",
                  borderRadius: 999,
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-default)",
                  color: "var(--ds-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                {HORIZON_LABEL[item.horizon]}
              </span>
              <span
                className="type-body-medium"
                style={{
                  marginLeft: "auto",
                  fontVariantNumeric: "tabular-nums",
                  color: done ? "var(--ds-text-secondary)" : "var(--text-danger)",
                }}
              >
                {done ? "decided" : item.exposure}
              </span>
            </span>

            <span
              className="type-caption"
              style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
            >
              {item.detail}
            </span>

            <span className="type-caption" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>
              rule: {item.rule}
            </span>

            {done && (
              <span
                className="type-caption inline-flex items-center"
                style={{ gap: 5, color: "var(--text-success, #15803d)", fontWeight: 600 }}
              >
                <Check size={12} weight="bold" />
                {done}
              </span>
            )}
          </div>
        );
      })}

      {open > 0 && (
        <span className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenMake(live[0].actionId)}
            iconRight={<ArrowRight size={14} weight="bold" />}
          >
            See {open} on Make
          </Button>
        </span>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@navanta-ai/design-system";
import { ArrowsClockwise, Check } from "@phosphor-icons/react";
import { useRun } from "@/context/RunContext";
import { useScope } from "@/context/ScopeContext";
import { OPTIONS, OPTION_ORDER } from "@/data/run-data";
import { plantLabel } from "@/types/division";
import { thresholdLabel } from "@/types/threshold";
import type { OptionId } from "@/types/run";
import DrillLink from "@/components/ui/DrillLink";

/**
 * The decision, as a band at the foot of the agent's summary card — the IRIS
 * `RecommendedActionBand` shape.
 *
 * Rowan's pick is the headline and the primary button; the alternatives are
 * secondary buttons that *switch the selection* rather than committing. That
 * ordering is the point: an alternative has to be chosen deliberately, and
 * choosing the risky one shows its history before Accept is pressed rather
 * than after.
 *
 * Which of the three states renders is set by the plant's Thresholds dial,
 * not by anything on this page:
 *   open    → three costed options, your call
 *   auto    → the dial had re-sequencing at Auto; nobody was asked
 *   decided → a person accepted, and the plan corrected itself
 */
export default function DecisionBand() {
  const { status } = useRun();
  if (status === "decided") return <Resolved />;
  if (status === "auto") return <AutoResolved />;
  return <OpenDecision />;
}

const BAND: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  padding: 12,
  background: "var(--color-iris-100)",
};

/* ─── Open ──────────────────────────────────────────────────────────────── */

function OpenDecision() {
  const { accept, selectedOption: selected, selectOption: setSelected } = useRun();
  const recommended = (OPTION_ORDER.find((id) => OPTIONS[id].recommended) ??
    OPTION_ORDER[0]) as OptionId;

  const option = OPTIONS[selected];
  const others = OPTION_ORDER.filter((id) => id !== selected) as OptionId[];
  const isRecommended = selected === recommended;

  return (
    <div className="flex flex-col">
      <div
        style={{
          ...BAND,
          background: option.risky ? "var(--surface-danger)" : "var(--color-iris-100)",
        }}
      >
        <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
          <span
            className="type-caption"
            style={{ color: option.risky ? "var(--text-danger)" : "var(--color-iris-700)" }}
          >
            {isRecommended ? "Rowan's recommendation" : "Alternative — you chose this"} ·{" "}
            {option.cost} {option.costLabel}
          </span>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {option.title}
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {option.detail}
          </span>
        </div>

        <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
          {others.map((id) => (
            <Button
              key={id}
              variant="outline"
              size="sm"
              onClick={() => setSelected(id)}
              title={`${OPTIONS[id].title} · ${OPTIONS[id].cost} ${OPTIONS[id].costLabel}`}
            >
              {shortLabel(id)} · {OPTIONS[id].cost}
            </Button>
          ))}
          <Button
            variant="primary"
            size="sm"
            onClick={() => accept(selected)}
            iconLeft={<Check size={14} weight="bold" />}
          >
            Accept
          </Button>
        </div>
      </div>

      {/* The product argues against the cheap option before you take it. */}
      {option.risky && (
        <div
          className="type-caption"
          style={{
            padding: "10px 12px",
            background: "var(--surface-danger)",
            borderTop: "1px solid var(--border-danger, #FDA29B)",
            color: "var(--ds-text-primary)",
            lineHeight: 1.5,
          }}
        >
          You did this on <strong style={{ color: "var(--text-danger)" }}>DL-4102</strong> in June —
          it produced claim <DrillLink kind="claim" id="CLM-2291" />.
        </div>
      )}
    </div>
  );
}

/** Two-word handle for an option, for the switch buttons. */
function shortLabel(id: OptionId): string {
  return { A: "Re-sequence", B: "Split lot", C: "Expedite" }[id] ?? id;
}

/* ─── Decided ───────────────────────────────────────────────────────────── */

function Resolved() {
  const { decision, undo } = useRun();
  const o = decision ? OPTIONS[decision] : null;
  if (!o) return null;

  return (
    <div style={{ ...BAND, background: "var(--surface-success)" }}>
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--text-success)" }}>
          Decision recorded · {o.cost === "$0" ? "zero changeover" : `${o.cost} ${o.costLabel}`}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {o.title}
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          Sawyer rebuilt the released sequence · Sable held{" "}
          {o.effect === "split" ? "the lot split" : "DL-4471 whole"} · line lead notified.
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 8 }}>
        <Link href="/scheduling">
          <Button variant="outline" size="sm">
            See it in Sawyer&apos;s schedule
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          iconLeft={<ArrowsClockwise size={14} weight="bold" />}
        >
          Undo
        </Button>
      </div>
    </div>
  );
}

/* ─── Auto-resolved ─────────────────────────────────────────────────────── */

function AutoResolved() {
  const { plant } = useScope();

  return (
    <div style={{ ...BAND, background: "var(--lane-auto-bg)" }}>
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--lane-auto-ink)" }}>
          Resolved inside the limit — nobody was asked
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          Re-sequenced Backing 2, DL-4471 ran whole
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          Because &ldquo;{thresholdLabel("reseq")}&rdquo; is set to Auto for {plantLabel(plant)}.
          Set it back to Ask and this comes to a person.
        </span>
      </div>
      <Link href="/thresholds">
        <Button variant="outline" size="sm">
          Open Thresholds
        </Button>
      </Link>
    </div>
  );
}

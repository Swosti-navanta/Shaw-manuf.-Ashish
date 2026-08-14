"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button, Tooltip } from "@navanta-ai/design-system";
import { ArrowsClockwise, CaretDown, Check, Info, Sparkle, WarningCircle } from "@phosphor-icons/react";
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

/**
 * A short-lived confirmation banner, pinned to the top of the viewport so it
 * reads over the modal. Fires when any of the three decision buttons is
 * clicked — the click otherwise resolves silently (Accept flips the band to
 * Resolved; Split lot / Expedite only switch the selection).
 */
function ActionToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 z-[2000] flex items-center"
      style={{
        top: 20,
        transform: "translateX(-50%)",
        gap: 8,
        padding: "10px 16px",
        background: "var(--ds-text-primary)",
        color: "var(--surface-base)",
        borderRadius: 10,
        boxShadow: "0 12px 32px rgba(15,16,35,.25)",
        fontSize: 14,
        fontWeight: 500,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <Check size={14} weight="bold" />
      {message}
    </div>,
    document.body,
  );
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
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Latches true the first time the picker is opened — the warning is only a
  // "have you looked?" nudge, so once they've looked it never returns.
  const [seenOptions, setSeenOptions] = useState(false);

  const option = OPTIONS[selected];
  const isRecommended = selected === recommended;

  return (
    <div className="flex flex-col">
      {toast && <ActionToast message={toast} onDone={() => setToast(null)} />}
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
          {/* A quiet nudge that the selection is Rowan's pre-pick and wants a
              human look before it's committed — sits left of the dropdown, and
              clears itself once the picker has been opened (the review's done). */}
          {!seenOptions && (
            <Tooltip content="Rowan pre-selected this — review before you accept." side="top">
              <span
                className="flex items-center"
                style={{ color: "var(--text-warning, #B7791F)", cursor: "help" }}
                aria-label="Rowan pre-selected this — review before you accept"
              >
                <WarningCircle size={18} weight="fill" />
              </span>
            </Tooltip>
          )}
          {/* The toggle names the current selection rather than the action —
              it doubles as the "what's chosen" readout, and expands the picker
              so a person can switch before accepting. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExpanded((e) => !e);
              setSeenOptions(true);
            }}
            iconLeft={isRecommended ? <AiStar size={14} /> : undefined}
            iconRight={
              <CaretDown
                size={14}
                weight="bold"
                style={{
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 120ms ease",
                }}
              />
            }
            aria-expanded={expanded}
            title="Change the selected option"
          >
            {shortLabel(selected)} · {option.cost}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              accept(selected);
              setToast(`Accepted · ${OPTIONS[selected].title}`);
            }}
            iconLeft={<Check size={14} weight="bold" />}
          >
            Accept
          </Button>
        </div>
      </div>

      {/* The three options, horizontally stacked and stripped to what separates
          them: cost, whether dates hold, and lot integrity. Clicking one makes
          it the selection the band and Accept act on. */}
      {expanded && (
        <div
          className="flex flex-wrap"
          style={{
            gap: 8,
            padding: 12,
            background: "var(--surface-raised)",
            borderTop: "1px solid var(--border-default)",
          }}
        >
          {OPTION_ORDER.map((id) => (
            <OptionCard
              key={id}
              id={id as OptionId}
              selected={id === selected}
              onSelect={() => {
                setSelected(id as OptionId);
                setToast(
                  `${shortLabel(id as OptionId)} selected · ${OPTIONS[id].cost} ${OPTIONS[id].costLabel}`,
                );
              }}
            />
          ))}
        </div>
      )}

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

/** Numeric magnitude of an option's headline cost, for comparison. */
function costMagnitude(id: OptionId): number {
  return Number(OPTIONS[id].cost.replace(/[^0-9.]/g, "")) || 0;
}

/** The priciest option's id — its cost is the one flagged red as the most
 *  expensive to run, regardless of which option carries the shade risk. */
const DEAREST_OPTION = OPTION_ORDER.reduce((max, id) =>
  costMagnitude(id as OptionId) > costMagnitude(max as OptionId) ? id : max,
) as OptionId;

/** The one or two facts that actually separate the options, pulled from the
 *  option's schedule so the card and the Cost-breakdown tab can't disagree. */
function optionFacts(id: OptionId) {
  const o = OPTIONS[id];
  const integrity = o.schedule.find((r) => r.label.startsWith("DL-4471"));
  const dateBad = o.schedule.some((r) => /ORD/.test(r.label) && r.bad);
  return {
    dateImpact: dateBad ? "Dates at risk" : "Both dates held",
    dateBad,
    integrity: integrity?.value ?? "—",
    integrityBad: Boolean(integrity?.bad),
  };
}

/**
 * A compact, horizontal option tile — the deck's DS surface tokens, one border
 * that carries the state: iris when it's the selection, danger when the option
 * is the risky one, neutral otherwise.
 */
function OptionCard({
  id,
  selected,
  onSelect,
}: {
  id: OptionId;
  selected: boolean;
  onSelect: () => void;
}) {
  const o = OPTIONS[id];
  const facts = optionFacts(id);
  const border = selected
    ? "var(--color-iris-500, #7C6BF0)"
    : o.risky
      ? "var(--border-danger, #FDA29B)"
      : "var(--border-default)";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={o.detail}
      className="flex flex-col transition-colors hover:bg-[var(--surface-hover)]"
      style={{
        flex: "1 1 0",
        minWidth: 168,
        gap: 6,
        padding: 10,
        textAlign: "left",
        cursor: "pointer",
        background: "var(--surface-base)",
        border: `1px solid ${border}`,
        outline: selected ? "1px solid var(--color-iris-500, #7C6BF0)" : "none",
        borderRadius: 8,
      }}
    >
      {/* Header row, identical across cards: label + info on the left, cost on
          the right. The recommendation badge sits on a fixed-height line below
          so every card's facts start at the same y — a card without it keeps
          the empty line rather than collapsing. */}
      <span className="flex items-center justify-between" style={{ gap: 8 }}>
        <span className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {shortLabel(id)}
          </span>
          <Tooltip content={o.why} side="top">
            <span
              className="flex items-center"
              // The info glyph is guidance, not a control — clicking it must not
              // change the selection, so swallow the card's onSelect here.
              onClick={(e) => e.stopPropagation()}
              style={{ color: "var(--ds-text-secondary)", cursor: "help" }}
              aria-label={`Why ${shortLabel(id)}: ${o.why}`}
            >
              <Info size={14} weight="bold" />
            </span>
          </Tooltip>
        </span>
        <span
          className="type-body font-semibold"
          style={{
            color: id === DEAREST_OPTION ? "var(--text-danger)" : "var(--ds-text-primary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {o.cost}
        </span>
      </span>

      <span
        className="type-caption flex items-center"
        style={{
          gap: 4,
          height: 18,
          color: "var(--color-iris-700)",
          visibility: o.recommended ? "visible" : "hidden",
        }}
      >
        <Sparkle size={12} weight="fill" />
        Rowan&apos;s recommendation
      </span>

      <span className="flex flex-col" style={{ gap: 2 }}>
        <span
          className="type-caption"
          style={{ color: facts.dateBad ? "var(--text-danger)" : "var(--ds-text-secondary)" }}
        >
          {facts.dateImpact}
        </span>
        <span
          className="type-caption"
          style={{ color: facts.integrityBad ? "var(--text-danger)" : "var(--ds-text-secondary)" }}
        >
          {facts.integrity}
        </span>
      </span>
    </button>
  );
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

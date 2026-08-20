"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button } from "@navanta-ai/design-system";
import { ArrowsClockwise, Check, Sparkle, WarningCircle } from "@phosphor-icons/react";
import type { MakeAction } from "@/types/action";

/**
 * The decision itself, for a Performance-raised action that carries costed
 * options.
 *
 * The shape is the pipeline's: the read has already framed the judgement, so
 * this is only the choice and its commit. The engine's pick leads (marked
 * Recommended); the alternatives are the arguments against it, and the
 * cheap-on-paper trap is flagged so it can't be taken by reflex. Nothing
 * commits until Accept — Send back returns it for evidence, Ask Sage pulls the
 * cross-agent read, and neither moves the plan.
 *
 * The re-sequence keeps its own bespoke band (it reaches into Sawyer's
 * schedule); this is for the decisions whose whole content is the tradeoff.
 */
export default function DecisionOptions({
  action,
  resolvedLabel,
  onResolve,
  onClose,
}: {
  action: MakeAction;
  /** The already-chosen option's label, if this decision has been made. */
  resolvedLabel?: string | null;
  /** Commit (a label) or undo (null) — lifts the outcome to the queue. */
  onResolve: (label: string | null) => void;
  onClose: () => void;
}) {
  const options = action.options ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sageAsked, setSageAsked] = useState(false);

  if (resolvedLabel) {
    return (
      <>
        {toast && <DeckToast message={toast} onDone={() => setToast(null)} />}
        <div
          className="flex items-end justify-between flex-wrap"
          style={{ gap: 16, padding: 12, background: "var(--surface-success)" }}
        >
          <div className="flex flex-col" style={{ gap: 2 }}>
            <span className="type-caption" style={{ color: "var(--text-success)" }}>
              Decision recorded · {action.agent} · {action.at}
            </span>
            <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
              {resolvedLabel}
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              The engine would carry this out and route what it spawns. Nothing here re-keys.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onResolve(null);
              setToast("Decision undone");
            }}
            iconLeft={<ArrowsClockwise size={14} weight="bold" />}
          >
            Undo
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col">
      {toast && <DeckToast message={toast} onDone={() => setToast(null)} />}

      {/* The options, stacked — each stripped to what separates it: the move,
          its cost, and what it commits you to. Clicking one arms Accept. */}
      <div
        className="flex flex-col"
        style={{
          gap: 8,
          padding: 12,
          background: "var(--color-iris-50)",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        {options.map((o, i) => {
          const isPicked = picked === i;
          const border = isPicked
            ? "var(--color-iris-500, #7C6BF0)"
            : o.recommended
              ? "var(--text-success)"
              : o.risky
                ? "var(--border-danger, #FDA29B)"
                : "var(--border-default)";
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => setPicked(i)}
              aria-pressed={isPicked}
              className="flex flex-col text-left transition-colors hover:bg-[var(--surface-hover)]"
              style={{
                gap: 5,
                padding: "10px 12px",
                cursor: "pointer",
                background: o.recommended && !isPicked ? "var(--surface-success)" : "var(--surface-base)",
                border: `1px solid ${border}`,
                outline: isPicked ? "1px solid var(--color-iris-500, #7C6BF0)" : "none",
                borderRadius: 8,
              }}
            >
              <span className="flex items-center justify-between" style={{ gap: 10 }}>
                <span className="flex items-center flex-wrap" style={{ gap: 8, minWidth: 0 }}>
                  <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                    {o.label}
                  </span>
                  {o.recommended && (
                    <span
                      className="type-caption inline-flex items-center"
                      style={{
                        gap: 4,
                        padding: "1px 8px",
                        borderRadius: 999,
                        background: "var(--surface-success)",
                        color: "var(--text-success)",
                        fontWeight: 600,
                      }}
                    >
                      <Sparkle size={11} weight="fill" />
                      Recommended
                    </span>
                  )}
                </span>
                <span
                  className="type-body font-semibold"
                  style={{
                    color: o.risky ? "var(--text-danger)" : "var(--ds-text-primary)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {o.cost}
                </span>
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}>
                {o.consequence}
              </span>
            </button>
          );
        })}
      </div>

      {/* The commit row. Nothing here moves the plan until Accept — and Accept
          only arms once an option is chosen, so the pre-pick can't ride through
          unread. */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{
          gap: 12,
          padding: "10px 12px",
          background: "var(--surface-raised)",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        <span className="type-caption flex items-center" style={{ gap: 6, color: "var(--ds-text-secondary)" }}>
          {picked === null ? (
            <>
              <WarningCircle size={14} weight="fill" style={{ color: "var(--text-warning, #B7791F)" }} />
              {action.agent} pre-picked the recommendation — choose an option to accept.
            </>
          ) : (
            <>Nothing commits until you accept.</>
          )}
        </span>
        <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose();
            }}
          >
            Send back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSageAsked(true);
              setToast("Sage asked · reading across the four analyses");
            }}
            iconLeft={<AiStar size={14} />}
            disabled={sageAsked}
          >
            {sageAsked ? "Sage asked" : "Ask Sage"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (picked === null) return;
              const label = options[picked].label;
              onResolve(label);
              setToast(`Accepted · ${label}`);
            }}
            iconLeft={<Check size={14} weight="bold" />}
            disabled={picked === null}
          >
            Accept
          </Button>
        </span>
      </div>
    </div>
  );
}

/** A short-lived confirmation, pinned over the modal. Mirrors the re-sequence
 *  band's toast so both decision surfaces confirm the same way. */
function DeckToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 flex items-center"
      style={{
        top: 20,
        zIndex: 2000,
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

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button, PanelInfoGrid } from "@navanta-ai/design-system";
import { ArrowRight, Check, X } from "@phosphor-icons/react";
import { useQuality } from "@/context/QualityContext";
import { CLAIMS_QUEUE, type ClaimRow } from "@/types/quality";
import { QUALITY_RULE } from "@/types/schedule";
import DrillLink from "@/components/ui/DrillLink";

const usd = (n: number) => `$${n.toLocaleString()}`;

/**
 * One claim, traced back to the run that caused it — and the handoff that
 * turns the pattern into a scheduling rule.
 *
 * The send is a two-step: Wren drafts the rule text, you read exactly what
 * will be added to Sawyer's constraint model, then confirm. It changes what
 * the Scheduler is allowed to do, so it doesn't happen behind one unlabelled
 * click.
 */
export default function TracebackDeck({
  claim,
  onClose,
}: {
  claim: ClaimRow;
  onClose: () => void;
}) {
  const { sentFindings, sendFinding } = useQuality();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sent = sentFindings.has(claim.id);
  const chain = [
    { label: "Claim", value: claim.id, kind: "claim" as const },
    { label: "Rolls", value: claim.rolls },
    { label: "Batch", value: claim.batch },
    { label: "Dye lot", value: claim.dyeLot },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center"
      style={{ background: "rgba(15, 16, 35, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Claim · ${claim.id}`}
        className="relative mt-6 mb-6 mx-4 w-full max-w-[880px] rounded-[16px] flex flex-col overflow-hidden"
        style={{
          background: "var(--surface-base)",
          boxShadow: "var(--shadow-modal, 0 24px 60px rgba(15,16,35,.28))",
          maxHeight: "calc(100vh - 48px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between shrink-0"
          style={{ gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex flex-col min-w-0" style={{ gap: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ds-text-primary)" }}>
              {claim.id}
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {claim.customer} · {claim.month} · {usd(claim.cost)} credit + downgrade
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} weight="bold" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col" style={{ padding: 20, gap: 16 }}>
            <section
              className="flex flex-col"
              style={{
                borderRadius: 12,
                border: "1px solid var(--border-default)",
                background: "var(--color-iris-50)",
                overflow: "hidden",
              }}
            >
              <div className="flex flex-col" style={{ gap: 10, padding: "14px 16px" }}>
                <span className="flex items-center" style={{ gap: 8 }}>
                  <AiStar size={16} />
                  <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                    Wren traced it in under a minute
                  </span>
                </span>

                {/* The chain, left to right: what came back, and what made it. */}
                <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
                  {chain.map((node, i) => (
                    <span key={node.label} className="inline-flex items-center" style={{ gap: 6 }}>
                      <span
                        className="flex flex-col"
                        style={{
                          gap: 1,
                          padding: "7px 10px",
                          borderRadius: 8,
                          background: "var(--surface-base)",
                          border: "1px solid var(--border-default)",
                        }}
                      >
                        <span
                          className="type-caption"
                          style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}
                        >
                          {node.label}
                        </span>
                        {node.kind ? (
                          <DrillLink kind={node.kind} id={node.value}>
                            {node.value}
                          </DrillLink>
                        ) : (
                          <span
                            className="type-body"
                            style={{ color: "var(--ds-text-primary)" }}
                          >
                            {node.value}
                          </span>
                        )}
                      </span>
                      {i < chain.length - 1 && (
                        <ArrowRight size={12} weight="bold" color="var(--border-strong)" />
                      )}
                    </span>
                  ))}
                </div>

                <p
                  className="type-body"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}
                >
                  <strong style={{ color: "var(--ds-text-primary)" }}>Cause:</strong> {claim.cause}.
                  The lot was split to protect a date, and the two dye runs did not shade-match.
                </p>
              </div>

              {sent ? (
                <SentBand />
              ) : confirming ? (
                <ConfirmBand
                  onCancel={() => setConfirming(false)}
                  onConfirm={() => {
                    sendFinding(claim.id);
                    setConfirming(false);
                  }}
                />
              ) : (
                <SendBand onSend={() => setConfirming(true)} />
              )}
            </section>

            <PanelInfoGrid
              title="The claim"
              rows={[
                { label: "Customer", value: claim.customer },
                { label: "Raised", value: claim.month },
                { label: "Rolls", value: claim.rolls },
                { label: "Batch", value: claim.batch },
                { label: "Dye lot", value: claim.dyeLot },
                { label: "Cost", value: `${usd(claim.cost)} · credit + seconds downgrade` },
              ]}
            />

            <Pattern />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Bands ─────────────────────────────────────────────────────────────── */

function SendBand({ onSend }: { onSend: () => void }) {
  return (
    <div
      className="flex items-end justify-between flex-wrap"
      style={{ gap: 16, padding: 12, background: "var(--color-iris-100)" }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
          Three claims, four months, one cause
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          This is a process change, not a one-off
        </span>
      </div>
      <Button variant="primary" size="sm" onClick={onSend} iconRight={<ArrowRight size={14} weight="bold" />}>
        Send the finding to Sawyer
      </Button>
    </div>
  );
}

/** The confirm step shows the exact rule text. A person should never approve
 *  a change to the scheduler's constraints without reading the constraint. */
function ConfirmBand({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: 10, padding: 12, background: "var(--color-iris-100)" }}
    >
      <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
        This adds a rule to Sawyer&apos;s constraint model. Every future sequence is checked
        against it.
      </span>
      <div
        className="flex flex-col"
        style={{
          gap: 4,
          padding: "10px 12px",
          borderRadius: 8,
          background: "var(--surface-base)",
          border: "1px solid var(--color-iris-200)",
        }}
      >
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {QUALITY_RULE.text}
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          Hard rule · evidence {QUALITY_RULE.detail}
        </span>
      </div>
      <div className="flex items-center justify-end" style={{ gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          iconLeft={<Check size={14} weight="bold" />}
        >
          Add the rule
        </Button>
      </div>
    </div>
  );
}

function SentBand() {
  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{ gap: 16, padding: 12, background: "var(--surface-success)" }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--text-success)" }}>
          Sent to Sawyer — now a hard rule in the constraint model
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {QUALITY_RULE.text}
        </span>
      </div>
    </div>
  );
}

/* ─── Pattern ───────────────────────────────────────────────────────────── */

/** The three claims side by side. One claim is bad luck; three of the same is
 *  a process, and that difference is the reason to change a rule. */
function Pattern() {
  const max = Math.max(...CLAIMS_QUEUE.map((c) => c.cost));
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
        Pattern across batches
      </span>
      <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--surface-raised)" }}>
        {CLAIMS_QUEUE.map((c, i) => (
          <div
            key={c.id}
            className="flex flex-col"
            style={{
              gap: 6,
              padding: "12px 16px",
              borderBottom: i < CLAIMS_QUEUE.length - 1 ? "1px solid var(--border-default)" : undefined,
            }}
          >
            <span className="flex items-baseline justify-between" style={{ gap: 12 }}>
              <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                {c.id} · {c.month}
              </span>
              <span
                className="type-body"
                style={{ color: "var(--ds-text-primary)", fontVariantNumeric: "tabular-nums" }}
              >
                {usd(c.cost)}
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{ display: "block", height: 5, borderRadius: 3, background: "var(--surface-sunken)" }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${(c.cost / max) * 100}%`,
                  borderRadius: 3,
                  background: "var(--text-danger)",
                }}
              />
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {c.cause}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

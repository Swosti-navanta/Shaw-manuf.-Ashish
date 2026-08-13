"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button, PanelInfoGrid, Select, Tabs } from "@navanta-ai/design-system";
import { ArrowUUpLeft, ArrowsClockwise, Check, X } from "@phosphor-icons/react";
import { useYarn } from "@/context/YarnContext";
import {
  APPROVAL_LABEL,
  CREEL,
  WHOLE_VS_SPLIT,
  type ApprovalRow,
  type GenealogyNode,
} from "@/types/yarn";
import DrillLink from "@/components/ui/DrillLink";
import CreelSequence from "./CreelSequence";

type DeckTab = "formula" | "checks" | "sequence" | "tradeoff" | "origin";

/** Why a person sends a proposal back. A free-text note would be unreadable
 *  in a queue and unusable as a signal to the agent; a fixed reason is both. */
const RETURN_REASONS = [
  "Lab dip not convincing — resubmit",
  "Cost per lb too high for this order",
  "Wrong substrate assumption",
  "Talk to the customer first",
];

/**
 * The approval deck — one proposal, everything Sable checked, and the
 * signature.
 *
 * The same shape as the grade and action decks, with one difference that
 * matters: the primary action is *Approve*, and there is a real second path
 * that isn't undo. Returning a proposal is a decision with a reason attached,
 * because the agent has to learn something from being refused. An undo just
 * pretends the click never happened.
 */
export default function ApprovalDeckModal({
  approval,
  onClose,
}: {
  approval: ApprovalRow;
  onClose: () => void;
}) {
  const { states, approve, returnToAgent, reasons, reset } = useYarn();
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [returning, setReturning] = useState(false);

  const tabs = useMemo(() => {
    const t: { id: DeckTab; label: string }[] = [];
    if (approval.formula) t.push({ id: "formula", label: "The recipe" });
    t.push({ id: "checks", label: "What Sable checked" });
    if (approval.kind === "sequence") t.push({ id: "sequence", label: "Run order" });
    if (approval.kind === "sizing") t.push({ id: "tradeoff", label: "Whole vs split" });
    t.push({ id: "origin", label: "Where it came from" });
    return t;
  }, [approval]);

  const [tab, setTab] = useState<DeckTab>(tabs[0].id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const state = states.get(approval.id);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center"
      style={{ background: "rgba(15, 16, 35, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Approval · ${approval.id}`}
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
          <div className="flex flex-col min-w-0" style={{ gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ds-text-primary)" }}>
              {approval.title}
            </span>
            <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <DrillLink kind={approval.subject.kind} id={approval.subject.id}>
                {approval.subject.label}
              </DrillLink>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                · {APPROVAL_LABEL[approval.kind]} · Sable · {approval.at}
              </span>
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
              <div className="flex flex-col" style={{ gap: 6, padding: "14px 16px" }}>
                <span className="flex items-center" style={{ gap: 8 }}>
                  <AiStar size={16} />
                  <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                    Sable&apos;s read
                  </span>
                </span>
                <p
                  className="type-body"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}
                >
                  {approval.escalation}
                </p>
              </div>

              {state ? (
                <SettledBand
                  state={state}
                  reason={reasons.get(approval.id)}
                  onReset={() => reset(approval.id)}
                />
              ) : returning ? (
                <ReturnBand
                  reason={reason}
                  onReasonChange={setReason}
                  onCancel={() => setReturning(false)}
                  onConfirm={() => {
                    returnToAgent(approval.id, reason);
                    onClose();
                  }}
                />
              ) : (
                <ApproveBand
                  insight={approval.insight}
                  onApprove={() => {
                    approve(approval.id);
                    onClose();
                  }}
                  onReturn={() => setReturning(true)}
                />
              )}
            </section>

            <Tabs
              variant="underline"
              tabs={tabs}
              activeTab={tab}
              onChange={(id) => setTab(id as DeckTab)}
            />

            {tab === "formula" && approval.formula && <Formula lines={approval.formula} />}

            {tab === "checks" && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <PanelInfoGrid
                  title="What Sable checked before proposing"
                  rows={approval.checks.map((c) => ({
                    label: c.label,
                    value: (
                      <span
                        style={{ color: c.pass ? "var(--ds-text-primary)" : "var(--text-danger)" }}
                      >
                        {c.result}
                      </span>
                    ),
                  }))}
                />
                <p
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
                >
                  A failed check isn&apos;t a blocker — it&apos;s the reason this reached you. Sable
                  states what it couldn&apos;t settle rather than hiding it behind a confidence
                  score.
                </p>
              </div>
            )}

            {tab === "sequence" && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <CreelSequence stops={CREEL} />
                <p
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
                >
                  Running light to dark keeps each purge cheap. The last step reverses that to hold
                  a fixed install date, and a full purge is what it costs.
                </p>
              </div>
            )}

            {tab === "tradeoff" && <Tradeoff />}

            {tab === "origin" && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <Genealogy chain={approval.genealogy} />
                <p
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
                >
                  {approval.genealogy.batch
                    ? "This is the chain a claim gets traced back along, months later — which is why what you sign here is worth recording."
                    : "The chain stops at the dye lot because nothing has run yet. Most of what Sable proposes is an instruction for product that doesn't exist, which is exactly why it can't sign it."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Bands ─────────────────────────────────────────────────────────────── */

function ApproveBand({
  insight,
  onApprove,
  onReturn,
}: {
  insight: { headline: string; detail: string };
  onApprove: () => void;
  onReturn: () => void;
}) {
  return (
    <div
      className="flex items-end justify-between flex-wrap"
      style={{ gap: 16, padding: 12, background: "var(--color-iris-100)" }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
          Sable&apos;s recommendation · {insight.detail}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {insight.headline}
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          Sable never approves its own proposal — this one is always yours.
        </span>
      </div>
      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={onReturn}
          iconLeft={<ArrowUUpLeft size={14} weight="bold" />}
        >
          Send back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onApprove}
          iconLeft={<Check size={14} weight="bold" />}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}

function ReturnBand({
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  reason: string;
  onReasonChange: (r: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 10, padding: 12, background: "var(--surface-raised)" }}>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        Sable gets the reason, not just the refusal — that is what it re-proposes against.
      </span>
      <div className="flex items-end justify-between flex-wrap" style={{ gap: 12 }}>
        <div style={{ minWidth: 300, flex: 1, maxWidth: 420 }}>
          <Select value={reason} onValueChange={(v) => onReasonChange(v)} size="sm">
            <Select.Trigger aria-label="Reason for sending it back">
              <Select.Value placeholder="Pick a reason" />
            </Select.Trigger>
            <Select.Content>
              {RETURN_REASONS.map((r) => (
                <Select.Item key={r} value={r}>
                  {r}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            iconLeft={<ArrowUUpLeft size={14} weight="bold" />}
          >
            Send it back
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettledBand({
  state,
  reason,
  onReset,
}: {
  state: "approved" | "returned" | "pending";
  reason?: string;
  onReset: () => void;
}) {
  const approved = state === "approved";
  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{
        gap: 16,
        padding: 12,
        background: approved ? "var(--surface-success)" : "var(--surface-raised)",
      }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span
          className="type-caption"
          style={{ color: approved ? "var(--text-success)" : "var(--ds-text-secondary)" }}
        >
          {approved ? "Approved by you — Sable released it to the floor" : "Sent back to Sable"}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {approved ? "Signed off" : (reason ?? "Returned")}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        iconLeft={<ArrowsClockwise size={14} weight="bold" />}
      >
        Undo
      </Button>
    </div>
  );
}

/* ─── Evidence ──────────────────────────────────────────────────────────── */

/**
 * The recipe, standard against proposed.
 *
 * Unchanged lines are kept and shown flat. A diff that only lists what moved
 * reads as "three things changed"; the full recipe with three things moved
 * reads as "most of this is the recipe you already trust" — which is the
 * actual argument for signing it.
 */
function Formula({ lines }: { lines: ReadonlyArray<{ dyestuff: string; standard: string; proposed: string; delta?: string }> }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--surface-raised)" }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1fr 96px 96px 84px",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        {["Dyestuff", "Standard", "Proposed", "Change"].map((h, i) => (
          <span
            key={h}
            className="type-caption"
            style={{ color: "var(--ds-text-secondary)", textAlign: i === 0 ? "left" : "right" }}
          >
            {h}
          </span>
        ))}
      </div>
      {lines.map((l, i) => (
        <div
          key={l.dyestuff}
          className="grid"
          style={{
            gridTemplateColumns: "1fr 96px 96px 84px",
            gap: 12,
            padding: "11px 16px",
            borderBottom: i < lines.length - 1 ? "1px solid var(--border-light)" : undefined,
          }}
        >
          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
            {l.dyestuff}
          </span>
          <span
            className="type-body"
            style={{
              textAlign: "right",
              color: "var(--ds-text-secondary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {l.standard}
          </span>
          <span
            className="type-body"
            style={{
              textAlign: "right",
              fontWeight: l.delta ? 600 : 400,
              color: "var(--ds-text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {l.proposed}
          </span>
          <span
            className="type-body"
            style={{
              textAlign: "right",
              color: l.delta ? "var(--color-iris-700)" : "var(--ds-text-placeholder, var(--text-muted))",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {l.delta ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Whole against split, read-only.
 *
 * The decision itself lives in Make, where it has a cost and a button. This
 * is the yarn-side arithmetic behind it. Two surfaces offering the same
 * decision is how a demo loses a room — and how a real user ends up making it
 * twice.
 */
function Tradeoff() {
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TradeoffCard
          title="Keep whole"
          tag="RECOMMENDED"
          tone="success"
          points={WHOLE_VS_SPLIT.whole}
        />
        <TradeoffCard title="Split across two dye runs" tag="RISK" tone="danger" points={WHOLE_VS_SPLIT.split} />
      </div>
      <p className="type-caption" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}>
        These are the numbers behind Rowan&apos;s Option A and B. The call is made on Make, where it
        carries a changeover cost — Sable only sizes what the call implies.
      </p>
    </div>
  );
}

function TradeoffCard({
  title,
  tag,
  tone,
  points,
}: {
  title: string;
  tag: string;
  tone: "success" | "danger";
  points: ReadonlyArray<string>;
}) {
  const ink = tone === "success" ? "var(--text-success)" : "var(--text-danger)";
  return (
    <div
      className="flex flex-col"
      style={{
        gap: 8,
        padding: 14,
        borderRadius: 12,
        background: tone === "success" ? "var(--surface-success)" : "var(--surface-danger)",
      }}
    >
      <span className="flex items-baseline justify-between" style={{ gap: 12 }}>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {title}
        </span>
        <span
          style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 600, color: ink }}
        >
          {tag}
        </span>
      </span>
      <span className="flex flex-col" style={{ gap: 5 }}>
        {points.map((p) => (
          <span key={p} className="flex" style={{ gap: 8 }}>
            <span aria-hidden="true" style={{ color: "var(--ds-text-secondary)" }}>
              –
            </span>
            <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
              {p}
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * The lot chain behind one proposal, as a spine.
 *
 * An id in a box tells you nothing the row above didn't, so each stage carries
 * what it actually is — how much fibre arrived, how much was committed, what
 * came off the line. The stages sit on a shared rule so the chain reads as one
 * continuous thing rather than three cards that happen to be adjacent.
 *
 * The chain is drawn forward, the order it was made in. The copy handles the
 * fact that a claim walks it backwards.
 *
 * Per-approval, not page-level: each proposal is built from a different yarn
 * lot, so one chain on the page would be true of a single row and quietly
 * wrong for the rest. A stage that hasn't happened is dashed and says so —
 * most of what Sable proposes is an instruction for product that doesn't
 * exist, and the gap is the point rather than an omission.
 */
function Genealogy({ chain }: { chain: ApprovalRow["genealogy"] }) {
  const stages: Array<{
    label: string;
    kind: "yarn" | "dyelot" | "batch";
    node?: GenealogyNode;
  }> = [
    { label: "Yarn lot", kind: "yarn", node: chain.yarn },
    { label: "Dye lot", kind: "dyelot", node: chain.dyeLot },
    { label: "Batch", kind: "batch", node: chain.batch },
  ];

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: 0 }}
    >
      {stages.map((s, i) => {
        const done = Boolean(s.node);
        const first = i === 0;
        const last = i === stages.length - 1;
        return (
          <div key={s.label} className="flex flex-col" style={{ gap: 10 }}>
            {/* The spine. Half-width rules at the ends keep the line from
                overhanging the first and last node. */}
            <div className="relative flex items-center" style={{ height: 11 }}>
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  left: first ? "50%" : 0,
                  right: last ? "50%" : 0,
                  height: 1,
                  background: "var(--border-default)",
                }}
              />
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: done ? "var(--color-iris-500, #7C5CFF)" : "var(--surface-base)",
                  boxShadow: done
                    ? "0 0 0 3px var(--color-iris-100)"
                    : "inset 0 0 0 1px var(--border-default)",
                }}
              />
            </div>

            <div
              className="flex flex-col"
              style={{
                gap: 3,
                marginRight: last ? 0 : 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: done ? "var(--surface-raised)" : "transparent",
                border: done ? "1px solid transparent" : "1px dashed var(--border-default)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ds-text-placeholder, var(--text-muted))",
                }}
              >
                {s.label}
              </span>
              {s.node ? (
                <>
                  <DrillLink kind={s.kind} id={s.node.id} />
                  <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                    {s.node.note}
                  </span>
                </>
              ) : (
                <>
                  <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
                    Not run yet
                  </span>
                  <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                    Nothing exists to trace until this is approved
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

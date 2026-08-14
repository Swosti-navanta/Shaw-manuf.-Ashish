"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button, Select, Tabs } from "@navanta-ai/design-system";
import { ArrowUUpLeft, ArrowsClockwise, Check, X } from "@phosphor-icons/react";
import { useYarn } from "@/context/YarnContext";
import { APPROVAL_LABEL, type ApprovalRow } from "@/types/yarn";
import DrillLink from "@/components/ui/DrillLink";
import { PackageAlignment, LotTracebility, ThreadingSetUp } from "./CreelPlanPanels";
import {
  ApprovalQueuePanel,
  CreelUtilisation,
  LotToOrderMapping,
  RunOutSpreadPanel,
} from "./YarnLotPanels";

/** The panels a deck can show.
 *
 *  Modal 1 (yarn lot) and Modal 2 (creel plan) are the same shell over two
 *  disjoint tab sets — the header, Sable's read and the signature band are
 *  identical, and only the evidence differs. One component with two tab sets
 *  rather than two modals: the approve/return wiring is the part that must not
 *  drift, and duplicating it is how it does. */
type DeckTab =
  // Modal 1 · Yarn Lot
  | "mapping"
  | "utilisation"
  | "spread"
  | "queue"
  // Modal 2 · Creel Plan
  | "alignment"
  | "threading"
  | "trace";

const YARN_LOT_TABS: { id: DeckTab; label: string }[] = [
  { id: "mapping", label: "Lot to Order Mapping" },
  { id: "utilisation", label: "Creel Utilisation" },
  { id: "spread", label: "Run-Out Spread & Waste" },
  { id: "queue", label: "Approval Queue" },
];

const CREEL_PLAN_TABS: { id: DeckTab; label: string }[] = [
  { id: "alignment", label: "Package Alignment" },
  { id: "threading", label: "Threading Set-Up" },
  { id: "trace", label: "Lot Tracebility" },
];

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

  const tabs = approval.family === "creelplan" ? CREEL_PLAN_TABS : YARN_LOT_TABS;

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

            {/* Modal 1 · Yarn Lot */}
            {tab === "mapping" && <LotToOrderMapping />}
            {tab === "utilisation" && <CreelUtilisation />}
            {tab === "spread" && <RunOutSpreadPanel />}
            {tab === "queue" && <ApprovalQueuePanel />}

            {/* Modal 2 · Creel Plan */}
            {tab === "alignment" && <PackageAlignment />}
            {tab === "threading" && <ThreadingSetUp />}
            {tab === "trace" && <LotTracebility />}
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


"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button, DataTable, Tabs, type DataTableColumn } from "@navanta-ai/design-system";
import { ArrowCounterClockwise, Check, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { useChatPanel } from "@/context/ChatPanelContext";
import { DISMISS_REASONS, usePcard, type DismissReason } from "@/context/PcardContext";
import { NEEDS_REVIEW } from "@/data/pcard";
import { reviewStatementTask } from "@/data/pcard-flows";
import {
  getStatement,
  type Finding,
  type HistoryEvent,
  type Statement,
  type StatementDocument,
  type Transaction,
} from "@/data/pcard-statements";
import StatusChip, { type ChipTone } from "./StatusChip";

type Tab = "findings" | "transactions" | "documents" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "findings", label: "Findings" },
  { id: "transactions", label: "Transactions" },
  { id: "documents", label: "Documents" },
  { id: "history", label: "History" },
];

/**
 * The statement, opened. The one work object: everything the auditor needs to
 * decide lives inside it — the agent's read, the proposed findings with their
 * evidence and policy basis, every transaction, every document (including the
 * ones that aren't there), and the trail of who did what.
 *
 * Decisions are made here, on the finding row, and each one has to be pressed:
 * confirm records it, dismiss demands a reason first. Complete audit stays
 * disabled until every proposed finding has one — the surface cannot be
 * finished around an open question.
 */
export default function StatementReviewModal() {
  const { openId, closeStatement } = usePcard();
  if (!openId) return null;
  const st = getStatement(openId);
  if (!st) return null;
  if (typeof document === "undefined") return null;
  return createPortal(<ModalBody st={st} onClose={closeStatement} />, document.body);
}

function ModalBody({ st, onClose }: { st: Statement; onClose: () => void }) {
  const { record, returnStatement, completeAudit } = usePcard();
  const { startTask } = useChatPanel();
  const [tab, setTab] = useState<Tab>("findings");
  const rec = record(st.id);

  const decided = st.findings.filter((f) => rec.decisions[f.id]);
  const confirmed = st.findings.filter((f) => rec.decisions[f.id]?.kind === "confirmed");
  const open = st.findings.length - decided.length;
  const allDecided = open === 0;
  const done = Boolean(rec.outcome);

  const stateChip: { tone: ChipTone; label: string } = rec.outcome
    ? rec.outcome.kind === "returned"
      ? { tone: "waiting", label: "Awaiting cardholder" }
      : rec.outcome.kind === "completed_with_finding"
        ? { tone: "neutral", label: "Completed · with finding" }
        : { tone: "success", label: "Completed · no finding" }
    : { tone: "major", label: "Needs review" };

  // The review run for this statement — the same one the queue row starts.
  const askAi = () => {
    const row = NEEDS_REVIEW.find((r) => r.statement === st.id);
    if (row) startTask(reviewStatementTask(row));
  };

  const requested = confirmed
    .map((f) => (f.id === "F-01" ? `receipts for lines ${f.lines.join(", ")}` : `an improved purpose for line ${f.lines.join(", ")}`))
    .join(" and ");

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center"
      style={{ background: "rgba(15, 16, 35, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stmt-title"
        aria-describedby="stmt-summary"
        className="relative mt-6 mb-6 mx-4 w-full max-w-[980px] rounded-[20px] flex flex-col overflow-hidden"
        style={{
          background: "var(--surface-base)",
          boxShadow: "var(--shadow-modal, 0 24px 60px rgba(15,16,35,.28))",
          maxHeight: "calc(100vh - 48px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — the statement named the way an auditor says it. */}
        <div
          className="flex items-start justify-between shrink-0"
          style={{ gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex flex-col min-w-0" style={{ gap: 6 }}>
            <span className="flex items-center flex-wrap" style={{ gap: 10 }}>
              <span id="stmt-title" style={{ fontSize: 18, fontWeight: 600, color: "var(--ds-text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {st.id}
              </span>
              <StatusChip tone={stateChip.tone}>{stateChip.label}</StatusChip>
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
              {st.cardholder} · {st.plantDept} · {st.cycle} · {st.total}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} weight="bold" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col" style={{ padding: 20, gap: 16 }}>
            {/* The agent's read — lavender, starred, and honest about what it
                could not verify. */}
            <section
              className="flex flex-col"
              style={{ borderRadius: 12, border: "1px solid var(--color-iris-200)", background: "var(--color-iris-50)", overflow: "hidden" }}
            >
              <div className="flex flex-col" style={{ gap: 10, padding: "14px 16px" }}>
                <span className="flex items-center" style={{ gap: 8 }}>
                  <AiStar size={16} />
                  <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                    P-Card Audit Agent
                  </span>
                </span>
                <p id="stmt-summary" className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
                  {st.summary}
                </p>
                <div className="flex flex-wrap" style={{ gap: 8 }}>
                  <Tile label="Transactions" value={String(st.transactionCount)} />
                  <Tile label="Statement total" value={st.total} />
                  <Tile label="Proposed findings" value={String(st.findings.length)} alert={open > 0} />
                  <Tile label="Cycle status" value={done ? "Closed" : "Open"} />
                  <Tile label="Approved by" value={`${st.approvedBy} · ${st.approvedOn.replace(" 2026", "")}`} />
                </div>
              </div>

              {/* Action-needed strip — what stands between here and done. */}
              <div
                className="flex items-center justify-between flex-wrap"
                style={{
                  gap: 12,
                  padding: "10px 16px",
                  borderTop: "1px solid var(--color-iris-200)",
                  background: done ? "var(--surface-success)" : open > 0 ? "var(--surface-warning, #FEF6E7)" : "var(--surface-success)",
                }}
              >
                <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                  {done
                    ? `${stateChip.label} · ${rec.outcome!.at}`
                    : open > 0
                      ? `Resolve ${open === st.findings.length ? (open === 1 ? "the" : "both") : `the remaining ${open}`} proposed ${open === 1 ? "finding" : "findings"} before completing this audit.`
                      : "Every finding has a decision. This audit can be completed."}
                </span>
                {!done && (
                  <Button variant="primary" size="sm" onClick={askAi} iconLeft={<AiStar size={14} />}>
                    Review with AI
                  </Button>
                )}
              </div>
            </section>

            <Tabs variant="underline" tabs={TABS} activeTab={tab} onChange={(id) => setTab(id as Tab)} />

            {tab === "findings" && <FindingsTab st={st} locked={done} />}
            {tab === "transactions" && <TransactionsTab st={st} />}
            {tab === "documents" && <DocumentsTab st={st} />}
            {tab === "history" && <HistoryTab st={st} extra={rec.events} />}
          </div>
        </div>

        {/* Footer — Close, Ask AI, and the one contextual primary. Complete
            stays disabled until every proposed finding has a decision. */}
        <div
          className="flex items-center justify-between flex-wrap shrink-0"
          style={{ gap: 10, padding: "12px 20px", borderTop: "1px solid var(--border-default)", background: "var(--surface-raised)" }}
        >
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {done
              ? "Read-only · this audit is closed."
              : allDecided
                ? confirmed.length > 0
                  ? "Confirmed findings can be returned to the cardholder, or the audit completed with them recorded."
                  : "Nothing confirmed — the audit completes with no finding."
                : `${open} of ${st.findings.length} proposed ${open === 1 ? "finding" : "findings"} still ${open === 1 ? "needs" : "need"} a decision.`}
          </span>
          <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" size="sm" onClick={askAi} iconLeft={<AiStar size={14} />}>
              Ask AI
            </Button>
            {!done && confirmed.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => returnStatement(st.id, requested)}
                iconLeft={<PaperPlaneTilt size={14} weight="bold" />}
                title={`Request ${requested} — removes this from your queue until reapproval`}
              >
                Return statement
              </Button>
            )}
            {!done && (
              <Button
                variant="primary"
                size="sm"
                disabled={!allDecided}
                onClick={() => completeAudit(st.id, confirmed.length > 0)}
                iconLeft={<Check size={14} weight="bold" />}
                title={allDecided ? undefined : "Every proposed finding needs a decision first"}
              >
                Complete audit
              </Button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <span
      className="flex flex-col"
      style={{ flex: "1 1 0", minWidth: 120, gap: 2, padding: 8, background: "var(--surface-base)", border: "1px solid var(--color-iris-200)", borderRadius: 8 }}
    >
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)", whiteSpace: "nowrap" }}>{label}</span>
      <span className="type-body font-semibold" style={{ color: alert ? "var(--text-danger)" : "var(--ds-text-primary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </span>
  );
}

/* ─── Findings ──────────────────────────────────────────────────────────── */

function FindingsTab({ st, locked }: { st: Statement; locked: boolean }) {
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {st.findings.map((f) => (
        <FindingRow key={f.id} st={st} f={f} locked={locked} />
      ))}
    </div>
  );
}

/**
 * One proposed finding — evidence and policy first, then the decision. The
 * confirm step surfaces what the spec says must be seen before confirming
 * (evidence, clause, category, severity, root cause, amount, uncertainty);
 * dismiss won't fire without a reason, because the reason is what feeds
 * rule-precision reporting.
 */
function FindingRow({ st, f, locked }: { st: Statement; f: Finding; locked: boolean }) {
  const { decision, confirmFinding, dismissFinding, undoDecision } = usePcard();
  const d = decision(st.id, f.id);
  const [mode, setMode] = useState<"idle" | "confirm" | "dismiss">("idle");
  const [reason, setReason] = useState<DismissReason | "">("");
  const [note, setNote] = useState("");

  const chip: { tone: ChipTone; label: string } = d
    ? d.kind === "confirmed"
      ? { tone: "major", label: "Confirmed" }
      : { tone: "neutral", label: "Dismissed" }
    : { tone: "ai", label: "Proposed" };

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${d?.kind === "confirmed" ? "var(--border-danger, #FDA29B)" : "var(--border-default)"}`, overflow: "hidden" }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12, padding: "12px 14px" }}>
        <div className="flex flex-col min-w-0" style={{ gap: 4, flex: "1 1 320px" }}>
          <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{f.id}</span>
            <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>{f.proposed}</span>
            <StatusChip tone={f.severity === "Major" ? "major" : "minor"}>{f.severity}</StatusChip>
            <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{f.category} · {f.affected}</span>
          <Kv k="Evidence" v={f.evidence} />
          <Kv k="Policy" v={f.policy} />
          {f.uncertainty && <Kv k="Uncertainty" v={f.uncertainty} tone="warn" />}
          {d && (
            <span className="type-caption" style={{ color: d.kind === "confirmed" ? "var(--text-danger)" : "var(--ds-text-secondary)" }}>
              {d.kind === "confirmed" ? `Confirmed and recorded · C. Nance · ${d.at}` : `Dismissed · ${d.reason}${d.note ? ` · ${d.note}` : ""} · ${d.at}`}
            </span>
          )}
        </div>

        {!locked && (
          <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
            {d ? (
              <Button variant="outline" size="sm" onClick={() => undoDecision(st.id, f.id)} iconLeft={<ArrowCounterClockwise size={14} weight="bold" />}>
                Reopen
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setMode(mode === "dismiss" ? "idle" : "dismiss")} aria-expanded={mode === "dismiss"}>
                  Dismiss
                </Button>
                <Button variant="primary" size="sm" onClick={() => setMode(mode === "confirm" ? "idle" : "confirm")} aria-expanded={mode === "confirm"} iconLeft={<Check size={14} weight="bold" />}>
                  Confirm
                </Button>
              </>
            )}
          </span>
        )}
      </div>

      {/* Confirm step — everything to be seen before recording it. */}
      {mode === "confirm" && !d && (
        <div className="flex flex-col" style={{ gap: 8, padding: "12px 14px", borderTop: "1px solid var(--border-default)", background: "var(--color-iris-50)" }}>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Before I record it</span>
          <div className="grid" style={{ gap: 6, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <Kv k="Evidence checked" v={f.evidence} />
            <Kv k="Policy clause" v={f.policy} />
            <Kv k="Proposed category" v={f.category} />
            <Kv k="Proposed severity" v={f.severity} />
            <Kv k="Suggested root cause" v={f.rootCause} />
            <Kv k="Affected amount" v={f.affected} />
          </div>
          {f.uncertainty && <Kv k="Uncertainty" v={f.uncertainty} tone="warn" />}
          <span className="flex items-center justify-end flex-wrap" style={{ gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setMode("idle")}>Cancel</Button>
            <Button variant="outline" size="sm" disabled title="Classification editing lands with Finding configuration">Edit classification</Button>
            <Button variant="primary" size="sm" iconLeft={<Check size={14} weight="bold" />} onClick={() => { confirmFinding(st.id, f.id, f.evidence); setMode("idle"); }}>
              Confirm and record
            </Button>
          </span>
        </div>
      )}

      {/* Dismiss step — a reason is required; it updates rule precision. */}
      {mode === "dismiss" && !d && (
        <div className="flex flex-col" style={{ gap: 8, padding: "12px 14px", borderTop: "1px solid var(--border-default)", background: "var(--surface-raised)" }}>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            Why doesn&apos;t this stand? The reason updates rule-precision reporting — a rule dismissed often enough gets its threshold reviewed.
          </span>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {DISMISS_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={reason === r}
                className="type-caption transition-colors"
                style={{ padding: "5px 10px", borderRadius: 999, cursor: "pointer", background: reason === r ? "var(--ds-text-primary)" : "var(--surface-base)", color: reason === r ? "var(--surface-base)" : "var(--ds-text-primary)", border: "1px solid var(--border-default)" }}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note (optional)"
            aria-label="Dismissal note"
            className="type-body"
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--surface-base)", color: "var(--ds-text-primary)", outline: "none" }}
          />
          <span className="flex items-center justify-end flex-wrap" style={{ gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => { setMode("idle"); setReason(""); setNote(""); }}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!reason} onClick={() => { if (reason) { dismissFinding(st.id, f.id, reason, note || undefined); setMode("idle"); } }}>
              Dismiss finding
            </Button>
          </span>
        </div>
      )}
    </div>
  );
}

function Kv({ k, v, tone }: { k: string; v: string; tone?: "warn" }) {
  return (
    <span className="flex flex-col" style={{ gap: 1 }}>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</span>
      <span className="type-caption" style={{ color: tone === "warn" ? "var(--text-warning, #B7791F)" : "var(--ds-text-primary)", lineHeight: 1.45 }}>{v}</span>
    </span>
  );
}

/* ─── Transactions ──────────────────────────────────────────────────────── */

const RESULT_TONE: Record<Transaction["result"], ChipTone> = {
  Passed: "success",
  "No receipt": "major",
  "Purpose inadequate": "minor",
  Flagged: "minor",
};

function TransactionsTab({ st }: { st: Statement }) {
  const cols: DataTableColumn<Transaction>[] = [
    { key: "line", label: "Line", width: 56, alwaysVisible: true, cell: (r) => <Mono>{r.line}</Mono> },
    { key: "merchant", label: "Merchant", minWidth: 140, cell: (r) => <Body>{r.merchant}</Body> },
    { key: "date", label: "Date", width: 112, cell: (r) => <Mono>{r.date}</Mono> },
    { key: "type", label: "Expense type", width: 110, cell: (r) => <Body muted>{r.type}</Body> },
    { key: "purpose", label: "Business purpose", minWidth: 190, cell: (r) => <Body muted={r.result === "Purpose inadequate"}>{r.purpose}</Body> },
    { key: "amount", label: "Amount", width: 90, align: "right", cell: (r) => <Mono>{r.amount}</Mono> },
    { key: "tax", label: "Tax", width: 70, align: "right", cell: (r) => <Mono>{r.tax}</Mono> },
    { key: "receipt", label: "Receipt", width: 96, cell: (r) => <StatusChip tone={r.receipt === "Missing" ? "major" : "neutral"}>{r.receipt}</StatusChip> },
    { key: "attendees", label: "Attendees", width: 84, align: "right", cell: (r) => <Mono>{r.attendees ?? "—"}</Mono> },
    { key: "result", label: "Check result", width: 140, cell: (r) => <StatusChip tone={RESULT_TONE[r.result]}>{r.result}</StatusChip> },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border-default)", overflow: "auto" }}>
      <DataTable<Transaction> columns={cols} data={[...st.transactions]} rowKey={(r) => String(r.line)} rowHeight={48} rowBorderColor="#F1F3F5" />
    </div>
  );
}

/* ─── Documents ─────────────────────────────────────────────────────────── */

function DocumentsTab({ st }: { st: Statement }) {
  const cols: DataTableColumn<StatementDocument>[] = [
    { key: "name", label: "Document", minWidth: 220, alwaysVisible: true, cell: (r) => <Body>{r.name}</Body> },
    { key: "line", label: "Related line", width: 100, align: "right", cell: (r) => <Mono>{r.line ?? "—"}</Mono> },
    { key: "date", label: "Date", width: 112, cell: (r) => <Mono>{r.date}</Mono> },
    { key: "type", label: "Type", width: 100, cell: (r) => <Body muted>{r.type}</Body> },
    { key: "extraction", label: "Extraction", width: 110, cell: (r) => <Body muted>{r.extraction}</Body> },
    // Never a broken attachment: a missing receipt reads as Missing.
    { key: "avail", label: "Availability", width: 110, cell: (r) => <StatusChip tone={r.availability === "Missing" ? "major" : "success"}>{r.availability}</StatusChip> },
    {
      key: "action", label: "Action", width: 110, align: "right",
      cell: (r) => (
        <span className="flex justify-end">
          <Button variant="outline" size="sm" disabled={r.availability === "Missing"} title={r.availability === "Missing" ? "Nothing on file to open" : undefined}>
            {r.availability === "Missing" ? "Request" : "Open"}
          </Button>
        </span>
      ),
    },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border-default)", overflow: "auto" }}>
      <DataTable<StatementDocument> columns={cols} data={[...st.documents]} rowKey={(r) => r.name} rowHeight={48} rowBorderColor="#F1F3F5" />
    </div>
  );
}

/* ─── History ───────────────────────────────────────────────────────────── */

function HistoryTab({ st, extra }: { st: Statement; extra: HistoryEvent[] }) {
  const rows = [...st.history, ...extra];
  const cols: DataTableColumn<HistoryEvent>[] = [
    { key: "event", label: "Event", minWidth: 170, alwaysVisible: true, cell: (r) => <Body>{r.event}</Body> },
    { key: "actor", label: "Actor", width: 160, cell: (r) => <Body muted>{r.actor}</Body> },
    { key: "at", label: "Timestamp", width: 170, cell: (r) => <Mono>{r.at}</Mono> },
    { key: "result", label: "Result", minWidth: 200, cell: (r) => <Body muted>{r.result}</Body> },
  ];
  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border-default)", overflow: "auto" }}>
      <DataTable<HistoryEvent> columns={cols} data={rows} rowKey={(r) => `${r.event}-${r.at}`} rowHeight={48} rowBorderColor="#F1F3F5" />
    </div>
  );
}

const Body = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <span className="type-body" style={{ color: muted ? "var(--ds-text-secondary)" : "var(--ds-text-primary)" }}>{children}</span>
);
const Mono = ({ children }: { children: React.ReactNode }) => (
  <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>{children}</span>
);

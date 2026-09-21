"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListChecks } from "@phosphor-icons/react";
import {
  Button,
  DataTable,
  EmptyState,
  PageHeading,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { useChatPanel } from "@/context/ChatPanelContext";
import {
  ACTION_TABS,
  NEEDS_REVIEW,
  READY_ROWS,
  RETURNED_ROWS,
  type ActionTab,
  type NeedsReviewRow,
  type ReadyRow,
  type ReturnedRow,
} from "@/data/pcard";
import StatusChip, { type ChipTone } from "../_components/StatusChip";

/**
 * Action Center — work that requires a decision from the auditor.
 *
 * Three queues on three clocks: what needs a first review, what's parked with
 * a cardholder or a manager, and what's come back corrected and needs to be
 * checked again. The tab is in the URL so a KPI on the Command Center can
 * land on the right queue, and so the link survives a refresh.
 *
 * `useSearchParams` bails out of prerendering without a Suspense boundary, so
 * the default export is the boundary and the queue is its child — the same
 * shape Make uses, for the same build-time reason.
 */
export default function PcardActionCenter() {
  return (
    <Suspense fallback={null}>
      <ActionQueue />
    </Suspense>
  );
}

const isTab = (v: string | null): v is ActionTab =>
  v === "needs-review" || v === "returned" || v === "ready";

function ActionQueue() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openChat } = useChatPanel();

  const urlTab = searchParams.get("tab");
  const [tab, setTab] = useState<ActionTab>(isTab(urlTab) ? urlTab : "needs-review");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // The tab lives in the URL: a KPI deep-links to a queue, and the back
  // button returns to the one you came from.
  const goTab = (next: ActionTab) => {
    setTab(next);
    setPage(1);
    router.replace(`/p-card/actions?tab=${next}`);
  };

  // A row action opens the agent alongside the object — it prepares the
  // review, it doesn't execute anything. Confirmation stays with Carol.
  const review = () => openChat();

  const total =
    tab === "needs-review" ? NEEDS_REVIEW.length : tab === "returned" ? RETURNED_ROWS.length : READY_ROWS.length;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading title="Action Center" subtitle="Work that requires a decision from you." />

      <TableShell
        title="Queue"
        icon={ListChecks}
        totalItems={total}
        currentPage={page}
        onPageChange={setPage}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        tabs={ACTION_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          badge: t.count,
          tone: t.id === "needs-review" ? ("critical" as const) : undefined,
        }))}
        activeTab={tab}
        onTabChange={(id) => goTab(id as ActionTab)}
        emptyState={
          <EmptyState
            icon={<ListChecks weight="duotone" style={{ width: 24, height: 24 }} />}
            title="Nothing waiting on you"
            description="Every statement in this queue has been actioned."
          />
        }
      >
        {tab === "needs-review" && <NeedsReviewTable onReview={review} />}
        {tab === "returned" && <ReturnedTable onCheck={review} />}
        {tab === "ready" && <ReadyTable onReaudit={review} />}
      </TableShell>
    </div>
  );
}

/* ─── Cells ─────────────────────────────────────────────────────────────── */

function StatementCell({
  statement,
  cardholder,
  onOpen,
}: {
  statement: string;
  cardholder: string;
  onOpen: () => void;
}) {
  return (
    <span className="flex flex-col" style={{ gap: 2 }}>
      <button
        type="button"
        onClick={onOpen}
        className="type-body font-medium text-left hover:underline"
        style={{
          background: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--link-color)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {statement}
      </button>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        {cardholder}
      </span>
    </span>
  );
}

const Body = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <span className="type-body" style={{ color: muted ? "var(--ds-text-secondary)" : "var(--ds-text-primary)" }}>
    {children}
  </span>
);

const Num = ({ children }: { children: React.ReactNode }) => (
  <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>
    {children}
  </span>
);

const SEVERITY_TONE: Record<NeedsReviewRow["severity"], ChipTone> = { Major: "major", Minor: "minor" };

/* ─── Needs review ──────────────────────────────────────────────────────── */

function NeedsReviewTable({ onReview }: { onReview: () => void }) {
  const columns = useMemo<DataTableColumn<NeedsReviewRow>[]>(
    () => [
      {
        key: "statement",
        label: "Statement / cardholder",
        alwaysVisible: true,
        minWidth: 180,
        stopRowClick: true,
        cell: (r) => <StatementCell statement={r.statement} cardholder={r.cardholder} onOpen={onReview} />,
      },
      { key: "plant", label: "Plant / department", minWidth: 160, cell: (r) => <Body>{r.plantDept}</Body> },
      { key: "why", label: "Why selected", minWidth: 140, cell: (r) => <Body muted>{r.whySelected}</Body> },
      { key: "open", label: "Open findings", width: 110, align: "right", cell: (r) => <Num>{r.open}</Num> },
      {
        key: "severity",
        label: "Severity",
        width: 96,
        cell: (r) => <StatusChip tone={SEVERITY_TONE[r.severity]}>{r.severity}</StatusChip>,
      },
      { key: "total", label: "Statement total", width: 120, align: "right", cell: (r) => <Num>{r.total}</Num> },
      { key: "age", label: "Age", width: 64, align: "right", cell: (r) => <Num>{r.age}</Num> },
      {
        key: "action",
        label: "Action",
        width: 96,
        align: "right",
        alwaysVisible: true,
        stopRowClick: true,
        cell: () => (
          <span className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onReview}>
              Review
            </Button>
          </span>
        ),
      },
    ],
    [onReview],
  );

  return (
    <DataTable<NeedsReviewRow>
      columns={columns}
      data={[...NEEDS_REVIEW]}
      rowKey={(r) => r.statement}
      rowHeight={60}
      rowBorderColor="#F1F3F5"
      onRowClick={onReview}
    />
  );
}

/* ─── Returned ──────────────────────────────────────────────────────────── */

const RETURNED_TONE: Record<ReturnedRow["state"], ChipTone> = {
  "Needs review": "major",
  "Awaiting cardholder": "waiting",
  "Awaiting manager": "waiting",
  "Ready for re-audit": "ai",
  "Auto-cleared": "success",
  "Completed · no finding": "success",
  "Completed · with finding": "neutral",
};

function ReturnedTable({ onCheck }: { onCheck: () => void }) {
  const columns = useMemo<DataTableColumn<ReturnedRow>[]>(
    () => [
      {
        key: "statement",
        label: "Statement / cardholder",
        alwaysVisible: true,
        minWidth: 180,
        stopRowClick: true,
        cell: (r) => <StatementCell statement={r.statement} cardholder={r.cardholder} onOpen={onCheck} />,
      },
      { key: "returned", label: "Returned", width: 120, cell: (r) => <Num>{r.returned}</Num> },
      { key: "finding", label: "Last finding", minWidth: 190, cell: (r) => <Body muted>{r.lastFinding}</Body> },
      {
        key: "state",
        label: "Workflow state",
        minWidth: 150,
        cell: (r) => <StatusChip tone={RETURNED_TONE[r.state]}>{r.state}</StatusChip>,
      },
      { key: "age", label: "Age", width: 64, align: "right", cell: (r) => <Num>{r.age}</Num> },
      { key: "owner", label: "Owner", width: 110, cell: (r) => <Body>{r.owner}</Body> },
      {
        key: "action",
        label: "Action",
        width: 120,
        align: "right",
        alwaysVisible: true,
        stopRowClick: true,
        cell: () => (
          <span className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onCheck}>
              Check status
            </Button>
          </span>
        ),
      },
    ],
    [onCheck],
  );

  return (
    <DataTable<ReturnedRow>
      columns={columns}
      data={[...RETURNED_ROWS]}
      rowKey={(r) => r.statement}
      rowHeight={60}
      rowBorderColor="#F1F3F5"
      onRowClick={onCheck}
    />
  );
}

/* ─── Ready for re-audit ────────────────────────────────────────────────── */

function ReadyTable({ onReaudit }: { onReaudit: () => void }) {
  const columns = useMemo<DataTableColumn<ReadyRow>[]>(
    () => [
      {
        key: "statement",
        label: "Statement / cardholder",
        alwaysVisible: true,
        minWidth: 180,
        stopRowClick: true,
        cell: (r) => <StatementCell statement={r.statement} cardholder={r.cardholder} onOpen={onReaudit} />,
      },
      { key: "orig", label: "Original finding", minWidth: 180, cell: (r) => <Body muted>{r.originalFinding}</Body> },
      { key: "corr", label: "Correction received", minWidth: 150, cell: (r) => <Body>{r.correction}</Body> },
      { key: "reapproved", label: "Reapproved", width: 120, cell: (r) => <Num>{r.reapproved}</Num> },
      { key: "change", label: "Change summary", minWidth: 140, cell: (r) => <Body muted>{r.change}</Body> },
      {
        key: "action",
        label: "Action",
        width: 100,
        align: "right",
        alwaysVisible: true,
        stopRowClick: true,
        cell: () => (
          <span className="flex justify-end">
            <Button variant="primary" size="sm" onClick={onReaudit}>
              Re-audit
            </Button>
          </span>
        ),
      },
    ],
    [onReaudit],
  );

  return (
    <DataTable<ReadyRow>
      columns={columns}
      data={[...READY_ROWS]}
      rowKey={(r) => r.statement}
      rowHeight={60}
      rowBorderColor="#F1F3F5"
      onRowClick={onReaudit}
    />
  );
}

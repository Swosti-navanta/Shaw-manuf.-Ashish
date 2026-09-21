"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "@phosphor-icons/react";
import {
  Button,
  DataTable,
  EmptyState,
  KpiBreakdownCard,
  KpiGrid,
  PageHeading,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { useChatPanel } from "@/context/ChatPanelContext";
import { usePcard } from "@/context/PcardContext";
import { NEEDS_REVIEW, type Severity } from "@/data/pcard";
import { reviewStatementTask } from "@/data/pcard-flows";
import StatusChip, { type ChipTone } from "../_components/StatusChip";

/**
 * Audit Records — what the cycle has already decided.
 *
 * The complement of the Action Center: everything that is done, whether a
 * person finished it or the agent cleared it. Auto-cleared rows say `Agent`
 * in the auditor column on purpose — that 96% is the product's claim, and it
 * should be visible as a column, not buried in a KPI. Statements Carol
 * completes in this session join the list, read-only, from her decisions.
 */
type Tab = "all" | "with-findings" | "no-finding" | "auto-cleared";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All records" },
  { id: "with-findings", label: "With findings" },
  { id: "no-finding", label: "No finding" },
  { id: "auto-cleared", label: "Auto-cleared" },
];

const isTab = (v: string | null): v is Tab =>
  v === "all" || v === "with-findings" || v === "no-finding" || v === "auto-cleared";

interface RecordRow {
  statement: string;
  cardholder: string;
  cycle: string;
  result: "Completed · with finding" | "Completed · no finding" | "Auto-cleared";
  severity: Severity | "—";
  findings: number;
  auditor: string;
  completed: string;
  /** Opens the modal when the statement has a full record; seed-only rows don't. */
  openable: boolean;
}

/** The cycle's closed seed — illustrative, but every row traces to a state. */
const SEED: ReadonlyArray<RecordRow> = [
  { statement: "PC-0826-0011", cardholder: "T. Reyes", cycle: "Aug 2026", result: "Completed · with finding", severity: "Major", findings: 1, auditor: "C. Nance", completed: "15 Sep 2026", openable: false },
  { statement: "PC-0826-0027", cardholder: "N. Ibrahim", cycle: "Aug 2026", result: "Completed · with finding", severity: "Minor", findings: 2, auditor: "C. Nance", completed: "16 Sep 2026", openable: false },
  { statement: "PC-0826-0035", cardholder: "E. Kowalski", cycle: "Aug 2026", result: "Completed · no finding", severity: "—", findings: 0, auditor: "C. Nance", completed: "16 Sep 2026", openable: false },
  { statement: "PC-0826-0003", cardholder: "B. Lindqvist", cycle: "Aug 2026", result: "Auto-cleared", severity: "—", findings: 0, auditor: "Agent", completed: "12 Sep 2026", openable: false },
  { statement: "PC-0826-0004", cardholder: "F. Adeyemi", cycle: "Aug 2026", result: "Auto-cleared", severity: "—", findings: 0, auditor: "Agent", completed: "12 Sep 2026", openable: false },
  { statement: "PC-0826-0006", cardholder: "G. Marchetti", cycle: "Aug 2026", result: "Auto-cleared", severity: "—", findings: 0, auditor: "Agent", completed: "12 Sep 2026", openable: false },
  { statement: "PC-0826-0009", cardholder: "H. Sato", cycle: "Aug 2026", result: "Auto-cleared", severity: "—", findings: 0, auditor: "Agent", completed: "12 Sep 2026", openable: false },
  { statement: "PC-0826-0012", cardholder: "I. Novak", cycle: "Aug 2026", result: "Auto-cleared", severity: "—", findings: 0, auditor: "Agent", completed: "12 Sep 2026", openable: false },
];

export default function PcardAuditRecords() {
  return (
    <Suspense fallback={null}>
      <Records />
    </Suspense>
  );
}

function Records() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startTask } = useChatPanel();
  const { openStatement, record } = usePcard();
  const urlTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(urlTab) ? urlTab : "all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const goTab = (next: Tab) => {
    setTab(next);
    setPage(1);
    router.replace(`/p-card/records?tab=${next}`);
  };

  // Statements Carol completed this session, from her own decisions.
  const completedNow = useMemo<RecordRow[]>(
    () =>
      NEEDS_REVIEW.flatMap((r) => {
        const rec = record(r.statement);
        if (!rec.outcome || rec.outcome.kind === "returned") return [];
        const confirmed = Object.values(rec.decisions).filter((d) => d?.kind === "confirmed").length;
        return [
          {
            statement: r.statement,
            cardholder: r.cardholder,
            cycle: r.statement.startsWith("PC-07") ? "Jul 2026" : "Aug 2026",
            result: rec.outcome.kind === "completed_with_finding" ? "Completed · with finding" : "Completed · no finding",
            severity: confirmed > 0 ? r.severity : "—",
            findings: confirmed,
            auditor: "C. Nance",
            completed: rec.outcome.at.split(" · ")[0],
            openable: true,
          },
        ];
      }),
    [record],
  );

  const all = useMemo(() => [...completedNow, ...SEED], [completedNow]);
  const rows = all.filter((r) =>
    tab === "all"
      ? true
      : tab === "with-findings"
        ? r.result === "Completed · with finding"
        : tab === "no-finding"
          ? r.result === "Completed · no finding"
          : r.result === "Auto-cleared",
  );

  const withFindings = all.filter((r) => r.result === "Completed · with finding").length;
  const humanCleared = all.filter((r) => r.result === "Completed · no finding").length;

  const explain = (r: RecordRow) => {
    const row = NEEDS_REVIEW.find((x) => x.statement === r.statement);
    if (row) startTask(reviewStatementTask(row));
  };

  const columns = useMemo<DataTableColumn<RecordRow>[]>(
    () => [
      {
        key: "statement",
        label: "Statement / cardholder",
        alwaysVisible: true,
        minWidth: 180,
        stopRowClick: true,
        cell: (r) => (
          <span className="flex flex-col" style={{ gap: 2 }}>
            {r.openable ? (
              <button
                type="button"
                onClick={() => openStatement(r.statement)}
                className="type-body font-medium text-left hover:underline"
                style={{ background: "none", padding: 0, cursor: "pointer", color: "var(--link-color)", fontVariantNumeric: "tabular-nums" }}
              >
                {r.statement}
              </button>
            ) : (
              <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)", fontVariantNumeric: "tabular-nums" }} title="Seed record — full statement not loaded in the prototype">
                {r.statement}
              </span>
            )}
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{r.cardholder}</span>
          </span>
        ),
      },
      { key: "cycle", label: "Cycle", width: 100, cell: (r) => <Body muted>{r.cycle}</Body> },
      {
        key: "result", label: "Result", minWidth: 190,
        cell: (r) => <StatusChip tone={RESULT_TONE[r.result]}>{r.result}</StatusChip>,
      },
      {
        key: "severity", label: "Severity", width: 96,
        cell: (r) => r.severity === "—" ? <Body muted>—</Body> : <StatusChip tone={r.severity === "Major" ? "major" : "minor"}>{r.severity}</StatusChip>,
      },
      { key: "findings", label: "Findings", width: 90, align: "right", cell: (r) => <Num>{r.findings}</Num> },
      { key: "auditor", label: "Auditor", width: 110, cell: (r) => <Body muted={r.auditor === "Agent"}>{r.auditor}</Body> },
      { key: "completed", label: "Completed", width: 120, cell: (r) => <Num>{r.completed}</Num> },
      {
        key: "action", label: "Action", width: 96, align: "right", alwaysVisible: true, stopRowClick: true,
        cell: (r) => (
          <span className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => explain(r)} disabled={!r.openable} title={r.openable ? undefined : "Explain needs the full statement record"}>
              Explain
            </Button>
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openStatement],
  );

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading title="Audit Records" subtitle="Every statement this cycle has decided — by a person, or by the agent inside the limits you set." />

      <KpiGrid columns={3} style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <KpiBreakdownCard title="Completed this cycle" value={String(all.length).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} subtitle="human + agent" />
        <KpiBreakdownCard title="Completed with findings" value={String(withFindings)} subtitle="confirmed by an auditor" className={withFindings > 0 ? "kpi-alert" : undefined} />
        <KpiBreakdownCard title="Human-cleared" value={String(humanCleared)} subtitle="reviewed · no finding" />
        <KpiBreakdownCard title="Auto-cleared" value="1,236" subtitle="96.3% · never reached a person" />
      </KpiGrid>

      <TableShell
        title="Records"
        icon={ShieldCheck}
        totalItems={rows.length}
        currentPage={page}
        onPageChange={setPage}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeTab={tab}
        onTabChange={(id) => goTab(id as Tab)}
        emptyState={<EmptyState icon={<ShieldCheck weight="duotone" style={{ width: 24, height: 24 }} />} title="No records here yet" description="Complete an audit from the Action Center and it lands on this list." />}
      >
        <DataTable<RecordRow>
          columns={columns}
          data={rows.slice((page - 1) * pageSize, page * pageSize)}
          rowKey={(r) => r.statement}
          rowHeight={60}
          rowBorderColor="#F1F3F5"
          onRowClick={(r) => { if (r.openable) openStatement(r.statement); }}
        />
      </TableShell>
    </div>
  );
}

const RESULT_TONE: Record<RecordRow["result"], ChipTone> = {
  "Completed · with finding": "neutral",
  "Completed · no finding": "success",
  "Auto-cleared": "success",
};

const Body = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <span className="type-body" style={{ color: muted ? "var(--ds-text-secondary)" : "var(--ds-text-primary)" }}>{children}</span>
);
const Num = ({ children }: { children: React.ReactNode }) => (
  <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>{children}</span>
);

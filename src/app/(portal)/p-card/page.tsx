"use client";

import { useRouter } from "next/navigation";
import { ClipboardText, ArrowCounterClockwise, ChartBar, Sliders } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import {
  Button,
  DataTable,
  KpiBreakdownCard,
  KpiGrid,
  PageHeading,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { useChatPanel } from "@/context/ChatPanelContext";
import { usePersona } from "@/context/PersonaContext";
import { usePcard } from "@/context/PcardContext";
import { reviewStatementTask } from "@/data/pcard-flows";
import {
  FINDINGS_THIS_CYCLE,
  NEEDS_REVIEW,
  PCARD_KPIS,
  PRIORITY_REVIEWS,
  RETURNED_ITEMS,
  RULE_PERFORMANCE,
  type FindingCategory,
  type PriorityReview,
  type ReturnedItem,
  type RulePerformance,
} from "@/data/pcard";
import StatusChip, { type ChipTone } from "./_components/StatusChip";

/**
 * P-Card Command Center — the audit cycle's opening read.
 *
 * Review by exception is the whole claim: every statement is evaluated, the
 * ones that pass clear on their own, and only the 18 that need judgement reach
 * a person. The dashboard summarises; the Action Center routes; the statement
 * modal explains; the agent helps the auditor act. Nothing here finalises,
 * returns or sends — Carol does that, one statement at a time.
 */
export default function PcardCommandCenter() {
  const router = useRouter();
  const { profile } = usePersona();

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading
        title="P-Card Command Center"
        subtitle={`What needs attention this cycle and what the audit agent has completed. ${profile.name} owns every consequential decision.`}
      />

      <KpiGrid columns={3} style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {PCARD_KPIS.map((k) => {
          // A card routes to the surface that owns its figure. The two that
          // point at Audit Records stay put until that surface is built —
          // a card that navigates to nothing teaches people not to click.
          const link = k.href
            ? {
                role: "link" as const,
                tabIndex: 0,
                style: { cursor: "pointer" },
                onClick: () => router.push(k.href!),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(k.href!);
                  }
                },
              }
            : {};
          return (
            <KpiBreakdownCard
              key={k.key}
              title={k.label}
              value={k.value}
              subtitle={k.detail}
              className={k.alert ? "kpi-alert" : undefined}
              {...link}
            />
          );
        })}
      </KpiGrid>

      <div
        className="grid"
        style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", alignItems: "start" }}
      >
        <PriorityReviews />
        <ReturnedAndReaudit />
        <FindingsThisCycle />
        <RulePerformanceCard />
      </div>
    </div>
  );
}

/* ─── Shared card shell ─────────────────────────────────────────────────── */

/** A dashboard card is a TableShell with pagination switched off — one page,
 *  every row, the same chrome as every other table in the portal. */
function DashCard({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: Icon;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <TableShell
      customize={false}
      title={title}
      icon={icon}
      totalItems={count}
      currentPage={1}
      pageSize={count || 1}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
    >
      {children}
    </TableShell>
  );
}

/** Statement id over cardholder — the first column of every audit table. */
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

const SEVERITY_TONE: Record<PriorityReview["severity"], ChipTone> = {
  Major: "major",
  Minor: "minor",
};

/* ─── Priority reviews ──────────────────────────────────────────────────── */

function PriorityReviews() {
  const router = useRouter();
  const { startTask } = useChatPanel();
  const { openStatement } = usePcard();
  // Review starts the agent's run on that statement right here — the same
  // run the Action Center row would start. Falls back to the queue only if
  // the statement isn't in the review seed.
  const openReview = (statement: string) => {
    const row = NEEDS_REVIEW.find((r) => r.statement === statement);
    if (row) startTask(reviewStatementTask(row));
    else router.push(`/p-card/actions?tab=needs-review&statement=${statement}`);
  };

  const columns: DataTableColumn<PriorityReview>[] = [
    {
      key: "statement",
      label: "Statement / cardholder",
      alwaysVisible: true,
      minWidth: 170,
      stopRowClick: true,
      cell: (r) => (
        <StatementCell
          statement={r.statement}
          cardholder={r.cardholder}
          onOpen={() => openStatement(r.statement)}
        />
      ),
    },
    {
      key: "trigger",
      label: "Trigger",
      minWidth: 150,
      cell: (r) => (
        <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
          {r.trigger}
        </span>
      ),
    },
    {
      key: "severity",
      label: "Severity",
      width: 96,
      cell: (r) => <StatusChip tone={SEVERITY_TONE[r.severity]}>{r.severity}</StatusChip>,
    },
    {
      key: "exposure",
      label: "Exposure",
      width: 96,
      align: "right",
      cell: (r) => (
        <span
          className="type-body"
          style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}
        >
          {r.exposure}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: 96,
      align: "right",
      alwaysVisible: true,
      stopRowClick: true,
      cell: (r) => (
        <span className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => openReview(r.statement)}>
            Review
          </Button>
        </span>
      ),
    },
  ];

  return (
    <DashCard title="Priority reviews" icon={ClipboardText} count={PRIORITY_REVIEWS.length}>
      <DataTable<PriorityReview>
        columns={columns}
        data={[...PRIORITY_REVIEWS]}
        rowKey={(r) => r.statement}
        rowHeight={60}
        rowBorderColor="#F1F3F5"
        onRowClick={(r) => openStatement(r.statement)}
      />
    </DashCard>
  );
}

/* ─── Returned and re-audit ─────────────────────────────────────────────── */

const STATE_TONE: Record<ReturnedItem["state"], ChipTone> = {
  "Needs review": "major",
  "Awaiting cardholder": "waiting",
  "Awaiting manager": "waiting",
  "Ready for re-audit": "ai",
  "Auto-cleared": "success",
  "Completed · no finding": "success",
  "Completed · with finding": "neutral",
};

function ReturnedAndReaudit() {
  const router = useRouter();
  const open = (r: ReturnedItem) =>
    router.push(
      `/p-card/actions?tab=${r.state === "Ready for re-audit" ? "ready" : "returned"}&statement=${r.statement}`,
    );

  const columns: DataTableColumn<ReturnedItem>[] = [
    {
      key: "statement",
      label: "Statement / cardholder",
      alwaysVisible: true,
      minWidth: 170,
      stopRowClick: true,
      cell: (r) => (
        <StatementCell statement={r.statement} cardholder={r.cardholder} onOpen={() => open(r)} />
      ),
    },
    {
      key: "state",
      label: "Workflow state",
      minWidth: 150,
      cell: (r) => <StatusChip tone={STATE_TONE[r.state]}>{r.state}</StatusChip>,
    },
    {
      key: "since",
      label: "Since",
      width: 70,
      cell: (r) => (
        <span className="type-body" style={{ fontVariantNumeric: "tabular-nums" }}>
          {r.since}
        </span>
      ),
    },
    {
      key: "next",
      label: "Next action",
      minWidth: 150,
      cell: (r) => (
        <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
          {r.next}
        </span>
      ),
    },
  ];

  return (
    <DashCard title="Returned and re-audit" icon={ArrowCounterClockwise} count={RETURNED_ITEMS.length}>
      <DataTable<ReturnedItem>
        columns={columns}
        data={[...RETURNED_ITEMS]}
        rowKey={(r) => r.statement}
        rowHeight={60}
        rowBorderColor="#F1F3F5"
        onRowClick={open}
      />
    </DashCard>
  );
}

/* ─── Findings this cycle ───────────────────────────────────────────────── */

function TrendGlyph({ trend }: { trend: FindingCategory["trend"] }) {
  // Up is bad here — more confirmed findings — so the arrow takes the danger
  // colour, and down takes success. Flat stays quiet.
  const color =
    trend === "up" ? "var(--text-danger)" : trend === "down" ? "var(--text-success)" : "var(--ds-text-secondary)";
  return (
    <span className="type-body" style={{ color, fontVariantNumeric: "tabular-nums" }} aria-label={`trend ${trend}`}>
      {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
    </span>
  );
}

function FindingsThisCycle() {
  const columns: DataTableColumn<FindingCategory>[] = [
    {
      key: "category",
      label: "Category",
      alwaysVisible: true,
      minWidth: 190,
      cell: (r) => (
        <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
          {r.category}
        </span>
      ),
    },
    {
      key: "confirmed",
      label: "Confirmed",
      width: 96,
      align: "right",
      cell: (r) => (
        <span className="type-body" style={{ fontVariantNumeric: "tabular-nums" }}>
          {r.confirmed}
        </span>
      ),
    },
    {
      key: "share",
      label: "Share",
      width: 80,
      align: "right",
      cell: (r) => (
        <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-secondary)" }}>
          {r.share}
        </span>
      ),
    },
    {
      key: "trend",
      label: "Trend",
      width: 70,
      align: "right",
      cell: (r) => <TrendGlyph trend={r.trend} />,
    },
  ];

  return (
    <DashCard title="Findings this cycle" icon={ChartBar} count={FINDINGS_THIS_CYCLE.length}>
      <DataTable<FindingCategory>
        columns={columns}
        data={[...FINDINGS_THIS_CYCLE]}
        rowKey={(r) => r.category}
        rowHeight={52}
        rowBorderColor="#F1F3F5"
      />
    </DashCard>
  );
}

/* ─── Rule performance ──────────────────────────────────────────────────── */

const RULE_TONE: Record<RulePerformance["state"], ChipTone> = {
  Healthy: "success",
  Watch: "waiting",
  "Below floor": "major",
};

function RulePerformanceCard() {
  const { openChat } = useChatPanel();

  const columns: DataTableColumn<RulePerformance>[] = [
    {
      key: "rule",
      label: "Rule",
      alwaysVisible: true,
      minWidth: 170,
      cell: (r) => (
        <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
          {r.rule}
        </span>
      ),
    },
    {
      key: "fired",
      label: "Fired",
      width: 70,
      align: "right",
      cell: (r) => (
        <span className="type-body" style={{ fontVariantNumeric: "tabular-nums" }}>
          {r.fired}
        </span>
      ),
    },
    {
      key: "rate",
      label: "Confirm rate",
      width: 108,
      align: "right",
      // The number that says whether a rule is earning its interruptions.
      cell: (r) => (
        <span
          className="type-body"
          style={{
            fontVariantNumeric: "tabular-nums",
            color: r.state === "Below floor" ? "var(--text-danger)" : "var(--ds-text-primary)",
          }}
        >
          {r.confirmRate}
        </span>
      ),
    },
    {
      key: "state",
      label: "State",
      width: 110,
      cell: (r) => <StatusChip tone={RULE_TONE[r.state]}>{r.state}</StatusChip>,
    },
  ];

  return (
    <DashCard title="Rule performance" icon={Sliders} count={RULE_PERFORMANCE.length}>
      <DataTable<RulePerformance>
        columns={columns}
        data={[...RULE_PERFORMANCE]}
        rowKey={(r) => r.rule}
        rowHeight={52}
        rowBorderColor="#F1F3F5"
        onRowClick={() => openChat()}
      />
    </DashCard>
  );
}

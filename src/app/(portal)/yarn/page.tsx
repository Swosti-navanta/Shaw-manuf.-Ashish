"use client";

import { useMemo, useState } from "react";
import { Drop } from "@phosphor-icons/react";
import {
  AiStar,
  Button,
  DataTable,
  EmptyState,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { usePersona } from "@/context/PersonaContext";
import { useScope } from "@/context/ScopeContext";
import { useYarn } from "@/context/YarnContext";
import { plantLabel } from "@/types/division";
import { APPROVALS, APPROVAL_LABEL, type ApprovalRow } from "@/types/yarn";
import DrillLink from "@/components/ui/DrillLink";
import ApprovalDeckModal from "./_components/ApprovalDeckModal";
import SableRead from "./_components/SableRead";

type TabId = "person" | "settled";

/**
 * Yarn is Sable's approval queue.
 *
 * Same decision-queue shape as Make and Quality, with one difference that
 * runs all the way through the surface: there is no automated lane. Rowan can
 * re-sequence inside a limit and Wren can grade a clean roll, because both are
 * reacting to product that already exists and can be measured. Sable proposes
 * recipes, run orders and lot sizes — instructions for product that hasn't
 * been made yet. There is no reading that makes signing one of those safe to
 * automate, so every row here ends in a person's signature by design rather
 * than by an unset threshold.
 *
 * The creel sequence and the lot genealogy are not on this page. Both differ
 * per proposal — a chain rendered page-level would be true of exactly one of
 * the three rows — so each lives in the deck of the approval it belongs to.
 */
export default function YarnPage() {
  const { plant } = useScope();
  const { profile } = usePersona();
  const { states, pendingApprovals } = useYarn();

  const [tab, setTab] = useState<TabId>("person");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deck, setDeck] = useState<ApprovalRow | null>(null);

  const rows = useMemo(
    () =>
      APPROVALS.filter((a) => (tab === "person" ? !states.has(a.id) : states.has(a.id))),
    [tab, states],
  );

  const columns = useMemo<DataTableColumn<ApprovalRow>[]>(
    () => [
      {
        key: "subject",
        label: "Subject",
        alwaysVisible: true,
        minWidth: 168,
        stopRowClick: true,
        cell: (row) => (
          <button
            type="button"
            onClick={() => setDeck(row)}
            className="type-body font-medium text-left hover:underline"
            style={{
              background: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--link-color)",
            }}
          >
            {row.subject.label}
          </button>
        ),
      },
      {
        key: "kind",
        label: "Approval",
        width: 132,
        cell: (row) => (
          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
            {APPROVAL_LABEL[row.kind]}
          </span>
        ),
      },
      {
        key: "qty",
        label: "Quantity",
        width: 104,
        cell: (row) => (
          <span
            className="type-body"
            style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}
          >
            {row.qty}
          </span>
        ),
      },
      {
        key: "covers",
        label: "Covers",
        width: 150,
        cell: (row) => (
          <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
            {row.covers}
          </span>
        ),
      },
      {
        key: "yarnLot",
        label: "Built from",
        width: 118,
        stopRowClick: true,
        cell: (row) => <DrillLink kind="yarn" id={row.yarnLot} />,
      },
      {
        key: "value",
        label: "At stake",
        width: 108,
        cell: (row) => (
          <span
            className="type-body"
            style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}
          >
            ${row.value.toLocaleString()}
          </span>
        ),
      },
      {
        key: "at",
        label: "Raised",
        width: 92,
        cell: (row) => (
          <span
            className="type-body"
            style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-secondary)" }}
          >
            {row.at}
          </span>
        ),
      },
      {
        key: "insight",
        label: "Recommendation",
        minWidth: 220,
        headerCell: () => (
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <AiStar size={14} />
            <span>Recommendation</span>
          </span>
        ),
        cell: (row) => (
          <span className="flex flex-col" style={{ gap: 1, maxWidth: 250 }} title={row.escalation}>
            <span className="type-body" style={{ color: "var(--color-iris-700)" }}>
              {row.insight.headline}
            </span>
            <span className="type-caption" style={{ color: "var(--color-iris-700)", opacity: 0.75 }}>
              {row.insight.detail}
            </span>
          </span>
        ),
      },
      ...(tab === "settled"
        ? [
            {
              key: "outcome",
              label: "Outcome",
              width: 128,
              cell: (row: ApprovalRow) => {
                const approved = states.get(row.id) === "approved";
                return (
                  <span
                    className="type-body"
                    style={{ color: approved ? "var(--text-success)" : "var(--ds-text-secondary)" }}
                  >
                    {approved ? "Approved" : "Sent back"}
                  </span>
                );
              },
            } satisfies DataTableColumn<ApprovalRow>,
          ]
        : []),
      {
        key: "action",
        label: "Action",
        width: 116,
        align: "right" as const,
        stopRowClick: true,
        cell: (row) => (
          <Button variant="outline" size="sm" onClick={() => setDeck(row)}>
            {states.has(row.id) ? "Open" : "Review"}
          </Button>
        ),
      },
    ],
    [tab, states],
  );

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <header className="flex flex-col" style={{ gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
            color: "var(--ds-text-placeholder, var(--text-muted))",
          }}
        >
          Yarn · Sable · {plantLabel(plant)}
        </span>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--ds-text-primary)",
          }}
        >
          {pendingApprovals > 0
            ? `${pendingApprovals} proposal${pendingApprovals === 1 ? "" : "s"} need your sign-off`
            : "Nothing waiting on your sign-off"}
        </h1>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
          Sable sizes dye lots, writes the recipe and plans the creel so big orders hold their shade
          with the least waste. It proposes; {profile.name} signs. Nothing here runs on its own.
        </p>
      </header>

      <SableRead />

      <TableShell
        title="Approval queue"
        icon={Drop}
        tabs={[
          {
            id: "person",
            label: "Needs you",
            badge: APPROVALS.filter((a) => !states.has(a.id)).length,
          },
          {
            id: "settled",
            label: "Settled",
            badge: APPROVALS.filter((a) => states.has(a.id)).length,
          },
        ]}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id as TabId);
          setPage(1);
        }}
        totalItems={rows.length}
        currentPage={page}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyState={
          <EmptyState
            icon={<Drop weight="duotone" style={{ width: 24, height: 24 }} />}
            title={tab === "person" ? "Nothing waiting on you" : "Nothing settled yet"}
            description={
              tab === "person"
                ? "Every proposal Sable raised this week has been signed or sent back."
                : "Approvals you sign or return this week will collect here."
            }
          />
        }
      >
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          rowHeight={64}
          rowBorderColor="#F1F3F5"
        />
      </TableShell>

      {deck && <ApprovalDeckModal approval={deck} onClose={() => setDeck(null)} />}
    </div>
  );
}

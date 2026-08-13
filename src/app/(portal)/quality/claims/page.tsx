"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt } from "@phosphor-icons/react";
import {
  AiStar,
  Button,
  DataTable,
  EmptyState,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { useQuality, useClaims } from "@/context/QualityContext";
import { useScope } from "@/context/ScopeContext";
import { plantLabel } from "@/types/division";
import type { ClaimRow } from "@/types/quality";
import DrillLink from "@/components/ui/DrillLink";
import TracebackDeck from "./_TracebackDeck";

const usd = (n: number) => `$${n.toLocaleString()}`;

/**
 * Field claims, and what caused them.
 *
 * Its own surface rather than a tab on Quality: grading is this shift's work
 * with a roll waiting on a call, while a claim is weeks old and asks which
 * decision produced it. Same vocabulary, different clocks — and only this one
 * ends in changing what the scheduler is allowed to do.
 */
export default function ClaimsPage() {
  const { plant } = useScope();
  const { sentFindings } = useQuality();
  const claims = useClaims();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deck, setDeck] = useState<ClaimRow | null>(null);

  const total = claims.reduce((n, c) => n + c.cost, 0);

  const columns = useMemo<DataTableColumn<ClaimRow>[]>(
    () => [
      {
        key: "claim",
        label: "Claim",
        alwaysVisible: true,
        minWidth: 150,
        stopRowClick: true,
        cell: (row) => (
          <div className="flex flex-col" style={{ gap: 2 }}>
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
              {row.id}
            </button>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {row.customer} · {row.month}
            </span>
          </div>
        ),
      },
      {
        key: "traced",
        label: "Traced to",
        width: 150,
        stopRowClick: true,
        cell: (row) => (
          <span className="flex flex-col" style={{ gap: 2 }}>
            <DrillLink kind="dyelot" id={row.dyeLot}>
              {row.dyeLot}
            </DrillLink>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {row.batch} · {row.rolls}
            </span>
          </span>
        ),
      },
      {
        key: "cause",
        label: "Root cause",
        minWidth: 220,
        cell: (row) => (
          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
            {row.cause}
          </span>
        ),
      },
      {
        key: "cost",
        label: "Cost",
        width: 110,
        cell: (row) => (
          <span
            className="type-body"
            style={{ color: "var(--text-danger)", fontVariantNumeric: "tabular-nums" }}
          >
            {usd(row.cost)}
          </span>
        ),
      },
      {
        key: "finding",
        label: "Finding",
        width: 172,
        headerCell: () => (
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <AiStar size={14} />
            <span>Finding</span>
          </span>
        ),
        cell: (row) =>
          row.sent ? (
            <span className="flex flex-col" style={{ gap: 1 }}>
              <span className="type-body" style={{ color: "var(--text-success)", fontWeight: 500 }}>
                Sent to Sawyer
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                now a hard rule
              </span>
            </span>
          ) : (
            <span className="flex flex-col" style={{ gap: 1 }}>
              <span className="type-body" style={{ color: "var(--color-iris-700)" }}>
                Same cause as 2 others
              </span>
              <span
                className="type-caption"
                style={{ color: "var(--color-iris-700)", opacity: 0.75 }}
              >
                worth a scheduling rule
              </span>
            </span>
          ),
      },
      {
        key: "open",
        label: "Action",
        width: 116,
        align: "right",
        alwaysVisible: true,
        stopRowClick: true,
        cell: (row) => (
          <span className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeck(row)}>
              Trace
            </Button>
          </span>
        ),
      },
    ],
    [],
  );

  const pageRows = claims.slice((page - 1) * pageSize, page * pageSize);

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
          Quality · Wren · {plantLabel(plant)}
        </span>
        <div className="flex items-end justify-between flex-wrap" style={{ gap: 16 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--ds-text-primary)",
            }}
          >
            Field claims — and what caused them
          </h1>
          <Link href="/quality">
            <Button variant="outline" size="sm" iconLeft={<ArrowLeft size={13} weight="bold" />}>
              Back to the queue
            </Button>
          </Link>
        </div>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
          Wren traces a claim to the run that produced it, finds the pattern across batches, and
          sends the cause upstream as a rule Sawyer has to respect.
        </p>
      </header>

      <div
        className="flex items-baseline flex-wrap"
        style={{
          gap: 12,
          padding: "14px 18px",
          borderRadius: 12,
          background: "var(--surface-base)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "var(--text-danger)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {usd(total)}
        </span>
        <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
          across {claims.length} claims in four months — every one traced to a dye lot split to hold
          a date.{" "}
          {sentFindings.size > 0
            ? "The rule is now in Sawyer's constraint model."
            : "One rule would have prevented all three."}
        </span>
      </div>

      <TableShell
        title="Claims"
        icon={Receipt}
        totalItems={claims.length}
        currentPage={page}
        onPageChange={setPage}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        columns={columns}
        emptyState={
          <EmptyState
            icon={<Receipt weight="duotone" style={{ width: 24, height: 24 }} />}
            title="No open claims"
            description="Nothing has come back from the field this quarter."
          />
        }
      >
        <DataTable<ClaimRow>
          columns={columns}
          data={pageRows}
          rowKey={(c) => c.id}
          rowHeight={64}
          rowBorderColor="#F1F3F5"
        />
      </TableShell>

      {deck && <TracebackDeck claim={deck} onClose={() => setDeck(null)} />}
    </div>
  );
}

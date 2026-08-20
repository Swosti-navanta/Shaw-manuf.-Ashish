"use client";

import { useMemo, useState } from "react";
import { ChartBar } from "@phosphor-icons/react";
import {
  DataTable,
  TableShell,
  type DataTableColumn,
  type DataTableSortState,
} from "@navanta-ai/design-system";
import { LINES } from "@/data/run-data";
import type { LineState } from "@/types/run";

type Row = LineState & {
  /** Yards per hour short of standard — positive when the belt is ahead. */
  gap: number;
  pct: number;
  short: boolean;
  /** Yards the shortfall costs across a 12-hour shift. Measured, not forecast. */
  lost: number;
};

/** A shift's worth of hours, for turning a rate gap into money. */
const SHIFT_HOURS = 12;

/**
 * Every belt against its own standard, as a table.
 *
 * The chart above answers "which belt missed"; this answers "by how much, and
 * what does it cost" — a reading task, which a table does better than bars. It
 * sorts, which is how the question is really asked: worst first.
 *
 * A rate gap is valued at contribution rather than list, for the same reason
 * the plant roll-up was: the fibre for a yard never made is also never bought.
 */
export default function BeltPerformanceTable() {
  const [sort, setSort] = useState<DataTableSortState | undefined>({
    field: "lost",
    dir: "desc",
  });

  const rows = useMemo<Row[]>(() => {
    const base = LINES.map((l) => {
      const gap = l.achieved - l.standard;
      return {
        ...l,
        gap,
        pct: Math.round((l.achieved / l.standard) * 100),
        short: l.achieved < l.standard,
        lost: gap < 0 ? Math.abs(gap) * SHIFT_HOURS : 0,
      };
    });
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      if (sort.field === "name") return a.name.localeCompare(b.name) * dir;
      const key = sort.field as "standard" | "achieved" | "pct" | "oee" | "lost";
      return (a[key] - b[key]) * dir;
    });
  }, [sort]);

  const columns = useMemo<DataTableColumn<Row>[]>(
    () => [
      // The belt name carries the only colour in the row: the constraint. Every
      // figure stays neutral — three red columns saying the same thing is noise,
      // and it leaves nothing for a genuinely bad number to stand out against.
      {
        key: "name",
        label: "Machine",
        alwaysVisible: true,
        width: 132,
        sortable: true,
        cell: (r) => (
          <span className="flex flex-col" style={{ gap: 2 }}>
            <span
              className="type-body font-medium"
              style={{ color: r.constraint ? "var(--lane-limit-ink)" : "var(--ds-text-primary)" }}
            >
              {r.name}
            </span>
            {r.constraint && (
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                the constraint
              </span>
            )}
          </span>
        ),
      },
      {
        key: "standard",
        label: "Planned",
        width: 96,
        align: "right" as const,
        sortable: true,
        cell: (r) => <Rate v={r.standard} tone="var(--ds-text-secondary)" />,
      },
      {
        key: "achieved",
        label: "Achieved",
        width: 96,
        align: "right" as const,
        sortable: true,
        cell: (r) => <Rate v={r.achieved} tone="var(--ds-text-primary)" />,
      },
      {
        key: "pct",
        label: "Variance",
        width: 116,
        align: "right" as const,
        sortable: true,
        cell: (r) => (
          <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>
            {r.short ? "−" : "+"}
            {Math.abs(r.gap)} yd/hr · {r.pct}%
          </span>
        ),
      },
      {
        key: "oee",
        label: "OEE",
        width: 80,
        align: "right" as const,
        sortable: true,
        cell: (r) => (
          <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>
            {r.oee}%
          </span>
        ),
      },
      // Yards the belt did not make this shift — measured from the rate gap,
      // rather than a money figure the plant would have to forecast.
      {
        key: "lost",
        label: "Lost output",
        width: 116,
        align: "right" as const,
        sortable: true,
        cell: (r) =>
          r.lost > 0 ? (
            <span className="flex flex-col items-end" style={{ gap: 1 }}>
              <span
                className="type-body"
                style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}
              >
                {r.lost.toLocaleString()}
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                lin yd
              </span>
            </span>
          ) : (
            <span
              className="type-body"
              style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}
            >
              —
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <TableShell
      customize={false}
      title="Machine performance"
      icon={ChartBar}
      totalItems={rows.length}
      currentPage={1}
      pageSize={rows.length || 1}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
    >
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.name}
        rowHeight={60}
        rowBorderColor="#F1F3F5"
        sort={sort}
        onSortChange={setSort}
      />
    </TableShell>
  );
}

/** Yards per hour, over its unit. */
function Rate({ v, tone }: { v: number; tone: string }) {
  return (
    <span className="flex flex-col items-end" style={{ gap: 1 }}>
      <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: tone }}>
        {v}
      </span>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        yd/hr
      </span>
    </span>
  );
}

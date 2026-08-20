"use client";

import { useMemo, useState } from "react";
import { ChartBar } from "@phosphor-icons/react";
import {
  DataTable,
  SegmentedControl,
  TableShell,
  type DataTableColumn,
  type DataTableSortState,
} from "@navanta-ai/design-system";
import { LINES } from "@/data/run-data";
import type { LineState } from "@/types/run";
import { MACHINE_PERF_ROWS, type MachinePerfRow } from "./machine-perf";

type BeltRow = LineState & {
  /** Yards per hour short of standard — positive when the belt is ahead. */
  gap: number;
  pct: number;
  short: boolean;
  /** Yards the shortfall costs across a 12-hour shift. Measured, not forecast. */
  lost: number;
};

/** A shift's worth of hours, for turning a rate gap into money. */
const SHIFT_HOURS = 12;

const LEVELS = [
  { value: "belt", label: "Belt" },
  { value: "machine", label: "Machine" },
];

/**
 * Performance against plan, as a table — toggled between the two levels the
 * plant's systems actually keep.
 *
 * **Belt** is the promised unit: rate against its own standard, and OEE, which
 * are belt metrics because the belt is what's scheduled. **Machine** drops to
 * the equipment: availability and downtime, which are machine metrics because a
 * machine is the thing with a serial and a maintenance history. Every machine
 * row names its parent belt, so a unit is never read out of the belt it runs
 * on. Both sort — worst first — because that is how the question is really
 * asked.
 *
 * A rate gap is valued at contribution rather than list, for the same reason
 * the plant roll-up was: the fibre for a yard never made is also never bought.
 */
export default function BeltPerformanceTable() {
  const [level, setLevel] = useState<string>("belt");
  const machine = level === "machine";

  const toggle = (
    <SegmentedControl
      options={LEVELS}
      value={level}
      onValueChange={setLevel}
      size="sm"
      aria-label="Belt or machine performance"
    />
  );

  return (
    <TableShell
      customize={false}
      title={`${machine ? "Machine" : "Belt"} performance`}
      icon={ChartBar}
      totalItems={machine ? MACHINE_PERF_ROWS.length : LINES.length}
      currentPage={1}
      pageSize={(machine ? MACHINE_PERF_ROWS.length : LINES.length) || 1}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
      filters={toggle}
    >
      {machine ? <MachineTable /> : <BeltTable />}
    </TableShell>
  );
}

/* ─── Belt level ────────────────────────────────────────────────────────── */

function BeltTable() {
  const [sort, setSort] = useState<DataTableSortState | undefined>({ field: "lost", dir: "desc" });

  const rows = useMemo<BeltRow[]>(() => {
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

  const columns = useMemo<DataTableColumn<BeltRow>[]>(
    () => [
      // The belt name carries the only colour in the row: the constraint. Every
      // figure stays neutral — three red columns saying the same thing is noise,
      // and it leaves nothing for a genuinely bad number to stand out against.
      {
        key: "name",
        label: "Belt",
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
        align: "right",
        sortable: true,
        cell: (r) => <Rate v={r.standard} tone="var(--ds-text-secondary)" />,
      },
      {
        key: "achieved",
        label: "Achieved",
        width: 96,
        align: "right",
        sortable: true,
        cell: (r) => <Rate v={r.achieved} tone="var(--ds-text-primary)" />,
      },
      {
        key: "pct",
        label: "Variance",
        width: 116,
        align: "right",
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
        align: "right",
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
        align: "right",
        sortable: true,
        cell: (r) => <LostOutput v={r.lost} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.name}
      rowHeight={60}
      rowBorderColor="#F1F3F5"
      sort={sort}
      onSortChange={setSort}
    />
  );
}

/* ─── Machine level ─────────────────────────────────────────────────────── */

function MachineTable() {
  const [sort, setSort] = useState<DataTableSortState | undefined>({ field: "lost", dir: "desc" });

  const rows = useMemo<MachinePerfRow[]>(() => {
    if (!sort) return MACHINE_PERF_ROWS;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...MACHINE_PERF_ROWS].sort((a, b) => {
      if (sort.field === "code") return a.code.localeCompare(b.code) * dir;
      if (sort.field === "belt") return a.belt.localeCompare(b.belt) * dir;
      const key = sort.field as "availability" | "downtime" | "lost";
      return (a[key] - b[key]) * dir;
    });
  }, [sort]);

  const columns = useMemo<DataTableColumn<MachinePerfRow>[]>(
    () => [
      // The machine leads and its belt is the caption beneath — a machine is
      // never shown without the belt it runs on. The constraint unit takes the
      // one accent colour; everything else stays neutral.
      {
        key: "code",
        label: "Machine",
        alwaysVisible: true,
        width: 148,
        sortable: true,
        cell: (r) => (
          <span className="flex flex-col" style={{ gap: 2 }}>
            <span
              className="type-body font-medium"
              style={{ color: r.constraint ? "var(--lane-limit-ink)" : "var(--ds-text-primary)" }}
            >
              {r.code}
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {r.constraint ? `${r.belt} · the constraint` : r.belt}
            </span>
          </span>
        ),
      },
      {
        key: "belt",
        label: "Belt",
        width: 120,
        sortable: true,
        cell: (r) => (
          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
            {r.belt}
          </span>
        ),
      },
      // Availability is the machine metric — uptime this shift, one minus the
      // downtime the health card plots. Coloured only when it dips below the
      // 95% the floor treats as healthy.
      {
        key: "availability",
        label: "Availability",
        width: 108,
        align: "right",
        sortable: true,
        cell: (r) => (
          <span
            className="type-body"
            style={{
              fontVariantNumeric: "tabular-nums",
              color: r.availability < 95 ? "var(--text-danger)" : "var(--ds-text-primary)",
            }}
          >
            {r.availability}%
          </span>
        ),
      },
      {
        key: "downtime",
        label: "Downtime",
        width: 96,
        align: "right",
        sortable: true,
        cell: (r) =>
          r.downtime > 0 ? (
            <span className="flex flex-col items-end" style={{ gap: 1 }}>
              <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>
                {r.downtime.toFixed(1)}
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                hrs
              </span>
            </span>
          ) : (
            <span className="type-body" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>
              —
            </span>
          ),
      },
      // Yards the stops cost this shift — the machine's downtime at the belt's
      // rate. The tie from a machine metric back to belt output.
      {
        key: "lost",
        label: "Lost output",
        width: 116,
        align: "right",
        sortable: true,
        cell: (r) => <LostOutput v={r.lost} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.code}
      rowHeight={60}
      rowBorderColor="#F1F3F5"
      sort={sort}
      onSortChange={setSort}
    />
  );
}

/* ─── Shared cells ──────────────────────────────────────────────────────── */

/** Linear yards not made this shift, over its unit. */
function LostOutput({ v }: { v: number }) {
  return v > 0 ? (
    <span className="flex flex-col items-end" style={{ gap: 1 }}>
      <span className="type-body" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>
        {v.toLocaleString()}
      </span>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        lin yd
      </span>
    </span>
  ) : (
    <span className="type-body" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>
      —
    </span>
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

"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarBlank, MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import {
  AiStar,
  Button,
  DataTable,
  EmptyState,
  Input,
  TableShell,
  type DataTableColumn,
  type DataTableSortState,
} from "@navanta-ai/design-system";
import { useSchedule } from "@/context/ScheduleContext";
import { BACKLOG, RUNS, STATIC_BELTS, STATIC_LANE_RUNS } from "@/data/schedule-data";
import { BELTS, type BacklogItem } from "@/types/schedule";
import DrillLink from "@/components/ui/DrillLink";
import RunDeckModal from "./RunDeckModal";
import ScheduleBoard from "./ScheduleBoard";
import BoardControls from "./BoardControls";

type View = "board" | "table";

const beltName = (id: string) => BELTS.find((b) => b.id === id)?.name ?? id;

/** Promised dates are day-of-month within one month here, so a numeric parse
 *  is enough to sort by urgency without pulling in a date library. */
const promisedDay = (item: BacklogItem) => parseInt(item.promised, 10) || 0;

/** The shift the whole demo is pinned to (12 Aug), so "in N days" is stable
 *  rather than drifting with the wall clock. */
const TODAY = 12;

/** Iris-700 — the colour reserved for what an agent contributed, never used
 *  for facts the system merely holds. */
const AGENT_INK = "var(--color-iris-700)";

/** Runs the board carries at rest — the committed sequence plus every static
 *  lane. Placed backlog is added on top. Drives the footer count on the board
 *  tab so it reads as "N runs on the plant", not an empty table. */
const BOARD_BASE_RUNS =
  Object.keys(RUNS).length +
  STATIC_BELTS.tufting.length +
  STATIC_BELTS.finishing.length +
  STATIC_LANE_RUNS.length;

/** Numeric cells carry body type like every other cell — only the tabular
 *  figures differ, so the column still reads as a column. */
const NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  color: "var(--ds-text-primary)",
};

/**
 * The belt plan, in one card with two views.
 *
 * *Board* is the resource Gantt — the plant's lanes against the clock, where a
 * run is placed and re-sequenced. *Table* is the same week as a queue, sorted
 * by promised date, for the reading tasks a board is bad at ("how far out is
 * everything for Kestrel"). They are two views of one plan, so they live under
 * one heading rather than in two cards stacked down the page.
 *
 * The DS `TableShell` owns the frame — title, tabs, search and footer. The
 * search and pagination only make sense for the table, so they are wired to the
 * table tab; the board tab borrows the footer only for an honest run count.
 */
export default function BeltPlan() {
  const { scheduled, released, reRelease } = useSchedule();
  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<DataTableSortState>({ field: "promised", dir: "asc" });
  // The run deck — Sawyer's placement, the analysis behind it, and the belt
  // override. Opened from the run name.
  const [deck, setDeck] = useState<{ item: BacklogItem; view: "default" | "override" } | null>(
    null,
  );

  const unplaced = BACKLOG.filter((b) => !scheduled.has(b.id)).length;
  const query = search.trim().toLowerCase();
  const boardTotal = BOARD_BASE_RUNS + scheduled.size;

  const filtered = useMemo(() => {
    const rows = BACKLOG.filter((b) => {
      if (!query) return true;
      return [b.label, b.order, b.dyeLot, b.customer]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(query));
    });

    const dir = sort.dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      if (sort.field === "qty") return (a.qty - b.qty) * dir;
      if (sort.field === "hours") return (a.hours - b.hours) * dir;
      if (sort.field === "run") return a.label.localeCompare(b.label) * dir;
      if (sort.field === "shade")
        return (Number(b.shadeCritical ?? false) - Number(a.shadeCritical ?? false)) * dir;
      return (promisedDay(a) - promisedDay(b)) * dir;
    });
  }, [query, sort]);

  // Row numbers continue across pages, so "row 14" means the same thing on
  // page 2 as it does when someone reads it out on the floor.
  const rowOffset = (page - 1) * pageSize;

  const onOpen = useCallback(
    (row: BacklogItem) => setDeck({ item: row, view: "default" }),
    [],
  );
  const onOverride = useCallback(
    (row: BacklogItem) => setDeck({ item: row, view: "override" }),
    [],
  );

  const columns = useMemo<DataTableColumn<BacklogItem>[]>(
    () => [
      {
        key: "sno",
        label: "#",
        width: 52,
        align: "right",
        alwaysVisible: true,
        cell: (_row, ctx) => (
          <span
            className="type-body"
            style={{ ...NUM, color: "var(--ds-text-placeholder, var(--text-muted))" }}
          >
            {rowOffset + ctx.index + 1}
          </span>
        ),
      },
      {
        key: "run",
        label: "Run",
        alwaysVisible: true,
        sortable: true,
        minWidth: 190,
        stopRowClick: true,
        // The dye lot leads. It is the thing being placed on a belt, it is the
        // id every other surface joins on, and it is what the rest of the
        // product puts first — the style name describes it but nobody
        // schedules a style.
        cell: (row) => (
          <div className="flex flex-col" style={{ gap: 2 }}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="type-body font-medium text-left hover:underline"
              style={{ background: "none", padding: 0, cursor: "pointer", color: "var(--link-color)" }}
              title="Open the run deck"
            >
              {row.dyeLot ?? "No dye lot"}
            </button>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {row.label}
            </span>
          </div>
        ),
      },
      {
        key: "order",
        label: "Order",
        width: 138,
        stopRowClick: true,
        cell: (row) => (
          <span className="flex flex-col" style={{ gap: 2 }}>
            {row.order && <DrillLink kind="order" id={row.order} />}
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {row.customer}
            </span>
          </span>
        ),
      },
      {
        key: "qty",
        label: "Quantity",
        width: 88,
        align: "right",
        sortable: true,
        caretSide: "leading",
        cell: (row) => <Measure value={row.qty.toLocaleString()} unit="lin yd" />,
      },
      {
        key: "hours",
        label: "Belt hrs",
        width: 78,
        align: "right",
        sortable: true,
        caretSide: "leading",
        cell: (row) => <Measure value={String(row.hours)} unit="hours" />,
      },
      {
        key: "shade",
        label: "Shade",
        width: 122,
        sortable: true,
        // Shade criticality decides whether a lot can be broken across dye
        // runs at all — it constrains placement more than any other attribute
        // here, so it earns a column of its own rather than a tag in the name.
        cell: (row) =>
          row.shadeCritical ? (
            <Tag tone="warn">Shade-critical</Tag>
          ) : (
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              Standard
            </span>
          ),
      },
      {
        key: "promised",
        label: "Promised",
        width: 96,
        sortable: true,
        cell: (row) => {
          const days = promisedDay(row) - TODAY;
          return (
            <span className="flex flex-col" style={{ gap: 1 }}>
              <span
                className="type-body"
                style={{
                  ...NUM,
                  color: row.fixed ? "var(--text-danger)" : "var(--ds-text-primary)",
                }}
              >
                {row.promised}
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}
              </span>
            </span>
          );
        },
      },
      {
        key: "belt",
        label: "Belt",
        width: 96,
        cell: (row) => (
          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
            {beltName(row.belt)}
          </span>
        ),
      },
      {
        key: "insight",
        label: "Sawyer Insight",
        minWidth: 180,
        // Two short lines in Iris-700, matching the IRIS Iris Insight column —
        // the agent's contribution is colour-coded and never mixed into the
        // columns carrying plain record data.
        headerCell: () => (
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <AiStar size={14} />
            <span>Sawyer Insight</span>
          </span>
        ),
        cell: (row) => (
          <span className="flex flex-col" style={{ gap: 1, maxWidth: 210 }} title={row.note}>
            <span className="type-body font-normal" style={{ color: AGENT_INK }}>
              {row.insight.headline}
            </span>
            <span className="type-caption font-normal" style={{ color: AGENT_INK, opacity: 0.75 }}>
              {row.insight.detail}
            </span>
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        width: 148,
        align: "right",
        alwaysVisible: true,
        stopRowClick: true,
        cell: (row) => <RowAction row={row} onOverride={onOverride} />,
      },
    ],
    [rowOffset, onOpen, onOverride],
  );

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const isBoard = view === "board";

  return (
    <>
      <TableShell
      customize={false}
        title="The belt plan"
        icon={CalendarBlank}
        tabs={[
          { id: "board", label: "Board" },
          { id: "table", label: "Table", badge: unplaced },
        ]}
        activeTab={view}
        onTabChange={(id) => {
          setView(id as View);
          setPage(1);
        }}
        // Search and pagination belong to the table; the board borrows the
        // footer for a count only.
        totalItems={isBoard ? boardTotal : filtered.length}
        currentPage={isBoard ? 1 : page}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        // Search is not TableShell's — it renders above the tabs there, and the
        // search belongs to the table view, under its tab. It lives in the
        // table children instead.
        // The draft banner rides above whichever view is open once the sequence
        // has been touched — re-releasing is a plan-level action, not a tab's.
        header={
          released ? undefined : (
            <div
              className="flex items-center"
              style={{
                gap: 10,
                padding: "10px 18px",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 5,
                  background: "var(--lane-limit-bg)",
                  color: "var(--lane-limit-ink)",
                }}
              >
                Draft
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                The floor is still running the released sequence.
              </span>
              <Button variant="primary" size="sm" onClick={reRelease}>
                Re-release
              </Button>
            </div>
          )
        }
        isFiltered={!isBoard && query !== ""}
        emptyState={
          <EmptyState
            icon={<CalendarBlank weight="duotone" style={{ width: 24, height: 24 }} />}
            title="Every run has a slot"
            description="Nothing is waiting on the scheduler right now."
          />
        }
        noResultsState={
          <EmptyState
            icon={<CalendarBlank weight="duotone" style={{ width: 24, height: 24 }} />}
            title="No matches found"
            description="Try a different run, order or dye lot."
          />
        }
      >
        {isBoard ? (
          <div style={{ padding: "12px 18px 4px" }}>
            <ScheduleBoard />
            <BoardControls />
          </div>
        ) : (
          <div className="flex flex-col">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ maxWidth: 320 }}>
                <Input
                  size="md"
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search run, order or dye lot"
                  iconLeft={<MagnifyingGlass size={15} />}
                  clearable
                  onClear={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label="Search the backlog"
                />
              </div>
            </div>
            {pageRows.length > 0 && (
              <DataTable<BacklogItem>
                columns={columns}
                data={pageRows}
                rowKey={(r) => r.id}
                sort={sort}
                onSortChange={(next) => {
                  setSort(next);
                  setPage(1);
                }}
                rowHeight={64}
                rowBorderColor="#F1F3F5"
                rowStyle={(r) =>
                  scheduled.has(r.id) ? { background: "var(--surface-success)" } : undefined
                }
              />
            )}
          </div>
        )}
      </TableShell>
      {deck && (
        <RunDeckModal item={deck.item} initialView={deck.view} onClose={() => setDeck(null)} />
      )}
    </>
  );
}

/** A figure over its unit — the number carries the comparison, the unit is
 *  there once for reference rather than repeated inside every value. */
function Measure({ value, unit }: { value: string; unit: string }) {
  return (
    <span className="flex flex-col items-end" style={{ gap: 1 }}>
      <span className="type-body" style={NUM}>
        {value}
      </span>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        {unit}
      </span>
    </span>
  );
}

/**
 * Place accepts Sawyer's slot in one click. The pencil beside it opens the run
 * deck straight into the picker — an override needs to see the belt, so it
 * routes to the deck rather than trying to fit a control in the row.
 */
function RowAction({
  row,
  onOverride,
}: {
  row: BacklogItem;
  onOverride: (row: BacklogItem) => void;
}) {
  const { scheduled, schedule, unschedule } = useSchedule();

  if (scheduled.has(row.id)) {
    return (
      <span className="flex items-center justify-end" style={{ gap: 6 }}>
        <span
          className="type-caption"
          style={{ color: "var(--text-success)", fontWeight: 600, whiteSpace: "nowrap" }}
        >
          {scheduled.get(row.id) === row.slot ? "On the board" : "Overridden"}
        </span>
        <Button variant="ghost" size="sm" onClick={() => unschedule(row.id)}>
          Remove
        </Button>
      </span>
    );
  }

  return (
    <span className="flex items-center justify-end" style={{ gap: 4 }}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => schedule(row.id, row.slot)}
        title={`Place on ${beltName(row.belt)} · ${slotHint(row)}`}
      >
        Place
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onOverride(row)}
        aria-label={`Override the placement of ${row.label}`}
        title="Override the placement"
      >
        <PencilSimple size={15} weight="bold" />
      </Button>
    </span>
  );
}

/** What Sawyer's slot means, for the Place button's tooltip. */
function slotHint(row: BacklogItem): string {
  return row.slot === 0 ? "first of the day" : `slot ${row.slot + 1}`;
}

function Tag({ children, tone }: { children: React.ReactNode; tone: "bad" | "warn" }) {
  const bad = tone === "bad";
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 6px",
        borderRadius: 5,
        whiteSpace: "nowrap",
        background: bad ? "var(--surface-danger)" : "var(--lane-limit-bg)",
        color: bad ? "var(--text-danger)" : "var(--lane-limit-ink)",
      }}
    >
      {children}
    </span>
  );
}

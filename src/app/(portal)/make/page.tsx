"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Gauge } from "@phosphor-icons/react";
import {
  AiStar,
  Button,
  DataTable,
  EmptyState,
  PageHeading,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { usePersona } from "@/context/PersonaContext";
import { useRun } from "@/context/RunContext";
import { useScope } from "@/context/ScopeContext";
import { plantLabel } from "@/types/division";
import {
  CATEGORY_OF,
  HORIZON_LABEL,
  HORIZON_ORDER,
  LANE_TAB,
  MAKE_ACTIONS,
  SOURCE_LABEL,
  type MakeAction,
} from "@/types/action";
import ActionDeckModal from "./_components/ActionDeckModal";

type TabId = "person" | "auto";

/**
 * Make is a queue of decisions, not a dashboard.
 *
 * Everything that used to sit here as a standing panel — the rate chart, the
 * activity feed, the genealogy, machine health — is evidence, and evidence now
 * belongs to the thing it is evidence about: an action's deck, or the entity's
 * own drawer. A panel nobody has a reason to open is a panel nobody reads.
 */
/**
 * `useSearchParams` bails out of prerendering unless it sits under a Suspense
 * boundary, so the page's default export is the boundary and the queue itself
 * is the child. Without this the whole route fails static export at build
 * time, which is what broke the build rather than anything on the page.
 */
export default function MakePage() {
  return (
    <Suspense fallback={null}>
      <MakeQueue />
    </Suspense>
  );
}

function MakeQueue() {
  const { plant } = useScope();
  const { profile } = usePersona();
  const { status, workOrderRaised } = useRun();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("person");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // An analysis view on Performance redirects here with ?action=<id> — the
  // deck opens on arrival, so the handoff lands on the decision itself.
  const [deck, setDeck] = useState<MakeAction | null>(() => {
    const id = searchParams.get("action");
    return id ? (MAKE_ACTIONS.find((x) => x.id === id) ?? null) : null;
  });
  // An options-decision is settled when a person accepts one of its options —
  // the label they chose, kept here so the row can move to Resolved and show
  // what was decided. The re-sequence and work-order settle through RunContext.
  const [resolved, setResolved] = useState<Record<string, string>>({});

  // A row leaves the queue once it's been acted on, so the list empties as the
  // shift is worked rather than staying static.
  const isSettled = useCallback(
    (a: MakeAction) =>
      (a.kind === "resequence" && status !== "open") ||
      (a.kind === "workorder" && workOrderRaised) ||
      Boolean(resolved[a.id]),
    [status, workOrderRaised, resolved],
  );

  const rows = useMemo(
    () =>
      MAKE_ACTIONS.filter((a) => {
        const settled = isSettled(a);
        return tab === "person" ? a.lane !== "auto" && !settled : a.lane === "auto" || settled;
      })
        // Horizon is the axis that decides what gets read first — shortest
        // clock on top, so a 22-minute rate deviation can't sit below a
        // quarterly capital case just because the case moves more money.
        .slice()
        .sort((a, b) => HORIZON_ORDER.indexOf(a.horizon) - HORIZON_ORDER.indexOf(b.horizon)),
    [tab, isSettled],
  );

  const counts = {
    person: MAKE_ACTIONS.filter((a) => a.lane !== "auto" && !isSettled(a)).length,
    auto: MAKE_ACTIONS.filter((a) => a.lane === "auto" || isSettled(a)).length,
  };

  // Every row opens a deck. What varies is the deck's contents, not whether
  // there is one — a queue where only one row opens properly teaches people
  // the others aren't worth clicking.
  const openAction = useCallback((a: MakeAction) => setDeck(a), []);

  const columns = useMemo<DataTableColumn<MakeAction>[]>(
    () => [
      {
        key: "subject",
        label: "Subject",
        alwaysVisible: true,
        minWidth: 230,
        stopRowClick: true,
        // The identifier leads and the exception is its caption. A sentence
        // doesn't earn a column of its own — you scan a queue by what it's
        // about, then read the line under it if the id doesn't already tell
        // you.
        cell: (row) => (
          <div className="flex flex-col" style={{ gap: 2 }}>
            <button
              type="button"
              onClick={() => openAction(row)}
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
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {row.title}
            </span>
          </div>
        ),
      },
      {
        key: "category",
        label: "Category",
        width: 124,
        // How you scan for "anything on the machines?" without reading five
        // sentences.
        cell: (row) => (
          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
            {CATEGORY_OF[row.kind]}
          </span>
        ),
      },
      {
        key: "horizon",
        label: "Horizon",
        width: 116,
        // The clock the decision runs on. It's the queue's real axis — the
        // urgent and the important aren't the same kind of "now", and the
        // colour says which is which at a glance.
        cell: (row) => {
          const tone =
            row.horizon === "shift"
              ? { bg: "var(--surface-danger)", fg: "var(--text-danger)" }
              : row.horizon === "period"
                ? { bg: "var(--surface-warning, #FEF6E7)", fg: "var(--text-warning, #B7791F)" }
                : { bg: "var(--color-iris-50)", fg: "var(--color-iris-700)" };
          return (
            <span
              className="type-caption inline-flex items-center"
              style={{
                padding: "2px 9px",
                borderRadius: 999,
                background: tone.bg,
                color: tone.fg,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {HORIZON_LABEL[row.horizon]}
            </span>
          );
        },
      },
      {
        key: "traces",
        label: "Traces to",
        width: 150,
        // The stage and machine behind the decision — the tie back to the
        // Machine health analysis on Performance.
        cell: (row) =>
          row.stage ? (
            <span className="flex flex-col" style={{ gap: 1 }}>
              <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                {row.stage}
              </span>
              {row.machine && (
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                  {row.machine}
                </span>
              )}
            </span>
          ) : (
            <span className="type-caption" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>
              Whole line
            </span>
          ),
      },
      {
        key: "source",
        label: "Cause",
        width: 128,
        // Which of the four analyses raised this decision — the queue is
        // their combined output, so every row names its origin.
        cell: (row) => (
          <span
            className="type-caption inline-flex items-center"
            style={{
              padding: "2px 9px",
              borderRadius: 999,
              background: "var(--color-iris-50)",
              border: "1px solid var(--color-iris-200)",
              color: "var(--color-iris-700)",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {SOURCE_LABEL[row.source]}
          </span>
        ),
      },
      {
        key: "impact",
        label: "Impact",
        width: 126,
        cell: (row) => (
          <span
            className="type-body"
            style={{
              fontVariantNumeric: "tabular-nums",
              color: row.impactBad ? "var(--text-danger)" : "var(--ds-text-primary)",
            }}
          >
            {row.impact}
          </span>
        ),
      },
      {
        key: "raised",
        label: "Raised by",
        width: 108,
        /* The agent, marked as one. The timestamp is gone: a queue worked
           through a shift is read by what needs deciding, not by when it was
           noticed, and the minute it was raised never changed anyone's call. */
        cell: (row) => (
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <AiStar size={13} />
            <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
              {row.agent}
            </span>
          </span>
        ),
      },
      {
        key: "insight",
        label: "Recommendation",
        minWidth: 190,
        headerCell: () => (
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <AiStar size={14} />
            <span>Recommendation</span>
          </span>
        ),
        cell: (row) => (
          <span className="flex flex-col" style={{ gap: 1, maxWidth: 220 }} title={row.detail}>
            <span className="type-body" style={{ color: "var(--color-iris-700)" }}>
              {row.insight.headline}
            </span>
            <span
              className="type-caption"
              style={{ color: "var(--color-iris-700)", opacity: 0.75 }}
            >
              {row.insight.detail}
            </span>
          </span>
        ),
      },
      ...(tab === "auto"
        ? [
            {
              key: "resolvedBy",
              label: "Resolved by",
              width: 140,
              // The engine finished most of these; a person finished the one
              // that reached them. Which is which is the whole point of
              // keeping the resolved work visible, so it gets a column — with
              // the AI mark where it was the agent.
              cell: (row: MakeAction) =>
                isSettled(row) ? (
                  <span className="flex flex-col" style={{ gap: 1 }}>
                    <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                      {profile.name}
                    </span>
                    {resolved[row.id] && (
                      <span
                        className="type-caption"
                        style={{ color: "var(--text-success)", maxWidth: 160 }}
                        title={resolved[row.id]}
                      >
                        {resolved[row.id]}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center" style={{ gap: 6 }}>
                    <AiStar size={14} />
                    <span className="type-body" style={{ color: "var(--color-iris-700)" }}>
                      {row.agent}
                    </span>
                  </span>
                ),
            } satisfies DataTableColumn<MakeAction>,
          ]
        : []),
      {
        key: "open",
        label: "Action",
        width: 108,
        align: "right",
        alwaysVisible: true,
        stopRowClick: true,
        cell: (row) => (
          <span className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => openAction(row)}>
              {row.hasOptions ? "Decide" : "Open"}
            </Button>
          </span>
        ),
      },
    ],
    [openAction, tab, isSettled, profile.name, resolved],
  );

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading
        title={`${counts.person} decision${counts.person === 1 ? "" : "s"} need${counts.person === 1 ? "s" : ""} you this shift`}
        subtitle={`Make · ${profile.agents[0] ?? "Rowan"} · ${plantLabel(plant)}. One queue, four analyses behind it — Overall, Manufacturing, Machine health and Labor on Performance each raise what needs a person here, with the options already costed. ${profile.name} owns the call.`}
      />

      <TableShell
        title="Decision queue"
        icon={Gauge}
        totalItems={rows.length}
        currentPage={page}
        onPageChange={setPage}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        tabs={[
          {
            id: "person",
            label: LANE_TAB.person,
            badge: counts.person,
            tone: counts.person > 0 ? "critical" : undefined,
          },
          { id: "auto", label: LANE_TAB.auto, badge: counts.auto },
        ]}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id as TabId);
          setPage(1);
        }}
        columns={columns}
        emptyState={
          <EmptyState
            icon={<Gauge weight="duotone" style={{ width: 24, height: 24 }} />}
            title="Nothing waiting on a person"
            description="Every exception this shift resolved inside the limits set for this plant."
          />
        }
      >
        <DataTable<MakeAction>
          columns={columns}
          data={pageRows}
          rowKey={(a) => a.id}
          rowHeight={64}
          rowBorderColor="#F1F3F5"
          onRowClick={(a) => setDeck(a)}
        />
      </TableShell>

      {deck && (
        <ActionDeckModal
          action={deck}
          resolvedLabel={resolved[deck.id] ?? null}
          onResolve={(label) =>
            setResolved((r) => {
              if (label === null) {
                const next = { ...r };
                delete next[deck.id];
                return next;
              }
              return { ...r, [deck.id]: label };
            })
          }
          onClose={() => setDeck(null)}
        />
      )}
    </div>
  );
}

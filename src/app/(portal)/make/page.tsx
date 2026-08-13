"use client";

import { useCallback, useMemo, useState } from "react";
import { Gauge } from "@phosphor-icons/react";
import {
  AiStar,
  Button,
  DataTable,
  EmptyState,
  KpiBreakdownCard,
  KpiGrid,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { usePersona } from "@/context/PersonaContext";
import { useRun } from "@/context/RunContext";
import { useScope } from "@/context/ScopeContext";
import { useDetailDrawer } from "@/context/DetailDrawerContext";
import { plantLabel } from "@/types/division";
import { CATEGORY_OF, LANE_TAB, MAKE_ACTIONS, type MakeAction } from "@/types/action";
import { SHIFT_KPIS } from "@/data/run-data";
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
export default function MakePage() {
  const { plant } = useScope();
  const { profile } = usePersona();
  const { status, workOrderRaised } = useRun();
  const { open: openDetail } = useDetailDrawer();

  const [tab, setTab] = useState<TabId>("person");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deck, setDeck] = useState<MakeAction | null>(null);

  // The re-sequence row leaves the queue once a person has chosen an option,
  // so the list empties as the shift is worked rather than staying static.
  const isSettled = useCallback(
    (a: MakeAction) =>
      (a.kind === "resequence" && status !== "open") ||
      (a.kind === "workorder" && workOrderRaised),
    [status, workOrderRaised],
  );

  const rows = useMemo(
    () =>
      MAKE_ACTIONS.filter((a) => {
        const settled = isSettled(a);
        return tab === "person" ? a.lane !== "auto" && !settled : a.lane === "auto" || settled;
      }),
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
        key: "raised",
        label: "Raised by",
        width: 108,
        cell: (row) => (
          <span className="flex flex-col" style={{ gap: 1 }}>
            <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
              {row.agent}
            </span>
            <span
              className="type-caption"
              style={{ color: "var(--ds-text-secondary)", fontVariantNumeric: "tabular-nums" }}
            >
              {row.at}
            </span>
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
                  <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                    {profile.name}
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
    [openAction, tab, isSettled, profile.name],
  );

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

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
          Make · Rowan · {plantLabel(plant)}
        </span>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--ds-text-primary)",
          }}
        >
          {counts.person > 0
            ? `${counts.person} decision${counts.person === 1 ? " needs" : "s need"} you this shift`
            : "Nothing needs you this shift"}
        </h1>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
          Rowan reads the run against the released plan and raises what matters, to whom — with the
          options already costed. {profile.name}{" "}
          owns these calls.
        </p>
      </header>

      {/* What Marcus is answerable for this shift. These sit above
          the queue because they're the standing scorecard the decisions move —
          not evidence for any one of them. Each opens its own reading. */}
      <KpiGrid columns={4}>
        {SHIFT_KPIS.map((k) => (
          <KpiBreakdownCard
            key={k.kind}
            title={k.title}
            value={k.value}
            subtitle={k.delta}
            onClick={() => openDetail("kpi", k.kind)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openDetail("kpi", k.kind);
              }
            }}
            style={{ cursor: "pointer" }}
          />
        ))}
      </KpiGrid>

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
        />
      </TableShell>

      {deck && <ActionDeckModal action={deck} onClose={() => setDeck(null)} />}
    </div>
  );
}

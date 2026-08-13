"use client";

import { useCallback, useMemo, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import {
  AiStar,
  Button,
  DataTable,
  EmptyState,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { usePersona } from "@/context/PersonaContext";
import { useQuality } from "@/context/QualityContext";
import { useScope } from "@/context/ScopeContext";
import { plantLabel } from "@/types/division";
import { GRADE_LABEL, ROLLS, type RollRow } from "@/types/quality";
import DrillLink from "@/components/ui/DrillLink";
import GradeDeckModal from "./_components/GradeDeckModal";
import MarginBridge from "./_components/MarginBridge";

type TabId = "person" | "graded";

/**
 * Quality is the grading queue — the same decision-queue shape as Make.
 *
 * Claims live on their own surface (`/quality/claims`): grading is this
 * shift's work with a roll on a trolley, a claim is weeks old and asks which
 * decision caused it. Same vocabulary, different clocks.
 */
export default function QualityPage() {
  const { plant } = useScope();
  const { profile } = usePersona();
  const { grades } = useQuality();

  const [tab, setTab] = useState<TabId>("person");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deck, setDeck] = useState<RollRow | null>(null);

  const isGraded = useCallback(
    (r: RollRow) => Boolean(r.graded) || grades.has(r.id),
    [grades],
  );

  const rows = useMemo(
    () => ROLLS.filter((r) => (tab === "person" ? !isGraded(r) : isGraded(r))),
    [tab, isGraded],
  );

  const counts = {
    person: ROLLS.filter((r) => !isGraded(r)).length,
    graded: ROLLS.filter(isGraded).length,
  };

  const columns = useMemo<DataTableColumn<RollRow>[]>(
    () => [
      {
        key: "roll",
        label: "Roll",
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
              {row.qty} lin yd · {row.at}
            </span>
          </div>
        ),
      },
      {
        key: "origin",
        label: "Batch & lot",
        width: 132,
        stopRowClick: true,
        cell: (row) => (
          <span className="flex flex-col" style={{ gap: 2 }}>
            <DrillLink kind="batch" id={row.batch}>
              {row.batch}
            </DrillLink>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {row.dyeLot}
            </span>
          </span>
        ),
      },
      {
        key: "measured",
        label: "Measured",
        width: 176,
        // The reading and its tolerance together — a number without the line
        // it crossed doesn't support a decision.
        cell: (row) => (
          <span className="flex items-center" style={{ gap: 9 }}>
            {row.measured.swatch && <ShadeSwatch {...row.measured.swatch} />}
            <span className="flex flex-col" style={{ gap: 1 }}>
              <span
                className="type-body"
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: row.measured.pass ? "var(--ds-text-primary)" : "var(--text-danger)",
                }}
              >
                {row.measured.label} {row.measured.actual}
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                tolerance {row.measured.tolerance}
              </span>
            </span>
          </span>
        ),
      },
      {
        key: "risk",
        label: "Margin at risk",
        width: 122,
        cell: (row) => (
          <span
            className="type-body"
            style={{
              fontVariantNumeric: "tabular-nums",
              color: row.atRisk > 0 ? "var(--text-danger)" : "var(--ds-text-secondary)",
            }}
          >
            {row.atRisk > 0 ? `$${row.atRisk.toLocaleString()}` : "—"}
          </span>
        ),
      },
      {
        key: "insight",
        label: "Recommendation",
        minWidth: 200,
        headerCell: () => (
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <AiStar size={14} />
            <span>Recommendation</span>
          </span>
        ),
        cell: (row) => (
          <span
            className="flex flex-col"
            style={{ gap: 1, maxWidth: 230 }}
            title={row.escalation}
          >
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
      ...(tab === "graded"
        ? [
            {
              key: "gradedBy",
              label: "Graded by",
              width: 150,
              cell: (row: RollRow) => {
                const byPerson = grades.has(row.id);
                return (
                  <span className="flex flex-col" style={{ gap: 1 }}>
                    {byPerson ? (
                      <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                        {profile.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center" style={{ gap: 6 }}>
                        <AiStar size={14} />
                        <span className="type-body" style={{ color: "var(--color-iris-700)" }}>
                          {row.gradedBy?.name ?? "Wren"}
                        </span>
                      </span>
                    )}
                    <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                      {GRADE_LABEL[grades.get(row.id) ?? row.graded ?? "first"]}
                    </span>
                  </span>
                );
              },
            } satisfies DataTableColumn<RollRow>,
          ]
        : []),
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
              {isGraded(row) ? "Open" : "Grade"}
            </Button>
          </span>
        ),
      },
    ],
    [tab, grades, isGraded, profile.name],
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
          Quality · Wren · {plantLabel(plant)}
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
            ? `${counts.person} roll${counts.person === 1 ? " needs" : "s need"} a grade`
            : "Every roll is graded"}
        </h1>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
          Wren grades at end of line and escalates what a person should decide. It never grades the
          product itself — {profile.name}{" "}
          sets every borderline call.
        </p>
      </header>

      {/* The margin bridge opens the page: the headline number only matters
          because a named share of it traces to one scheduling decision. */}
      <MarginBridge />

      <TableShell
        title="Inspection queue"
        icon={ShieldCheck}
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
            label: "Needs you",
            badge: counts.person,
            tone: counts.person > 0 ? "critical" : undefined,
          },
          { id: "graded", label: "Graded", badge: counts.graded },
        ]}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id as TabId);
          setPage(1);
        }}
        columns={columns}
        emptyState={
          <EmptyState
            icon={<ShieldCheck weight="duotone" style={{ width: 24, height: 24 }} />}
            title="Nothing waiting on a person"
            description="Every roll off the line this shift graded inside the limits set for this plant."
          />
        }
      >
        <DataTable<RollRow>
          columns={columns}
          data={pageRows}
          rowKey={(r) => r.id}
          rowHeight={64}
          rowBorderColor="#F1F3F5"
        />
      </TableShell>

      {deck && <GradeDeckModal roll={deck} onClose={() => setDeck(null)} />}
    </div>
  );
}

/**
 * Standard against measured, as one split chip — the way an inspector actually
 * compares shade, by holding the two next to each other.
 *
 * It is deliberately *only* an orientation aid. A ΔE is a spectrophotometer
 * reading; an sRGB fill on an uncalibrated monitor can't settle a shade call,
 * which is why the number stays and stays first in the reading order.
 */
function ShadeSwatch({ standard, actual }: { standard: string; actual: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0"
      title={`Standard ${standard} · measured ${actual}`}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(24, 24, 27, 0.16)",
      }}
    >
      <span style={{ flex: 1, background: standard }} />
      <span
        style={{ flex: 1, background: actual, boxShadow: "inset 1px 0 0 rgba(255, 255, 255, 0.65)" }}
      />
    </span>
  );
}

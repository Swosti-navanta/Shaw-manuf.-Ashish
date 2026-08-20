"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AiStar, Button, LineChart, SegmentedControl, Select } from "@navanta-ai/design-system";
import { CalendarBlank, DownloadSimple, X } from "@phosphor-icons/react";
import { useChatPanel } from "@/context/ChatPanelContext";
import {
  DEFECT_GRID,
  DEFECT_POSITIONS,
  DEFECT_STATIONS,
} from "@/types/quality";
import {
  COMMITMENT_KPIS,
  DOWNTIME_CAUSES,
  MARGIN_TREND,
  MFG_KPIS,
  OEE_TREND,
  POVA_CURRENT_PERIOD,
  POVA_DETAIL,
  POVA_PERIODS,
  YIELD_TREND,
  buildPova,
  type Bar,
  type Kpi,
  type PovaComparison,
  type PovaRow,
} from "@/data/performance-analytics";
import LaborAnalysis from "./_components/LaborAnalysis";
import AttentionBand from "./_components/AttentionBand";
import PovaAnalysis from "./_components/PovaAnalysis";
import LineHealth from "./_components/LineHealth";

type View = "exec" | "mfg" | "machine" | "labor";

const HEAT_RAMP = ["var(--surface-sunken)", "#FEF0C7", "#FEDF89", "#FEC84B", "#F79009", "#D92D20"];
const CELL_STOP = [0, 1, 4, 5];

/**
 * Performance — where the money is and where the line is hurting. One toggle:
 * Executive (financial), MFG (OEE / yield / downtime) or Labor (overtime, the
 * P13 tracker). Every card drills to the surface that can act on it, and the
 * analytics cards explain themselves through the agent panel.
 */
export default function PerformancePage() {
  const router = useRouter();
  const { startTask } = useChatPanel();
  const agent = "Roll-up";
  const [view, setView] = useState<View>("exec");
  /* POVA's clock. One control now: which four weeks. The comparison is always
     budget — the table IS actual against budget, and "vs prior period" / "vs
     same period LY" were three ways to ask a question only one of which the
     figures answered. */
  const [period, setPeriod] = useState(POVA_CURRENT_PERIOD);
  const comparison: PovaComparison = "budget";
  const [povaDrawer, setPovaDrawer] = useState<PovaRow | null>(null);
  const periodMeta = POVA_PERIODS.find((pp) => pp.id === period) ?? POVA_PERIODS[1];
  // The period bar is a live dial: the summary tiles, the eight-row table and
  // variance-by-plant are all derived from (period, comparison), recomputed
  // whenever either toggle moves.
  const pova = useMemo(() => buildPova(period, comparison), [period, comparison]);
  const comparisonLabel = "vs budget";

  // A Because card's CTA routes into the view that answers it.
  const followCta = (cta: string) => {
    setPovaDrawer(null);
    if (/Labor/.test(cta)) setView("labor");
    else if (/Machine health/.test(cta)) setView("machine");
    else if (/Manufacturing/.test(cta)) setView("mfg");
    else if (/Make/.test(cta)) router.push("/make?action=act-promise");
  };

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <header className="flex items-start justify-between flex-wrap" style={{ gap: 16 }}>
        <div className="flex flex-col" style={{ gap: 4 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.11em",
              textTransform: "uppercase",
              color: "var(--ds-text-placeholder, var(--text-muted))",
            }}
          >
            Performance · Roll-up · All plants
          </span>
          <h1
            style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ds-text-primary)" }}
          >
            Where the money is and where the line is hurting
          </h1>
          <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
            POVA is the financial read — actual against budget across the eight categories the plant
            SOPs define. Manufacturing, Machine health and Labor each answer why a category moved.
            What crosses a threshold becomes a decision on Make.
          </p>
        </div>
        {/* Export the current period's reports. Visual for now — the wiring to
            a TM1 / CSV pull lands when the data source is connected. */}
        <Button variant="outline" size="sm" iconLeft={<DownloadSimple size={14} weight="bold" />}>
          Export
        </Button>
      </header>

      <SegmentedControl
        value={view}
        onValueChange={(v) => setView(v as View)}
        aria-label="Performance view"
        options={[
          { value: "exec", label: "Overall" },
          { value: "mfg", label: "Manufacturing" },
          { value: "machine", label: "Machine health" },
          { value: "labor", label: "Labor" },
        ]}
      />

      {/* The period bar is POVA's clock, and POVA is the Overall view. The
          other views are the "why" behind it — Manufacturing and Labor carry
          their own time framing (12-period, 3wk MA) and have no budget variance
          to compare against, so the bar would only mislead there; Machine
          health is live and keeps its own realtime/historical toggle. */}
      {view === "exec" && (
        <div
          className="flex items-center justify-between flex-wrap"
          style={{
            gap: 12,
            padding: "8px 12px",
            borderRadius: 12,
            background: "var(--surface-base)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
          }}
        >
          <span className="flex items-center" style={{ gap: 10 }}>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              Four weeks to
            </span>
            {/* A dropdown rather than three segments: the labels are date ranges
                now, and three of those side by side is a wall of dates. */}
            <Select value={period} onValueChange={setPeriod}>
              <Select.Trigger size="sm" aria-label="Period" className="w-[184px]">
                <span
                  className="min-w-0 items-center"
                  style={{ display: "flex", gap: 7, whiteSpace: "nowrap" }}
                >
                  <CalendarBlank
                    size={15}
                    weight="duotone"
                    className="shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <Select.Value />
                </span>
              </Select.Trigger>
              <Select.Content>
                {POVA_PERIODS.map((pp) => (
                  <Select.Item key={pp.id} value={pp.id}>
                    {pp.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            actual vs budget
          </span>
        </div>
      )}

      {/* Machine health — the live line, moved here from Make. Any action that
          crosses a threshold redirects to the decision queue with its deck
          open, because deciding happens on Make, not here. */}
      {view === "machine" && (
        <LineHealth onOpenAction={(id) => router.push(`/make?action=${id}`)} />
      )}

      {view === "exec" && (
        <div className="flex flex-col" style={{ gap: 16 }}>
          {/* Commitment strip — the operational context that explains the
              variance. Demoted above the spine, not the spine. */}
          <KpiRow kpis={COMMITMENT_KPIS} />

          {/* POVA summary — the three numbers the period rolls up to. */}
          <div className="grid" style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {[
              { k: "Total operating variance", v: pova.summary.totalVariance, sub: pova.summary.totalPct, bad: true },
              { k: "Worst category", v: pova.summary.worstCategory.split(" · ")[0], sub: pova.summary.worstCategory.split(" · ")[1], bad: true },
              { k: "Cost per SY", v: pova.summary.costPerSy.split(" / ")[0], sub: `budget ${pova.summary.costPerSy.split(" / ")[1]}` },
            ].map((t) => (
              <div
                key={t.k}
                className="flex flex-col"
                style={{
                  gap: 2,
                  padding: "13px 14px",
                  borderRadius: 12,
                  background: "var(--surface-base)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
                }}
              >
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{t.k}</span>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.15,
                    color: t.bad ? "var(--text-danger)" : "var(--ds-text-primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.v}
                </span>
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{t.sub}</span>
              </div>
            ))}
          </div>

          {/* THE POVA TABLE — the core artifact. Eight rows in SOP order,
              unfavorable first; every row names its factor codes and the one
              view that answers its "why". */}
          <PovaAnalysis period={period} build={pova} />

          <Panel
            title={`Plant operating variance · actual ${comparisonLabel}`}
            scope={`${periodMeta.label} · ${comparisonLabel} · click a row for the breakdown`}
          >
            <PovaTable
              rows={pova.rows}
              onOpen={(r) => setPovaDrawer(r)}
              onDrill={(r) => {
                if (r.drillsTo.view) setView(r.drillsTo.view);
                else if (r.drillsTo.href) router.push(r.drillsTo.href);
              }}
            />
          </Panel>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}>
            {/* The by-plant list used to sit here as its own panel. It is a
                lens on the decomposition above now — the same figures in two
                places is the thing that drifts. */}
            {/* Forward exposure — a different clock from POVA's backward spend,
                so it supports the table rather than sitting beside it as a peer. */}
            <Panel title="Margin at risk · forward exposure" scope="supporting context · from TM1">
              <Trend series={MARGIN_TREND} unit="k" color="var(--text-danger)" />
            </Panel>
          </div>

          {/* Last, because it is the conclusion: everything above explains why a
              number moved, and this names what crossed a limit while doing so. */}
          <AttentionBand onOpenMake={(id) => router.push(`/make?action=${id}`)} />
        </div>
      )}

      {view === "mfg" && (
        <div className="flex flex-col" style={{ gap: 16 }}>
          <KpiRow kpis={MFG_KPIS} />
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}>
            <Panel title="OEE · Backing 2 · 12 periods" scope="feeds POVA · Production efficiency">
              <Trend series={OEE_TREND} unit="%" color="var(--text-warning, #F79009)" />
            </Panel>
            <Panel title="Downtime causes · 12 periods" scope="hours and dollars · each cause feeds a POVA category">
              <div className="flex flex-col" style={{ gap: 12 }}>
                {DOWNTIME_CAUSES.map((b) => (
                  <div key={b.label} className="flex items-center" style={{ gap: 12 }}>
                    <span className="flex flex-col shrink-0" style={{ gap: 1, width: 128 }}>
                      <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>{b.label}</span>
                      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{b.sub}</span>
                    </span>
                    <span aria-hidden="true" className="flex-1" style={{ height: 10, borderRadius: 999, background: "var(--surface-sunken)" }}>
                      <span
                        style={{
                          display: "block",
                          height: "100%",
                          width: `${b.pct}%`,
                          borderRadius: 999,
                          background: b.tone === "hot" ? "var(--text-danger)" : b.tone === "ok" ? "var(--text-success)" : "var(--color-iris-500, #7C6BF0)",
                        }}
                      />
                    </span>
                    <span className="shrink-0 inline-flex items-baseline justify-end" style={{ width: 96, gap: 8 }}>
                      <span className="type-body-medium" style={{ color: "var(--ds-text-primary)", fontVariantNumeric: "tabular-nums" }}>{b.value}</span>
                      <span className="type-body" style={{ color: "var(--text-danger)", fontVariantNumeric: "tabular-nums" }}>{b.usd}</span>
                    </span>
                    <span
                      className="type-caption shrink-0"
                      style={{
                        padding: "2px 9px",
                        borderRadius: 999,
                        background: "var(--color-iris-50)",
                        border: "1px solid var(--color-iris-200)",
                        color: "var(--color-iris-700)",
                        whiteSpace: "nowrap",
                      }}
                      title="The POVA category this cause feeds"
                    >
                      {b.pova}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}>
            <Panel title="Defects by station × position" scope="feeds POVA · Waste and scrap">
              <Heatmap />
            </Panel>
            <Panel title="Defect rate · Backing 2 · 12 periods" scope="feeds POVA · Waste and scrap">
              <Trend series={YIELD_TREND} unit="%" color="var(--text-danger)" />
            </Panel>
          </div>

        </div>
      )}

      {/* Labor — the analysis workbench. Pure analysis, process-scoped; the
          only forward path is the pointer to Make, where decisions live. */}
      {view === "labor" && (
        <LaborAnalysis
          onOpenMake={(id) => router.push(id ? `/make?action=${id}` : "/make")}
        />
      )}

      {povaDrawer && (
        <PovaDrawer row={povaDrawer} onFollow={followCta} onClose={() => setPovaDrawer(null)} />
      )}
    </div>
  );
}

/* ── KPI row — separated cards, matches Make ────────────────────────────── */

function KpiRow({ kpis }: { kpis: ReadonlyArray<Kpi> }) {
  const ink = (t?: Kpi["tone"]) =>
    t === "bad"
      ? "var(--text-danger)"
      : t === "warn"
        ? "var(--text-warning, #B7791F)"
        : t === "good"
          ? "var(--text-success)"
          : "var(--ds-text-primary)";
  return (
    <div
      className="grid"
      style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
    >
      {kpis.map((k) => (
        <div
          key={k.key}
          className="flex flex-col"
          style={{
            gap: 2,
            padding: "13px 14px",
            borderRadius: 12,
            background: "var(--surface-base)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
          }}
        >
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{k.label}</span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              color: ink(k.tone),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {k.value}
          </span>
          <span
            className="type-caption"
            style={{
              color: "var(--ds-text-secondary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: 2,
            }}
            title={k.detail}
          >
            {k.detail}
          </span>
        </div>
      ))}
    </div>
  );
}

function Trend({ series, unit, color }: { series: ReadonlyArray<{ label: string; value: number }>; unit?: string; color?: string }) {
  return (
    <LineChart
      data={series.map((p) => ({ label: p.label, value: p.value }))}
      height={150}
      smooth
      showArea
      showGrid
      showXAxisLabels
      lineColor={color}
      formatValue={(v) => `${unit === "k" ? "$" : ""}${v}${unit && unit !== "k" ? ` ${unit}` : unit === "k" ? "k" : ""}`}
    />
  );
}

function BarList({ bars, onExplain }: { bars: ReadonlyArray<Bar>; onExplain: (b: Bar) => void }) {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {bars.map((b) => (
        <div key={b.label} className="flex items-center" style={{ gap: 12 }}>
          <span className="flex flex-col shrink-0" style={{ gap: 1, width: 128 }}>
            <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>{b.label}</span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{b.sub}</span>
          </span>
          <span aria-hidden="true" className="flex-1" style={{ height: 10, borderRadius: 999, background: "var(--surface-sunken)" }}>
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${b.pct}%`,
                borderRadius: 999,
                background: b.tone === "hot" ? "var(--text-danger)" : b.tone === "ok" ? "var(--text-success)" : "var(--color-iris-500, #7C6BF0)",
              }}
            />
          </span>
          <span className="shrink-0 inline-flex items-baseline justify-end" style={{ width: 108, gap: 6 }}>
            <span className="type-body-medium" style={{ color: "var(--ds-text-primary)", fontVariantNumeric: "tabular-nums" }}>{b.value}</span>
            {b.delta && (
              <span
                className="type-caption"
                style={{
                  color: b.deltaTone === "good" ? "var(--text-success)" : b.deltaTone === "flat" ? "var(--ds-text-secondary)" : b.deltaTone === "bad" ? "var(--text-danger)" : "var(--color-iris-700)",
                }}
              >
                {b.delta}
              </span>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onExplain(b)} iconLeft={<AiStar size={13} />}>
            Explain
          </Button>
        </div>
      ))}
    </div>
  );
}

function Heatmap() {
  const rowTotals = DEFECT_GRID.map((r) => r.reduce((n, v) => n + v, 0));
  const hot = rowTotals.indexOf(Math.max(...rowTotals));
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {DEFECT_STATIONS.map((station, r) => (
        <div key={station} className="flex items-center" style={{ gap: 10 }}>
          <span
            className="type-caption shrink-0"
            style={{ width: 66, textAlign: "right", color: r === hot ? "var(--color-iris-700)" : "var(--ds-text-secondary)", fontWeight: r === hot ? 600 : undefined }}
          >
            {station}
          </span>
          <div className="flex flex-1" style={{ gap: 6 }}>
            {DEFECT_GRID[r].map((intensity, c) => (
              <span key={c} aria-hidden="true" style={{ flex: 1, height: 22, borderRadius: 6, background: HEAT_RAMP[CELL_STOP[intensity]] }} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center" style={{ gap: 10, marginTop: 2 }}>
        <span className="shrink-0" style={{ width: 66 }} />
        <div className="flex flex-1" style={{ gap: 6 }}>
          {DEFECT_POSITIONS.map((p) => (
            <span key={p} className="type-caption flex-1 text-center" style={{ color: "var(--ds-text-secondary)" }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

type Cell = string | { text: string; tone?: "bad" | "good" | "flat"; right?: boolean };
function SimpleTable({ head, rows }: { head: string[]; rows: { key: string; flag?: boolean; cells: Cell[] }[] }) {
  const ink = (t?: "bad" | "good" | "flat") =>
    t === "bad" ? "var(--text-danger)" : t === "good" ? "var(--text-success)" : t === "flat" ? "var(--ds-text-secondary)" : "var(--ds-text-primary)";
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className="type-caption"
                style={{
                  textAlign: i >= head.length - 1 ? "right" : "left",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ds-text-placeholder, var(--text-muted))",
                  fontWeight: 500,
                  padding: "0 12px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ borderTop: "1px solid var(--border-light)" }}>
              {r.cells.map((c, i) => {
                const obj = typeof c === "string" ? { text: c } : c;
                return (
                  <td
                    key={i}
                    className="type-body"
                    style={{
                      padding: "10px 12px",
                      textAlign: obj.right || i >= r.cells.length - 1 ? "right" : "left",
                      fontVariantNumeric: "tabular-nums",
                      color: ink(typeof c === "string" ? undefined : c.tone),
                      fontWeight: r.flag && i === 0 ? 600 : undefined,
                    }}
                  >
                    {obj.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ title, scope, children }: { title: string; scope?: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border-default)" }}
      >
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>{title}</span>
        {scope && <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{scope}</span>}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </section>
  );
}


/* ── POVA table — the core artifact of the Overall view ──────────────────── */

function PovaTable({
  rows,
  onOpen,
  onDrill,
}: {
  rows: ReadonlyArray<PovaRow>;
  onOpen: (r: PovaRow) => void;
  onDrill: (r: PovaRow) => void;
}) {
  const TH: React.CSSProperties = {
    textAlign: "left",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--ds-text-placeholder, var(--text-muted))",
    fontWeight: 500,
    padding: "0 12px 8px",
    whiteSpace: "nowrap",
  };
  const TD: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
        <thead>
          <tr>
            <th className="type-caption" style={TH}>Category</th>
            <th className="type-caption" style={{ ...TH, textAlign: "right" }}>Actual</th>
            <th className="type-caption" style={{ ...TH, textAlign: "right" }}>Budget</th>
            <th className="type-caption" style={{ ...TH, textAlign: "right" }}>Variance</th>
            <th className="type-caption" style={{ ...TH, textAlign: "right" }}>Var %</th>
            <th className="type-caption" style={{ ...TH, textAlign: "right" }}>$/SY act · bud</th>
            <th className="type-caption" style={{ ...TH, textAlign: "right" }}>Drills to</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ink = r.unfavorable ? "var(--text-danger)" : "var(--text-success)";
            return (
              <tr
                key={r.category}
                onClick={() => onOpen(r)}
                className="transition-colors hover:bg-[var(--surface-raised)]"
                style={{ borderTop: "1px solid var(--border-light)", cursor: "pointer" }}
                title="Open the category breakdown"
              >
                <td style={TD}>
                  <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>{r.category}</span>
                </td>
                <td className="type-body" style={{ ...TD, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>{r.actual}</td>
                <td className="type-body" style={{ ...TD, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ds-text-secondary)" }}>{r.budget}</td>
                <td className="type-body-medium" style={{ ...TD, textAlign: "right", fontVariantNumeric: "tabular-nums", color: ink }}>{r.variance}</td>
                <td className="type-body" style={{ ...TD, textAlign: "right", fontVariantNumeric: "tabular-nums", color: ink }}>{r.variancePct}</td>
                <td className="type-body" style={{ ...TD, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>{r.perSy}</td>
                <td style={{ ...TD, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  {r.drillsTo.view || r.drillsTo.href ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDrill(r)}
                      title={r.drillsTo.note ? `⚠ ${r.drillsTo.note}` : undefined}
                    >
                      {r.drillsTo.label}
                      {r.drillsTo.note ? " ⚠" : ""}
                    </Button>
                  ) : (
                    <span className="type-caption" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── POVA category drawer — variance detail + the Because cards ──────────── */

function PovaDrawer({
  row,
  onFollow,
  onClose,
}: {
  row: PovaRow;
  onFollow: (cta: string) => void;
  onClose: () => void;
}) {
  const detail = POVA_DETAIL[row.category];
  const ink = row.unfavorable ? "var(--text-danger)" : "var(--text-success)";
  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-end"
      style={{ background: "rgba(15, 16, 35, 0.4)" }}
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`POVA · ${row.category}`}
        className="flex flex-col h-full"
        style={{
          width: "min(460px, 92vw)",
          background: "var(--surface-base)",
          boxShadow: "-16px 0 48px rgba(15,16,35,.22)",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between shrink-0"
          style={{ gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex flex-col" style={{ gap: 3 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: "var(--ds-text-primary)" }}>{row.category}</span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {row.actual} actual · {row.budget} budget
            </span>
            <span className="type-body-medium" style={{ color: ink, fontVariantNumeric: "tabular-nums" }}>
              {row.variance} · {row.variancePct}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} weight="bold" />
          </Button>
        </div>

        <div className="flex flex-col flex-1" style={{ padding: 20, gap: 16 }}>
          {detail ? (
            <>
              <div className="flex flex-col" style={{ gap: 8 }}>
                <span
                  className="type-caption"
                  style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-text-placeholder, var(--text-muted))" }}
                >
                  Where it concentrates
                </span>
                <div style={{ borderRadius: 10, border: "1px solid var(--border-default)", overflow: "hidden" }}>
                  {detail.concentration.map((c, i) => (
                    <div
                      key={c.label}
                      className="flex items-center justify-between"
                      style={{
                        gap: 12,
                        padding: "9px 14px",
                        borderBottom: i < detail.concentration.length - 1 ? "1px solid var(--border-light)" : undefined,
                      }}
                    >
                      <span className="type-caption shrink-0" style={{ color: "var(--ds-text-secondary)" }}>{c.label}</span>
                      <span className="type-body" style={{ color: "var(--ds-text-primary)", textAlign: "right" }}>{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col" style={{ gap: 8 }}>
                <span
                  className="type-caption"
                  style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-text-placeholder, var(--text-muted))" }}
                >
                  Because
                </span>
                {detail.because.map((bc) => (
                  <div
                    key={bc.line}
                    className="flex flex-col"
                    style={{
                      gap: 8,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "var(--color-iris-50)",
                      border: "1px solid var(--color-iris-200)",
                    }}
                  >
                    <span className="type-body" style={{ color: "var(--ds-text-primary)", lineHeight: 1.5 }}>
                      {bc.line}
                    </span>
                    <Button variant="outline" size="sm" style={{ alignSelf: "flex-start" }} onClick={() => onFollow(bc.cta)}>
                      {bc.cta}
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <span className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
              {row.unfavorable
                ? "No concentration recorded for this category this period — the variance is spread thin rather than driven by one place."
                : "Favorable this period — nothing to chase."}
              {row.drillsTo.note ? ` ⚠ ${row.drillsTo.note}.` : ""}
            </span>
          )}
        </div>
      </aside>
    </div>
  );
}

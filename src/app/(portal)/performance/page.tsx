"use client";

import { useState } from "react";
import { AiStar, Button, LineChart, SegmentedControl } from "@navanta-ai/design-system";
import { useScope } from "@/context/ScopeContext";
import { useChatPanel } from "@/context/ChatPanelContext";
import { plantLabel } from "@/types/division";
import {
  DEFECT_GRID,
  DEFECT_POSITIONS,
  DEFECT_STATIONS,
} from "@/types/quality";
import {
  DOWNTIME_CAUSES,
  EXEC_KPIS,
  LABOR_KPIS,
  MARGIN_TREND,
  MFG_KPIS,
  OEE_TREND,
  OT_BY_COST_CENTER,
  OT_BY_EMPLOYEE,
  OT_BY_PROCESS,
  OT_TREND,
  RISK_BY_CAUSE,
  RISK_BY_PLANT,
  YIELD_TREND,
  type Bar,
  type Kpi,
} from "@/data/performance-analytics";
import { explainCauseTask, explainOtDriftTask } from "@/data/performance-flows";

type View = "exec" | "mfg" | "labor";
type LaborTab = "proc" | "cc" | "emp";

const HEAT_RAMP = ["var(--surface-sunken)", "#FEF0C7", "#FEDF89", "#FEC84B", "#F79009", "#D92D20"];
const CELL_STOP = [0, 1, 4, 5];

/**
 * Performance — where the money is and where the line is hurting. One toggle:
 * Executive (financial), MFG (OEE / yield / downtime) or Labor (overtime, the
 * P13 tracker). Every card drills to the surface that can act on it, and the
 * analytics cards explain themselves through the agent panel.
 */
export default function PerformancePage() {
  const { plant } = useScope();
  const { startTask } = useChatPanel();
  const agent = "Roll-up";
  const [view, setView] = useState<View>("exec");
  const [ltab, setLtab] = useState<LaborTab>("proc");

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
          Performance · Roll-up · {plantLabel(plant)}
        </span>
        <h1
          style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ds-text-primary)" }}
        >
          Where the money is and where the line is hurting
        </h1>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
          One toggle — executive (financial, margin, attainment), MFG (OEE, yield, downtime causes)
          or labor (overtime, the P13 tracker). Every card drills to the surface that can act on it.
        </p>
      </header>

      <SegmentedControl
        value={view}
        onValueChange={(v) => setView(v as View)}
        aria-label="Performance view"
        options={[
          { value: "exec", label: "Executive" },
          { value: "mfg", label: "MFG" },
          { value: "labor", label: "Labor" },
        ]}
      />

      {view === "exec" && (
        <div className="flex flex-col" style={{ gap: 16 }}>
          <KpiRow kpis={EXEC_KPIS} />
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}>
            <Panel title="Margin at risk · 12 weeks" scope="from TM1 · Planning Analytics">
              <Trend series={MARGIN_TREND} unit="k" color="var(--text-danger)" />
            </Panel>
            <Panel title="Where the risk is · by plant" scope="this week">
              <div className="flex flex-col" style={{ gap: 8 }}>
                {RISK_BY_PLANT.map((p) => (
                  <div key={p.plant} className="flex items-center justify-between" style={{ gap: 12 }}>
                    <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>{p.plant}</span>
                    <span
                      className="type-body-medium"
                      style={{ fontVariantNumeric: "tabular-nums", color: p.hot ? "var(--text-danger)" : "var(--ds-text-primary)" }}
                    >
                      {p.value}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <Panel title="Where the risk is going" scope="$142k across five causes · click a cause to explain">
            <BarList bars={RISK_BY_CAUSE} onExplain={(b) => startTask(explainCauseTask(b, agent))} />
          </Panel>
        </div>
      )}

      {view === "mfg" && (
        <div className="flex flex-col" style={{ gap: 16 }}>
          <KpiRow kpis={MFG_KPIS} />
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}>
            <Panel title="OEE · Backing 2 · 12 weeks" scope="Backing 2 is the constraint">
              <Trend series={OEE_TREND} unit="%" color="var(--text-warning, #F79009)" />
            </Panel>
            <Panel title="Downtime causes · 12 weeks" scope="hours lost by category">
              <BarList bars={DOWNTIME_CAUSES} onExplain={(b) => startTask(explainCauseTask(b, agent))} />
            </Panel>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}>
            <Panel title="Defects by station × position" scope="last 4 months · concentrates at edges">
              <Heatmap />
            </Panel>
            <Panel title="Defect rate · Backing 2 · 12 weeks" scope="delamination trend, %">
              <Trend series={YIELD_TREND} unit="%" color="var(--text-danger)" />
            </Panel>
          </div>
        </div>
      )}

      {view === "labor" && (
        <div className="flex flex-col" style={{ gap: 16 }}>
          <span
            className="type-caption"
            style={{
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ds-text-placeholder, var(--text-muted))",
            }}
          >
            Labor &amp; overtime · Plant 13 · Dalton N — the same columns Chris tracks in Excel
          </span>
          <KpiRow kpis={LABOR_KPIS} />
          <SegmentedControl
            size="sm"
            value={ltab}
            onValueChange={(v) => setLtab(v as LaborTab)}
            aria-label="Labor breakdown"
            options={[
              { value: "proc", label: "By process" },
              { value: "cc", label: "By cost center" },
              { value: "emp", label: "Employee detail" },
            ]}
          />

          {ltab === "proc" && (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}>
              <Panel title="OT$/SY by process · 12wk" scope="3wk MA · from P13 tracker">
                <Trend series={OT_TREND} unit="$/SY" color="var(--text-danger)" />
              </Panel>
              <Panel title="Latest week · by process" scope="vs 3wk moving average">
                <BarList bars={OT_BY_PROCESS} onExplain={(b) => startTask(explainOtDriftTask(b, agent))} />
              </Panel>
            </div>
          )}

          {ltab === "cc" && (
            <Panel title="By cost center" scope="this week vs 3wk MA">
              <SimpleTable
                head={["Cost center", "Process", "OT$ this wk", "3wk MA", "Δ vs MA", "Pounds"]}
                rows={OT_BY_COST_CENTER.map((r) => ({
                  key: r.cc + r.process,
                  flag: r.flag,
                  cells: [
                    r.cc,
                    r.process,
                    r.ot,
                    r.ma,
                    { text: r.delta, tone: r.deltaTone },
                    { text: r.pounds, right: true },
                  ],
                }))}
              />
            </Panel>
          )}

          {ltab === "emp" && (
            <Panel title="Employee detail" scope="overtime this week">
              <SimpleTable
                head={["Employee", "Process", "Reg hrs", "OT hrs", "OT rate", "OT$ wk"]}
                rows={OT_BY_EMPLOYEE.map((r) => ({
                  key: r.id,
                  cells: [r.id, r.process, r.reg, r.ot, r.rate, { text: r.otWk, right: true }],
                }))}
              />
            </Panel>
          )}

          <div
            className="flex items-start"
            style={{ gap: 9, padding: "12px 14px", borderRadius: 12, background: "var(--color-iris-50)", border: "1px solid var(--color-iris-200)" }}
          >
            <AiStar size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            <span className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--ds-text-primary)" }}>Same columns as Chris&apos;s Excel</strong>{" "}
              — Total OT$/Tuft SY, 3wk MA, per process — but the engine now watches the bands. Warping
              has broken its band 4 of the last 6 weeks; that reads as a scheduling story, not a labor one.
            </span>
          </div>
        </div>
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
          <div className="flex items-center" style={{ gap: 8, marginTop: 2 }}>
            <span
              className="type-caption"
              style={{
                color: "var(--ds-text-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: "0 1 auto",
              }}
              title={k.detail}
            >
              {k.detail}
            </span>
            <span style={{ flex: "1 1 40px", minWidth: 40, maxWidth: 72, marginLeft: "auto" }}>
              <Sparkline points={k.spark} tone={k.tone} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ points, tone }: { points: ReadonlyArray<number>; tone?: Kpi["tone"] }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const stroke =
    tone === "bad" ? "var(--text-danger)" : tone === "warn" ? "var(--text-warning, #F79009)" : tone === "good" ? "var(--text-success)" : "var(--color-iris-500, #7C6BF0)";
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${20 - ((p - min) / span) * 18 - 1}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ width: "100%", height: 20 }} aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth={1.4} points={d} />
    </svg>
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

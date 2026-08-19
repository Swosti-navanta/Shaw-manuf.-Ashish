"use client";

import { useMemo, useState } from "react";
import { AiStar, Button, Chip, SegmentedControl } from "@navanta-ai/design-system";
import { usePersona } from "@/context/PersonaContext";
import { useChatPanel } from "@/context/ChatPanelContext";
import { stageDetailTask } from "@/data/line-flows";
import {
  PROCESS_STAGES,
  type ProcessStage,
  type StageSeries,
  type StageStatus,
} from "@/data/line-health";

const STATUS: Record<StageStatus, { ink: string; bg: string; border: string; label: string }> = {
  nominal: {
    ink: "var(--text-success)",
    bg: "var(--surface-base)",
    border: "var(--border-default)",
    label: "Nominal",
  },
  watched: {
    ink: "var(--text-warning, #B7791F)",
    bg: "#FEFBF3",
    border: "var(--text-warning, #F79009)",
    label: "Watched",
  },
  under: {
    ink: "var(--text-danger)",
    bg: "var(--surface-danger)",
    border: "var(--border-danger, #FDA29B)",
    label: "Under rate",
  },
};

const SERIES_INK: Record<NonNullable<StageSeries["tone"]>, string> = {
  primary: "var(--color-iris-600, #6941C6)",
  warn: "var(--text-warning, #F79009)",
  hot: "var(--text-danger)",
};

type Range = "realtime" | "history";

/**
 * Line health — machine telemetry across the process. Reading order: the flow
 * strip locates the stage, the trend workbench inspects it (pens, filters,
 * realtime/historical), and the machines table (added next) lists the
 * technical rows behind it. Costed decisions live in the Decision queue tab.
 */
export default function LineHealth() {
  const { profile } = usePersona();
  const { startTask } = useChatPanel();
  const agent = profile.agents[0] ?? "Rowan";
  const initial = PROCESS_STAGES.find((s) => s.status === "under") ?? PROCESS_STAGES[0];
  const [focusId, setFocusId] = useState(initial.id);
  const stage = PROCESS_STAGES.find((s) => s.id === focusId) ?? initial;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* Process flow — the map. Sequence reads left-to-right on its own; the
          arrows were noise. Chips are ordered by the line, coloured by state. */}
      <Panel title="Process flow · live · Line A" scope="click a stage to inspect it">
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))", gap: 8 }}
        >
          {PROCESS_STAGES.map((s, i) => (
            <StageChip
              key={s.id}
              index={i + 1}
              stage={s}
              active={s.id === focusId}
              onClick={() => setFocusId(s.id)}
            />
          ))}
        </div>
      </Panel>

      {/* Trend workbench — full width. Chart left, pen table right. */}
      <Workbench
        stage={stage}
        onDetail={() => startTask(stageDetailTask(stage, agent))}
      />

      {/* Machines table for the selected stage goes here in step 2. */}
    </div>
  );
}

function Workbench({ stage, onDetail }: { stage: ProcessStage; onDetail: () => void }) {
  const [range, setRange] = useState<Range>("realtime");
  // null = all pens; otherwise the single selected metric.
  const [pen, setPen] = useState<string | null>(null);

  // Reset the pen filter when the stage changes — a metric filter for one
  // stage means nothing on another.
  const stageKey = stage.id;
  const [lastStage, setLastStage] = useState(stageKey);
  if (stageKey !== lastStage) {
    setLastStage(stageKey);
    setPen(null);
    setRange("realtime");
  }

  const visible = useMemo(
    () => stage.focus.filter((s) => pen === null || s.metric === pen),
    [stage, pen],
  );

  const primary = stage.focus[0];
  const yLabel =
    pen === null
      ? `${primary?.metric ?? ""}${primary?.unit ? ` (${primary.unit})` : ""} · others scaled to band`
      : (() => {
          const s = stage.focus.find((f) => f.metric === pen);
          return `${s?.metric ?? ""}${s?.unit ? ` (${s.unit})` : ""}`;
        })();

  return (
    <section
      style={{
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        overflow: "hidden",
      }}
    >
      {/* Header: stage name + range toggle + chat CTA. */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border-default)" }}
      >
        <span className="flex flex-col" style={{ gap: 1 }}>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            Trend workbench · {stage.name}
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {range === "realtime" ? "last 60 min · live from Ignition" : "last 12 weeks · weekly average"}
          </span>
        </span>
        <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
          <SegmentedControl
            size="sm"
            value={range}
            onValueChange={(v) => setRange(v as Range)}
            aria-label="Trend range"
            options={[
              { value: "realtime", label: "Realtime" },
              { value: "history", label: "Historical" },
            ]}
          />
          <Button variant="outline" size="sm" onClick={onDetail} iconLeft={<AiStar size={13} />}>
            Read in chat
          </Button>
        </span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Pen filter chips — All, then one per pen. */}
        <div className="flex items-center flex-wrap" style={{ gap: 6, marginBottom: 12 }}>
          <Chip selected={pen === null} onClick={() => setPen(null)}>
            All pens
          </Chip>
          {stage.focus.map((s) => (
            <Chip key={s.metric} selected={pen === s.metric} onClick={() => setPen(s.metric)}>
              {s.metric}
            </Chip>
          ))}
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(240px, 2fr)", gap: 16, alignItems: "stretch" }}
        >
          {/* Chart with axis labels. */}
          <div className="flex flex-col" style={{ gap: 6, minWidth: 0 }}>
            <MultiTrend series={visible} range={range} single={pen !== null} />
            <div className="flex items-center justify-between" style={{ gap: 12 }}>
              <span className="type-caption" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>
                Y · {yLabel}
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>
                X · {range === "realtime" ? "time (last 60 min)" : "week"}
              </span>
            </div>
            <div className="flex flex-wrap" style={{ gap: 12 }}>
              {visible.map((s) => {
                const pts = range === "history" && s.history ? s.history : s.points;
                const last = pts[pts.length - 1]?.v;
                return (
                  <span
                    key={s.metric}
                    className="inline-flex items-center type-caption"
                    style={{ gap: 6, color: "var(--ds-text-secondary)" }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ width: 12, height: 3, borderRadius: 2, background: SERIES_INK[s.tone ?? "primary"] }}
                    />
                    {s.metric}
                    <span style={{ color: "var(--ds-text-primary)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                      {last}
                      {s.unit ? ` ${s.unit}` : ""}
                    </span>
                  </span>
                );
              })}
              {primary?.plan != null && (
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                  plan {primary.plan} {primary.unit}
                </span>
              )}
            </div>
          </div>

          {/* Pen table — every reading for the stage, tones carried. */}
          <div
            className="flex flex-col"
            style={{ borderRadius: 10, border: "1px solid var(--border-default)", overflow: "hidden", height: "fit-content" }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "8px 14px", background: "var(--surface-raised)", borderBottom: "1px solid var(--border-default)" }}
            >
              <span
                className="type-caption"
                style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ds-text-placeholder, var(--text-muted))" }}
              >
                Pens · now
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {stage.sub}
              </span>
            </div>
            {stage.readings.map((r, i) => (
              <div
                key={r.label}
                className="flex items-center justify-between"
                style={{
                  gap: 12,
                  padding: "9px 14px",
                  borderBottom: i < stage.readings.length - 1 ? "1px solid var(--border-light)" : undefined,
                }}
              >
                <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
                  {r.label}
                </span>
                <span
                  className="type-body-medium"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color:
                      r.tone === "hot"
                        ? "var(--text-danger)"
                        : r.tone === "warn"
                          ? "var(--text-warning, #B7791F)"
                          : "var(--ds-text-primary)",
                  }}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function StageChip({
  stage,
  index,
  active,
  onClick,
}: {
  stage: ProcessStage;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const s = STATUS[stage.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col text-left transition-shadow"
      style={{
        gap: 6,
        padding: "10px 12px",
        borderRadius: 10,
        cursor: "pointer",
        background: s.bg,
        border: `1px solid ${active ? "var(--color-iris-500, #7C6BF0)" : s.border}`,
        outline: active ? "1px solid var(--color-iris-500, #7C6BF0)" : "none",
      }}
    >
      {/* Status first — the strip is a health map, so state outranks name. */}
      <span className="flex items-center justify-between" style={{ gap: 8 }}>
        <span
          className="type-caption"
          style={{ color: s.ink, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 10 }}
        >
          {s.label}
        </span>
        <span
          className="type-caption"
          style={{ color: "var(--ds-text-placeholder, var(--text-muted))", fontVariantNumeric: "tabular-nums" }}
        >
          {index}
        </span>
      </span>
      <span className="flex flex-col" style={{ gap: 1 }}>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {stage.name}
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          {stage.status === "nominal" ? stage.sub : stage.note}
        </span>
      </span>
    </button>
  );
}

/**
 * Multi-series trend. All-pens mode scales each series to its own band so
 * shapes compare across units; single-pen mode draws real values with y-axis
 * ticks. Realtime plots the 60-min window, Historical the 12-week view.
 */
function MultiTrend({
  series,
  range,
  single,
}: {
  series: ReadonlyArray<StageSeries>;
  range: Range;
  single: boolean;
}) {
  const H = 168;
  const W = 640;
  const PAD_L = single ? 48 : 12;
  const PAD_R = 12;
  const PAD_T = 10;
  const PAD_B = 22;

  const pts = (s: StageSeries) => (range === "history" && s.history ? s.history : s.points);
  const first = series[0];
  const n = first ? pts(first).length : 0;
  if (!n) return null;

  const xAt = (i: number, len: number) => PAD_L + (i / (len - 1)) * (W - PAD_L - PAD_R);

  // Single-pen mode shares one scale (real values); all-pens scales per series.
  const scaleFor = (s: StageSeries) => {
    const vals = pts(s).map((p) => p.v);
    const max = Math.max(...vals, s.plan ?? -Infinity);
    const min = Math.min(...vals, s.plan ?? Infinity);
    const span = max - min || 1;
    return { min, max, y: (v: number) => H - PAD_B - ((v - min) / span) * (H - PAD_T - PAD_B) };
  };

  const firstScale = first ? scaleFor(first) : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Telemetry trend"
      style={{ width: "100%", height: H }}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD_T + t * (H - PAD_T - PAD_B);
        return <line key={t} x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border-light)" strokeWidth={1} />;
      })}

      {/* Y ticks in single-pen mode — real numbers, top and bottom. */}
      {single && firstScale && (
        <>
          <text x={PAD_L - 6} y={PAD_T + 4} textAnchor="end" fontSize={10} fill="var(--ds-text-placeholder, var(--text-muted))">
            {round(firstScale.max)}
          </text>
          <text x={PAD_L - 6} y={H - PAD_B + 4} textAnchor="end" fontSize={10} fill="var(--ds-text-placeholder, var(--text-muted))">
            {round(firstScale.min)}
          </text>
        </>
      )}

      {/* plan line for the first visible series */}
      {first?.plan != null && firstScale && (
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={firstScale.y(first.plan)}
          y2={firstScale.y(first.plan)}
          stroke={SERIES_INK.primary}
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />
      )}

      {series.map((s) => {
        const p = pts(s);
        const { y } = single ? (firstScale as ReturnType<typeof scaleFor>) : scaleFor(s);
        const d = p.map((pt, i) => `${xAt(i, p.length)},${y(pt.v)}`).join(" ");
        return (
          <polyline
            key={s.metric}
            fill="none"
            stroke={SERIES_INK[s.tone ?? "primary"]}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={d}
          />
        );
      })}

      {(() => {
        const p = pts(first!);
        return [0, Math.floor((p.length - 1) / 2), p.length - 1].map((i) => (
          <text
            key={i}
            x={xAt(i, p.length)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === p.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="var(--ds-text-placeholder, var(--text-muted))"
          >
            {p[i]?.t}
          </text>
        ));
      })()}
    </svg>
  );
}

function round(v: number): string {
  return Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : `${Math.round(v * 10) / 10}`;
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
      }}
    >
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border-default)" }}
      >
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {title}
        </span>
        {scope && (
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {scope}
          </span>
        )}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </section>
  );
}

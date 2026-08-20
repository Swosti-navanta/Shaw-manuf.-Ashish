"use client";

import { useMemo, useState } from "react";
import { AiStar, Button, Chip, SegmentedControl } from "@navanta-ai/design-system";
import { DotsThree, CaretRight, X, ArrowSquareOut, ArrowRight, Info } from "@phosphor-icons/react";
import { usePersona } from "@/context/PersonaContext";
import { useChatPanel } from "@/context/ChatPanelContext";
import { machineActionTask } from "@/data/line-flows";
import {
  MACHINE_HEALTH_KPIS,
  MACHINES,
  machinesFor,
  OWNER_META,
  PROCESS_STAGES,
  type MachineKpi,
  type MachineAction,
  type MachineRow,
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
export default function LineHealth({
  onOpenAction,
}: {
  /** Promote a machine row to the decision deck the queue uses. */
  onOpenAction?: (actionId: string) => void;
}) {
  const { profile } = usePersona();
  const { startTask } = useChatPanel();
  const agent = profile.agents[0] ?? "Rowan";

  // One flow at a time: the strip picks the stage, the table lists every
  // machine in that flow, a row click points the workbench at that machine,
  // and clicking the machine's name opens its decision brief.
  const rank = (s: StageStatus) => (s === "under" ? 2 : s === "watched" ? 1 : 0);
  const hotStage = [...PROCESS_STAGES].sort((a, b) => rank(b.status) - rank(a.status))[0];
  const [stageId, setStageId] = useState(hotStage.id);
  const stageMachines = machinesFor(stageId);
  const hotMachine = (pool: ReadonlyArray<MachineRow>) =>
    [...pool].sort((a, b) => rank(b.status) - rank(a.status))[0];
  const [machineId, setMachineId] = useState(hotMachine(stageMachines)?.id ?? MACHINES[0].id);
  const machine = stageMachines.find((m) => m.id === machineId) ?? stageMachines[0] ?? MACHINES[0];

  const selectStage = (id: string) => {
    setStageId(id);
    const hot = hotMachine(machinesFor(id));
    if (hot) setMachineId(hot.id);
  };

  const stageName = PROCESS_STAGES.find((s) => s.id === stageId)?.name ?? stageId;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* The machine-layer scorecard — is the machine layer costing money, and
          where. The shade-critical tile is a decision, not a gauge: it opens
          the re-sequence deck that guards the fixed date. */}
      <div
        className="grid"
        style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(212px, 1fr))" }}
      >
        {MACHINE_HEALTH_KPIS.map((k) => (
          <MachineKpiTile key={k.key} kpi={k} onOpenAction={onOpenAction} />
        ))}
      </div>

      {/* Process flow — the map. Click a stage to inspect its machines. */}
      <Panel title="Process flow · live · Line A" scope="click a stage to inspect its machines">
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))", gap: 8 }}
        >
          {PROCESS_STAGES.map((s, i) => (
            <StageChip
              key={s.id}
              index={i + 1}
              stage={s}
              active={s.id === stageId}
              onClick={() => selectStage(s.id)}
            />
          ))}
        </div>
      </Panel>

      {/* Trend workbench — the selected machine's own Ignition pens. Driven by
          clicking a row in the machines table below. */}
      <Workbench
        machine={machine}
        onDetail={() =>
          startTask(
            machineActionTask(
              machine.id,
              machine.role,
              { label: "Explain", owner: "understand", autoLog: false },
              agent,
            ),
          )
        }
      />

      {/* Machines table — every machine in the selected flow. Row click points
          the workbench at that machine; the machine's name opens its brief. */}
      <MachinesTable
        rows={stageMachines}
        title={`Machines · ${stageName}`}
        focusedId={machine.id}
        onFocusMachine={setMachineId}
        onRun={(m, a) =>
          startTask(
            machineActionTask(
              m.id,
              m.role,
              { label: a.label, owner: a.owner, autoLog: a.owner === "adjust" },
              agent,
            ),
          )
        }
        onOpenAction={onOpenAction}
      />
    </div>
  );
}

/* ── Machines table ─────────────────────────────────────────────────────── */

function MachinesTable({
  rows,
  title,
  focusedId,
  onFocusMachine,
  onRun,
  onOpenAction,
}: {
  rows: ReadonlyArray<MachineRow>;
  title: string;
  /** The machine the workbench is currently plotting — its row is tinted. */
  focusedId: string;
  /** Row click points the workbench at that machine. */
  onFocusMachine: (id: string) => void;
  onRun: (m: MachineRow, a: MachineAction) => void;
  onOpenAction?: (actionId: string) => void;
}) {
  // The decision brief for one machine — opened by clicking the row.
  const [drawer, setDrawer] = useState<MachineRow | null>(null);

  // Route any action: a queue-promoting one opens the deck; everything else
  // (Explain, the in-band Adjust auto-log) resolves through the agent panel.
  const run = (m: MachineRow, a: MachineAction) => {
    if (a.queueActionId && onOpenAction) onOpenAction(a.queueActionId);
    else onRun(m, a);
  };

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
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          a row becomes a decision only when it crosses the limit
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              {["Machine · role", "Status", "Critical spec · reading vs band", "Time above spec", "Affects · $/hr", ""].map(
                (h, i) => (
                  <th
                    key={h || i}
                    className="type-caption"
                    style={{
                      textAlign: i === 5 ? "right" : "left",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--ds-text-placeholder, var(--text-muted))",
                      fontWeight: 500,
                      padding: "10px 14px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <MachineRowView
                key={m.id}
                m={m}
                focused={m.id === focusedId}
                onRun={(a) => run(m, a)}
                onFocus={() => onFocusMachine(m.id)}
                onOpenBrief={() => {
                  onFocusMachine(m.id);
                  setDrawer(m);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {drawer && (
        <MachineDrawer
          m={drawer}
          onRun={(a) => {
            setDrawer(null);
            run(drawer, a);
          }}
          onClose={() => setDrawer(null)}
        />
      )}
    </section>
  );
}

const MSTATUS: Record<StageStatus, { ink: string; bg: string; label: string }> = {
  nominal: { ink: "var(--text-success)", bg: "var(--surface-success)", label: "Nominal" },
  watched: { ink: "var(--text-warning, #B7791F)", bg: "#FEF3E2", label: "Watched" },
  under: { ink: "var(--text-danger)", bg: "var(--surface-danger)", label: "Under limit" },
};

const TD: React.CSSProperties = { padding: "12px 14px", verticalAlign: "middle", borderTop: "1px solid var(--border-light)" };

function MachineRowView({
  m,
  focused,
  onRun,
  onFocus,
  onOpenBrief,
}: {
  m: MachineRow;
  focused: boolean;
  onRun: (a: MachineAction) => void;
  /** Row click — points the trend workbench at this machine. */
  onFocus: () => void;
  /** Machine-name click — opens the decision brief. */
  onOpenBrief: () => void;
}) {
  const [kebab, setKebab] = useState(false);
  const st = MSTATUS[m.status];
  const toneInk = (t?: "hot" | "warn") =>
    t === "hot" ? "var(--text-danger)" : t === "warn" ? "var(--text-warning, #B7791F)" : "var(--ds-text-primary)";

  return (
    <tr
      onClick={onFocus}
      className="transition-colors hover:bg-[var(--surface-raised)]"
      style={{ cursor: "pointer", background: focused ? "var(--color-iris-50)" : undefined }}
      title="Show this machine on the trend workbench"
    >
      {/* Machine · role — the name opens the decision brief. */}
      <td style={TD}>
        <span className="flex flex-col items-start" style={{ gap: 1 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBrief();
            }}
            className="type-body-medium text-left hover:underline"
            style={{ background: "none", padding: 0, cursor: "pointer", color: "var(--link-color)" }}
            title="Open the decision brief"
          >
            {m.id}
          </button>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{m.role}</span>
        </span>
      </td>
      {/* Status */}
      <td style={TD}>
        <span
          className="type-caption"
          style={{ padding: "3px 10px", borderRadius: 999, background: st.bg, color: st.ink, fontWeight: 500, whiteSpace: "nowrap" }}
        >
          {st.label}
        </span>
      </td>
      {/* Critical spec · reading vs band */}
      <td style={TD}>
        <span className="flex flex-col" style={{ gap: 1 }}>
          <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>{m.spec}</span>
          <span className="type-body-medium" style={{ fontVariantNumeric: "tabular-nums", color: toneInk(m.readingTone) }}>
            {m.reading} <span style={{ color: "var(--ds-text-placeholder, var(--text-muted))", fontWeight: 400 }}>vs {m.band}</span>
          </span>
        </span>
      </td>
      {/* Time above spec */}
      <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>
        <span className="type-body" style={{ color: m.timeAboveSpec === "—" ? "var(--ds-text-placeholder, var(--text-muted))" : "var(--text-danger)" }}>
          {m.timeAboveSpec}
        </span>
      </td>
      {/* Affects · $/hr — with the labor overlay when the belt is in a
          double-loss state (machine downtime and OT rising together). */}
      <td style={TD}>
        <span className="flex flex-col" style={{ gap: 1 }}>
          <span className="type-body" style={{ color: toneInk(m.affectsTone), fontVariantNumeric: "tabular-nums" }}>
            {m.affects}
          </span>
          {m.otOverlay && (
            <span className="type-caption" style={{ color: "var(--text-warning, #B7791F)", fontVariantNumeric: "tabular-nums" }}>
              {m.otOverlay}
            </span>
          )}
        </span>
      </td>
      {/* Owner · action — clicks here act, they don't open the brief. */}
      <td style={{ ...TD, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        <span className="inline-flex items-center justify-end" style={{ gap: 6, position: "relative" }}>
          <ActionButton action={m.primary} onClick={() => onRun(m.primary)} />
          {m.secondaries.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setKebab((v) => !v)}
                aria-label="More actions"
                className="inline-flex items-center justify-center"
                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--surface-base)", cursor: "pointer" }}
              >
                <DotsThree size={16} weight="bold" />
              </button>
              {kebab && (
                <>
                  <span className="fixed inset-0" style={{ zIndex: 40 }} onClick={() => setKebab(false)} />
                  <div
                    role="menu"
                    className="absolute flex flex-col"
                    style={{
                      zIndex: 41, top: 34, right: 0, minWidth: 208, padding: 4,
                      borderRadius: 10, background: "var(--surface-base)",
                      border: "1px solid var(--border-default)", boxShadow: "0 8px 24px rgba(15,16,35,.16)",
                    }}
                  >
                    {m.secondaries.map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        role="menuitem"
                        onClick={() => { setKebab(false); onRun(a); }}
                        className="flex items-center justify-between text-left transition-colors hover:bg-[var(--surface-raised)]"
                        style={{ gap: 10, padding: "8px 10px", borderRadius: 7, background: "none", border: "none", cursor: "pointer" }}
                      >
                        <span className="flex flex-col" style={{ gap: 1 }}>
                          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>{a.label}</span>
                          <span className="type-caption" style={{ color: OWNER_META[a.owner].ink }}>{OWNER_META[a.owner].label}</span>
                        </span>
                        <CaretRight size={13} color="var(--ds-text-placeholder, var(--text-muted))" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </span>
      </td>
    </tr>
  );
}

/** The primary action, styled by its threshold state:
 *  ask → solid, limit → outline, auto → greyed with the rule in the tooltip. */
function ActionButton({ action, onClick }: { action: MachineAction; onClick: () => void }) {
  if (action.state === "auto") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={action.autoNote ?? "handled inside the limit"}
        className="inline-flex items-center type-caption"
        style={{
          gap: 6, height: 30, padding: "0 12px", borderRadius: 8,
          border: "1px dashed var(--border-strong)", background: "var(--surface-raised)",
          color: "var(--ds-text-placeholder, var(--text-muted))", cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {action.label} · auto
      </button>
    );
  }
  const isExplain = action.owner === "understand";
  return (
    <Button
      variant={action.state === "ask" ? "primary" : "outline"}
      size="sm"
      onClick={onClick}
      iconLeft={isExplain ? <AiStar size={13} /> : undefined}
    >
      {action.label}
    </Button>
  );
}

function Workbench({
  machine,
  onDetail,
}: {
  machine: MachineRow;
  onDetail: () => void;
}) {
  const [range, setRange] = useState<Range>("realtime");
  // null = all pens; otherwise the single selected metric.
  const [pen, setPen] = useState<string | null>(null);

  // Reset the pen filter when the machine changes — a metric filter for one
  // asset means nothing on another.
  const machineKey = machine?.id ?? "";
  const [lastMachine, setLastMachine] = useState(machineKey);
  if (machineKey !== lastMachine) {
    setLastMachine(machineKey);
    setPen(null);
    setRange("realtime");
  }

  const visible = useMemo(
    () => (machine?.pens ?? []).filter((s) => pen === null || s.metric === pen),
    [machine, pen],
  );

  // Transient HMR / empty-stage guard — never blank the page over a frame.
  if (!machine) return null;

  const stageName = PROCESS_STAGES.find((s) => s.id === machine.stageId)?.name ?? machine.stageId;

  const primary = machine.pens[0];
  const yLabel =
    pen === null
      ? `${primary?.metric ?? ""}${primary?.unit ? ` (${primary.unit})` : ""} · others scaled to band`
      : (() => {
          const s = machine.pens.find((f) => f.metric === pen);
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
      {/* Header: the machine + range toggle + chat CTA. */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border-default)" }}
      >
        <span className="flex flex-col" style={{ gap: 1 }}>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            Trend workbench · {machine.id} · {stageName}
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
        {/* Pen filter chips — All, then one per pen of the machine. */}
        <div className="flex items-center flex-wrap" style={{ gap: 6, marginBottom: 12 }}>
          <Chip selected={pen === null} onClick={() => setPen(null)}>
            All pens
          </Chip>
          {machine.pens.map((s) => (
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

          {/* Pen table — this machine's tags, now. The critical spec carries
              its tone so the problem reading stays visibly the problem. */}
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
                {machine.role}
              </span>
            </div>
            {machine.pens.map((s, i) => {
              const pts = range === "history" && s.history ? s.history : s.points;
              const last = pts[pts.length - 1]?.v;
              const isCritical = s.metric === machine.spec;
              return (
                <div
                  key={s.metric}
                  className="flex items-center justify-between"
                  style={{
                    gap: 12,
                    padding: "9px 14px",
                    borderBottom: i < machine.pens.length - 1 ? "1px solid var(--border-light)" : undefined,
                  }}
                >
                  <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
                    {s.metric}
                  </span>
                  <span
                    className="type-body-medium"
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      color:
                        isCritical && machine.readingTone === "hot"
                          ? "var(--text-danger)"
                          : isCritical && machine.readingTone === "warn"
                            ? "var(--text-warning, #B7791F)"
                            : "var(--ds-text-primary)",
                    }}
                  >
                    {last}
                    {s.unit ? ` ${s.unit}` : ""}
                    {isCritical ? ` · band ${machine.band}` : ""}
                  </span>
                </div>
              );
            })}
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
        {/* The promise ceiling — always visible on the constraint belt. */}
        {stage.constraint && (
          <span
            className="type-caption"
            style={{ color: "var(--color-iris-700)", fontWeight: 500 }}
          >
            {stage.constraint}
          </span>
        )}
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

/* ── Machine drawer — the decision brief ────────────────────────────────────
 *
 * One panel, four zones, in a director's reading order: what's happening,
 * what it costs, what the prepared move is, and where to verify. Deliberately
 * not an analytics surface — the deep dive lives in the Historian and Sage,
 * each one click away. Anything a person can act on here is the same action
 * the row (and the Decision queue) carries.
 */
function MachineDrawer({
  m,
  onRun,
  onClose,
}: {
  m: MachineRow;
  onRun: (a: MachineAction) => void;
  onClose: () => void;
}) {
  const st = MSTATUS[m.status];
  const stageName = PROCESS_STAGES.find((s) => s.id === m.stageId)?.name ?? m.stageId;
  const escalation = [m.primary, ...m.secondaries].find((a) => a.queueActionId);

  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-end"
      style={{ background: "rgba(15, 16, 35, 0.4)" }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Machine · ${m.id}`}
        className="flex flex-col h-full"
        style={{
          width: "min(480px, 92vw)",
          background: "var(--surface-base)",
          boxShadow: "-16px 0 48px rgba(15,16,35,.22)",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — what and where, then whether it's already a decision. */}
        <div
          className="flex items-start justify-between shrink-0"
          style={{ gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex flex-col" style={{ gap: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: "var(--ds-text-primary)" }}>
              {m.id}
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              {m.role} · {stageName} · Line A · Plant 12
            </span>
            <span className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 2 }}>
              <span
                className="type-caption"
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: st.bg,
                  color: st.ink,
                  fontWeight: 500,
                }}
              >
                {st.label}
              </span>
              {escalation && (
                <button
                  type="button"
                  onClick={() => onRun(escalation)}
                  className="type-caption inline-flex items-center transition-colors hover:bg-[var(--color-iris-100)]"
                  style={{
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--color-iris-200)",
                    background: "var(--color-iris-50)",
                    color: "var(--color-iris-700)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  In Decision queue · open
                  <ArrowRight size={11} weight="bold" />
                </button>
              )}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} weight="bold" />
          </Button>
        </div>

        <div className="flex flex-col flex-1" style={{ padding: 20, gap: 16 }}>
          {/* Now — the situation in three numbers. */}
          <div
            className="grid"
            style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <BriefStat label={m.spec} value={m.reading} caption={`band ${m.band}`} tone={m.readingTone} />
            <BriefStat
              label="Time above spec"
              value={m.timeAboveSpec}
              caption={m.timeAboveSpec === "—" ? "inside the band" : "and counting"}
              tone={m.timeAboveSpec === "—" ? undefined : "hot"}
            />
            {m.brief && (
              <div style={{ gridColumn: "1 / -1" }}>
                <BriefStat
                  label="Cost right now"
                  value={m.brief.bleed}
                  caption="what this drift is worth per hour"
                  tone={m.brief.bleedTone}
                  wide
                />
              </div>
            )}
          </div>

          {/* Rowan's forecast — the one sentence that argues for acting. */}
          {m.brief && (
            <div
              className="flex items-start"
              style={{
                gap: 9,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--color-iris-50)",
                border: "1px solid var(--color-iris-200)",
              }}
            >
              <AiStar size={15} style={{ marginTop: 1, flexShrink: 0 }} />
              <span className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
                <strong style={{ color: "var(--ds-text-primary)" }}>If nobody acts:</strong>{" "}
                {m.brief.forecast}
              </span>
            </div>
          )}

          {/* The decision — same actions as the row, with their owners. */}
          <div className="flex flex-col" style={{ gap: 8 }}>
            <span
              className="type-caption"
              style={{
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ds-text-placeholder, var(--text-muted))",
              }}
            >
              The decision
            </span>
            <div
              className="flex items-center justify-between"
              style={{
                gap: 12,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border-default)",
                background: "var(--surface-raised)",
              }}
            >
              <span className="type-caption" style={{ color: OWNER_META[m.primary.owner].ink }}>
                {OWNER_META[m.primary.owner].label}
              </span>
              <ActionButton action={m.primary} onClick={() => onRun(m.primary)} />
            </div>
            {m.secondaries.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => onRun(a)}
                className="flex items-center justify-between text-left transition-colors hover:bg-[var(--surface-raised)]"
                style={{
                  gap: 12,
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border-light)",
                  background: "var(--surface-base)",
                  cursor: "pointer",
                }}
              >
                <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                  {a.label}
                </span>
                <span className="type-caption" style={{ color: OWNER_META[a.owner].ink }}>
                  {OWNER_META[a.owner].label}
                </span>
              </button>
            ))}
          </div>

          {/* The trail — just enough history to judge, not analyse. */}
          {m.brief && (
            <div className="flex flex-col" style={{ gap: 8 }}>
              <span
                className="type-caption"
                style={{
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ds-text-placeholder, var(--text-muted))",
                }}
              >
                The trail
              </span>
              <div
                style={{ borderRadius: 10, border: "1px solid var(--border-default)", overflow: "hidden" }}
              >
                <TrailRow label="Last work order" value={m.brief.lastWo} />
                <TrailRow label="MTBF" value={m.brief.mtbf} last />
              </div>
            </div>
          )}

          {/* Executive factors this machine lights — one number per line, the
              way it would be repeated to the board. The analysis behind each
              lives in the Historian / Performance, not here. */}
          {m.brief?.factors && m.brief.factors.length > 0 && (
            <div className="flex flex-col" style={{ gap: 8 }}>
              <span
                className="type-caption"
                style={{
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ds-text-placeholder, var(--text-muted))",
                }}
              >
                Why it matters
              </span>
              <div
                style={{ borderRadius: 10, border: "1px solid var(--border-default)", overflow: "hidden" }}
              >
                {m.brief.factors.map((f, i) => (
                  <div
                    key={f.code}
                    className="flex items-start"
                    style={{
                      gap: 10,
                      padding: "9px 14px",
                      borderBottom:
                        i < (m.brief?.factors?.length ?? 0) - 1 ? "1px solid var(--border-light)" : undefined,
                    }}
                  >
                    <span
                      className="type-caption shrink-0"
                      style={{
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: "var(--color-iris-100)",
                        color: "var(--color-iris-700)",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {f.code}
                    </span>
                    <span className="type-body" style={{ color: "var(--ds-text-primary)", lineHeight: 1.45 }}>
                      {f.line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Exits — verify elsewhere; this panel stays a decision surface. */}
        <div
          className="flex items-center justify-between shrink-0 flex-wrap"
          style={{ gap: 8, padding: "12px 20px", borderTop: "1px solid var(--border-default)" }}
        >
          <Button
            variant="outline"
            size="sm"
            iconRight={<ArrowSquareOut size={13} weight="bold" />}
            title="Asset-scoped Historian view — wired at integration"
          >
            Open in Ignition
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconLeft={<AiStar size={13} />}
            onClick={() => onRun({ label: "Explain", owner: "understand", state: "limit" })}
          >
            Ask Sage about this asset
          </Button>
        </div>
      </aside>
    </div>
  );
}

function BriefStat({
  label,
  value,
  caption,
  tone,
  wide,
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "hot" | "warn";
  wide?: boolean;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        gap: 2,
        padding: "11px 13px",
        borderRadius: 10,
        border: "1px solid var(--border-default)",
        background: "var(--surface-base)",
        minWidth: wide ? undefined : 0,
      }}
    >
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
          fontVariantNumeric: "tabular-nums",
          color:
            tone === "hot"
              ? "var(--text-danger)"
              : tone === "warn"
                ? "var(--text-warning, #B7791F)"
                : "var(--ds-text-primary)",
        }}
      >
        {value}
      </span>
      <span className="type-caption" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>
        {caption}
      </span>
    </div>
  );
}

function TrailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        gap: 12,
        padding: "9px 14px",
        borderBottom: last ? undefined : "1px solid var(--border-light)",
      }}
    >
      <span className="type-caption shrink-0" style={{ color: "var(--ds-text-secondary)" }}>
        {label}
      </span>
      <span className="type-body" style={{ color: "var(--ds-text-primary)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

/* ── Machine-health KPI tile ─────────────────────────────────────────────── */

function MachineKpiTile({
  kpi,
  onOpenAction,
}: {
  kpi: MachineKpi;
  onOpenAction?: (actionId: string) => void;
}) {
  const ink =
    kpi.tone === "bad"
      ? "var(--text-danger)"
      : kpi.tone === "warn"
        ? "var(--text-warning, #B7791F)"
        : kpi.tone === "good"
          ? "var(--text-success)"
          : "var(--ds-text-primary)";
  const actionable = Boolean(kpi.actionId && onOpenAction);

  const inner = (
    <>
      <span className="flex items-center" style={{ gap: 6 }}>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          {kpi.label}
        </span>
        <span title={kpi.info} className="inline-flex" style={{ cursor: "help", color: "var(--ds-text-placeholder, var(--text-muted))" }}>
          <Info size={13} />
        </span>
      </span>
      <span
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.15,
          color: ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {kpi.value}
      </span>
      <span className="flex items-center justify-between" style={{ gap: 8 }}>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          {kpi.detail}
        </span>
        {actionable && (
          <span
            className="type-caption inline-flex items-center"
            style={{ gap: 3, color: "var(--color-iris-700)", whiteSpace: "nowrap" }}
          >
            Decide <ArrowRight size={12} weight="bold" />
          </span>
        )}
      </span>
    </>
  );

  const frame: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "13px 14px",
    borderRadius: 12,
    textAlign: "left",
    background: actionable ? "var(--surface-danger)" : "var(--surface-base)",
    border: `1px solid ${actionable ? "var(--border-danger, #FDA29B)" : "var(--border-default)"}`,
    boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
  };

  if (actionable) {
    return (
      <button type="button" onClick={() => onOpenAction!(kpi.actionId!)} style={{ ...frame, cursor: "pointer" }}>
        {inner}
      </button>
    );
  }
  return <div style={frame}>{inner}</div>;
}

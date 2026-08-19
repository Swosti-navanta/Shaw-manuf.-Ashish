"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AiStar, Button, PanelInfoGrid, Tabs } from "@navanta-ai/design-system";
import {
  ArrowRight,
  ArrowsClockwise,
  ArrowsLeftRight,
  Buildings,
  CalendarBlank,
  CheckCircle,
  Clock,
  Package,
  ShieldCheck,
  Stack,
  Swatches,
  UsersThree,
  WarningCircle,
  Wrench,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRun } from "@/context/RunContext";
import { useDetailDrawer } from "@/context/DetailDrawerContext";
import {
  CONSTRAINT_LINE,
  DOWNTIME,
  DOWNTIME_TOTAL,
  DYE_LOT,
  INSPECTION,
  OEE_FACTORS,
  OPTIONS,
  ORDERS,
  PRICING,
  ROLL,
  RUN,
  RUN_KPIS,
} from "@/data/run-data";
import type { MakeAction } from "@/types/action";
import DrillLink from "@/components/ui/DrillLink";
import ActivityFeed from "./ActivityFeed";
import DecisionBand from "./DecisionBand";
import RateChart from "./RateChart";

/** What travels to the maintenance system. Shown as a tab rather than a
 *  confirm gate — proving the "no re-keying" claim shouldn't cost a click.
 *  Context is the one field a person tends to want to nudge (which run the
 *  ticket is anchored to), so it's chooseable below. */
const CONTEXT_OPTIONS = [
  {
    id: "run",
    label: "Run at risk · ORD-77310 · DL-4471",
    detail: "Rowan's pick — the run the vibration is threatening",
    recommended: true,
  },
  {
    id: "line",
    label: "Constraint line · Backing 2 · full shift",
    detail: "Frames it as the line's problem, not one order's",
  },
  {
    id: "asset",
    label: "Asset only · vibration signal + PM history",
    detail: "Ticket carries the machine story, no run context",
  },
] as const;

function staticPayload(contextLabel: string) {
  return [
    { label: "Asset", value: CONSTRAINT_LINE.name },
    {
      label: "Trigger",
      value: `Vibration ${CONSTRAINT_LINE.vibration?.current} vs ${CONSTRAINT_LINE.vibration?.baseline} baseline`,
    },
    { label: "Priority", value: `High — PM already due ${CONSTRAINT_LINE.pmWindow}` },
    { label: "Context", value: contextLabel },
    { label: "Route to", value: "your maintenance system" },
    { label: "Raised by", value: "Rowan · auto-drafted" },
  ];
}

interface DeckMetric {
  label: string;
  value: string;
  detail: string;
  /** The reading that is the problem — rendered red. */
  alert?: boolean;
  /** Opens its own KPI record when the figure has one. */
  kpi?: string;
}

/**
 * The numbers behind each agent's read. Per kind, because a rate exception
 * and a vibration signal are judged on different figures — and a deck with no
 * tiles at all is a read you have to take on trust.
 */
const METRICS_BY_KIND: Record<string, DeckMetric[]> = {
  resequence: RUN_KPIS.map((k) => ({
    label: k.label,
    value: k.value,
    detail: k.detail,
    alert: k.alert,
    kpi: k.kind,
  })),
  workorder: [
    {
      label: "OEE",
      value: `${CONSTRAINT_LINE.oee}%`,
      detail: "availability × performance × quality",
      alert: true,
      kpi: "oee",
    },
    {
      // A projected smooth-running window, framed as time-to-check rather than a
      // bare reading. Answers "how long before this needs someone" without
      // dumping the raw vibration figure back onto the tile.
      label: "Runs safely",
      value: "~36 h",
      detail: "before it needs a check",
      alert: true,
    },
    { label: "Next PM", value: CONSTRAINT_LINE.pmWindow ?? "—", detail: "already scheduled" },
    {
      label: "Downtime",
      value: `${DOWNTIME_TOTAL}m`,
      detail: "this shift",
      kpi: "downtime",
    },
  ],
  grade: [
    { label: "Shade ΔE", value: "2.9", detail: "tolerance ≤ 2.5", alert: true },
    { label: "Occurrence", value: "2nd", detail: "this week — reads as a pattern", alert: true },
    {
      label: "Margin at risk",
      value: `$${Math.round(ROLL.qty * (PRICING.first - PRICING.second)).toLocaleString()}`,
      detail: "a downgrade, not scrap",
    },
    { label: "Quantity", value: `${ROLL.qty} yd`, detail: "on the roll" },
  ],
};

/**
 * The metric tiles inside the agent's summary card — the IRIS
 * summary-metrics row (Figma 350:7491): white on the lavender card, 1px
 * iris border, label / value / detail, the value red where the reading is
 * the problem.
 *
 * A figure with its own record stays clickable: what the agent asserts should
 * always be checkable.
 */
function SummaryMetrics({ metrics }: { metrics: DeckMetric[] }) {
  const { open } = useDetailDrawer();

  return (
    <div className="flex w-full flex-wrap" style={{ gap: 8, marginTop: 4 }}>
      {metrics.map((m) => {
        const body = (
          <>
            <span
              className="type-caption"
              style={{ color: "var(--ds-text-secondary)", whiteSpace: "nowrap" }}
            >
              {m.label}
            </span>
            <span
              className="type-body font-semibold"
              style={{
                color: m.alert ? "var(--text-danger)" : "var(--ds-text-primary)",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {m.value}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--ds-text-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {m.detail}
            </span>
          </>
        );

        const tile: React.CSSProperties = {
          flex: "1 1 0",
          minWidth: 128,
          gap: 2,
          padding: 8,
          background: "var(--surface-base)",
          border: "1px solid var(--color-iris-200)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          textAlign: "left",
        };

        return m.kpi ? (
          <button
            key={m.label}
            type="button"
            onClick={() => open("kpi", m.kpi!)}
            className="transition-colors hover:bg-[var(--surface-hover)]"
            style={{ ...tile, cursor: "pointer" }}
            title={`${m.label} — open the reading`}
          >
            {body}
          </button>
        ) : (
          <span key={m.label} style={tile}>
            {body}
          </span>
        );
      })}
    </div>
  );
}

type DeckTab =
  | "breakdown"
  | "committed"
  | "rate"
  | "activity"
  | "measured"
  | "cost"
  | "payload"
  | "machine"
  | "maintenance"
  | "what";

// One tab per question, rather than one "Evidence" bucket holding several.
// The set varies by kind: a rate exception and a maintenance signal are
// answered by different evidence, so offering both everywhere would leave
// most tabs empty.
const TABS_BY_KIND: Record<string, { id: DeckTab; label: string }[]> = {
  resequence: [
    { id: "breakdown", label: "Cost breakdown" },
    { id: "committed", label: "What's committed" },
    { id: "rate", label: "Achieved vs planned" },
    { id: "activity", label: "Activity" },
  ],
  grade: [
    { id: "measured", label: "Measured vs spec" },
    { id: "cost", label: "What it costs" },
  ],
  workorder: [
    { id: "payload", label: "What gets sent" },
    { id: "machine", label: "Machine health" },
    { id: "maintenance", label: "Maintenance" },
  ],
  drift: [{ id: "what", label: "What happened" }],
  report: [{ id: "what", label: "What happened" }],
};

/* ─── Shared row primitives ───────────────────────────────────────────────
 *
 * The deck's evidence tabs were flat label→value grids; these give each row a
 * tinted icon tile and an optional gloss, and let a status read as a pill. One
 * set of primitives so Cost breakdown, What's committed and the schedule all
 * share a rhythm instead of each inventing its own.
 */

type Tone = "iris" | "blue" | "green" | "amber" | "red" | "teal";

const TONE: Record<Tone, { bg: string; fg: string }> = {
  iris: { bg: "var(--color-iris-100)", fg: "var(--color-iris-700)" },
  blue: { bg: "#E8F1FF", fg: "#1D63D1" },
  green: { bg: "var(--surface-success)", fg: "var(--text-success)" },
  amber: { bg: "#FEF3E2", fg: "#B7791F" },
  red: { bg: "var(--surface-danger)", fg: "var(--text-danger)" },
  teal: { bg: "#E2F6F4", fg: "#0E8577" },
};

/** A plain, tone-colored glyph — the left edge of every evidence row. No
 *  tile: this app doesn't box its icons. */
function IconTile({ icon: Ico, tone }: { icon: Icon; tone: Tone }) {
  return (
    <span
      className="flex items-center justify-center shrink-0"
      style={{ width: 20, color: TONE[tone].fg }}
    >
      <Ico size={18} weight="duotone" />
    </span>
  );
}

/** A status chip — the app's own success/danger tokens, since the DS Pill has
 *  no success tone and these need green for "held whole". */
function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      className="type-caption"
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** A section wrapper: heading, then a single bordered card holding the rows. */
function EvidenceCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
        {title}
      </span>
      <div
        className="flex flex-col"
        style={{
          borderRadius: 12,
          border: "1px solid var(--border-default)",
          overflow: "hidden",
          background: "var(--surface-base)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** One icon · label (+ hint) · trailing-node row, with a divider unless last. */
function EvidenceRow({
  icon,
  tone,
  label,
  hint,
  trailing,
  last,
  highlight,
}: {
  icon: Icon;
  tone: Tone;
  label: React.ReactNode;
  hint?: string;
  trailing: React.ReactNode;
  last?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 12,
        padding: "12px 14px",
        borderBottom: last ? undefined : "1px solid var(--border-light)",
        background: highlight ? "var(--color-iris-50)" : undefined,
      }}
    >
      <IconTile icon={icon} tone={tone} />
      <span className="flex flex-col min-w-0" style={{ gap: 1 }}>
        <span
          className={highlight ? "type-body font-semibold" : "type-body"}
          style={{ color: "var(--ds-text-primary)" }}
        >
          {label}
        </span>
        {hint && (
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {hint}
          </span>
        )}
      </span>
      <span className="flex items-center" style={{ marginLeft: "auto", paddingLeft: 12 }}>
        {trailing}
      </span>
    </div>
  );
}

/** Pick a cost-row glyph from the label — keeps the data free of UI concerns. */
function costIcon(label: string): { icon: Icon; tone: Tone } {
  const l = label.toLowerCase();
  if (l.includes("net")) return { icon: CheckCircle, tone: "iris" };
  if (l.includes("overtime")) return { icon: Clock, tone: "iris" };
  if (l.includes("risk")) return { icon: ShieldCheck, tone: "iris" };
  if (l.includes("downgrade")) return { icon: WarningCircle, tone: "red" };
  return { icon: ArrowsLeftRight, tone: "iris" };
}

/** A schedule row's outcome, as {icon, pill tone}. */
function scheduleTone(r: { bad?: boolean; good?: boolean }): Tone {
  if (r.bad) return "red";
  if (r.good) return "green";
  return "iris";
}

function scheduleIcon(label: string): Icon {
  if (label.startsWith("DL")) return Stack;
  if (label.startsWith("ORD")) return CalendarBlank;
  return ArrowsClockwise;
}

/**
 * The selected option's numbers. A tab rather than a link behind the title:
 * the breakdown is evidence for this decision, it changes as you switch
 * option, and evidence in this app lives in the deck's tabs.
 */
function CostBreakdown() {
  const { selectedOption } = useRun();
  const o = OPTIONS[selectedOption];

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <EvidenceCard title={`${o.title} — what it costs`}>
        {o.breakdown.map((r, i) => {
          const { icon, tone } = costIcon(r.label);
          return (
            <EvidenceRow
              key={r.label}
              icon={r.net ? CheckCircle : icon}
              tone={r.bad ? "red" : tone}
              label={r.label}
              hint={r.hint}
              highlight={r.net}
              last={i === o.breakdown.length - 1}
              trailing={
                <span
                  className={r.net ? "type-heading-sm font-semibold" : "type-body font-medium"}
                  style={{
                    fontSize: r.net ? 18 : undefined,
                    color: r.bad
                      ? "var(--text-danger)"
                      : r.net
                        ? "var(--color-iris-700)"
                        : "var(--ds-text-primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {r.value}
                </span>
              }
            />
          );
        })}
      </EvidenceCard>

      <EvidenceCard title="Effect on the schedule">
        {o.schedule.map((r, i) => {
          const tone = scheduleTone(r);
          return (
            <EvidenceRow
              key={r.label}
              icon={scheduleIcon(r.label)}
              tone={r.bad ? "red" : r.good ? "green" : "iris"}
              label={r.label}
              last={i === o.schedule.length - 1}
              trailing={<StatusPill tone={tone}>{r.value}</StatusPill>}
            />
          );
        })}
      </EvidenceCard>
    </div>
  );
}

/**
 * The band for actions that aren't the three-option re-sequence. Each still
 * ends in a person's click — the difference is where that click goes: grading
 * belongs to Wren's surface, and a work order routes into the maintenance
 * system rather than resolving here.
 */
function KindBand({ action }: { action: MakeAction }) {
  const router = useRouter();
  const { workOrderRaised, raiseWorkOrder, undoWorkOrder } = useRun();

  if (action.lane === "auto") {
    return (
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 16, padding: 12, background: "var(--lane-auto-bg)" }}
      >
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span className="type-caption" style={{ color: "var(--lane-auto-ink)" }}>
            Resolved inside the limit — nobody was asked
          </span>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {action.insight.headline}
          </span>
        </div>
      </div>
    );
  }

  // Grading belongs to Wren's surface — this one genuinely routes away.
  if (action.kind === "grade") {
    return (
      <div
        className="flex items-end justify-between flex-wrap"
        style={{ gap: 16, padding: 12, background: "var(--color-iris-100)" }}
      >
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
            {action.agent}&apos;s recommendation · {action.insight.detail}
          </span>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {action.insight.headline}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push("/quality")}
          iconRight={<ArrowRight size={14} weight="bold" />}
        >
          Grade it in Quality
        </Button>
      </div>
    );
  }

  // The work order commits in one click, like accepting an option. It creates
  // a ticket rather than changing what anyone is allowed to do, nothing in the
  // payload is editable, and Undo is right here — a confirm step would only be
  // an extra click. The payload lives in its own tab so it's visible without
  // gating the action.
  if (workOrderRaised) {
    return (
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 16, padding: 12, background: "var(--surface-success)" }}
      >
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span className="type-caption" style={{ color: "var(--text-success)" }}>
            Work order created — sent to your maintenance system with the context attached
          </span>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            WO · {CONSTRAINT_LINE.name} · vibration {CONSTRAINT_LINE.vibration?.current}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={undoWorkOrder}
          iconLeft={<ArrowsClockwise size={14} weight="bold" />}
        >
          Undo
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex items-end justify-between flex-wrap"
      style={{ gap: 16, padding: 12, background: "var(--color-iris-100)" }}
    >
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
          {action.agent}&apos;s recommendation · {action.insight.detail}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {action.insight.headline}
        </span>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={raiseWorkOrder}
        iconLeft={<Wrench size={14} weight="bold" />}
      >
        Create the work order
      </Button>
    </div>
  );
}

/**
 * The measured readings behind a grade — the same five the roll record
 * carries, so the queue and the record can't disagree.
 */
function Measurements() {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--surface-raised)" }}>
      {INSPECTION.map((m, i) => (
        <div
          key={m.metric}
          className="flex items-center justify-between"
          style={{
            gap: 12,
            padding: "11px 16px",
            borderBottom: i < INSPECTION.length - 1 ? "1px solid var(--border-default)" : undefined,
          }}
        >
          <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
            {m.metric}
          </span>
          <span className="flex items-baseline" style={{ gap: 12 }}>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              spec {m.spec}
            </span>
            <span
              className="type-body"
              style={{
                fontWeight: m.pass ? 400 : 600,
                color: m.pass ? "var(--ds-text-primary)" : "var(--text-danger)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {m.actual}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * The action deck — everything behind one prepared decision.
 *
 * The evidence lives here rather than on the page because it is evidence
 * *for this decision*: the rate chart is why the deviation exists, and the
 * activity feed is the argument for how it was handled. On the page they were
 * free-floating panels nobody had a reason to read.
 */
export default function ActionDeckModal({
  action,
  onClose,
}: {
  action: MakeAction;
  onClose: () => void;
}) {
  const { status } = useRun();
  const tabs = TABS_BY_KIND[action.kind] ?? TABS_BY_KIND.drift;
  const [tab, setTab] = useState<DeckTab>(tabs[0].id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const order = ORDERS["ORD-77310"];

  // The deck can be open on first paint (deep-link from Performance), so it
  // renders during SSR — where there is no document to portal into.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center"
      style={{ background: "rgba(15, 16, 35, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Action · ${action.title}`}
        className="relative mt-6 mb-6 mx-4 w-full max-w-[900px] rounded-[16px] flex flex-col overflow-hidden"
        style={{
          background: "var(--surface-base)",
          boxShadow: "var(--shadow-modal, 0 24px 60px rgba(15,16,35,.28))",
          maxHeight: "calc(100vh - 48px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between shrink-0"
          style={{ gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex flex-col min-w-0" style={{ gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ds-text-primary)" }}>
              {action.title}
            </span>
            <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <DrillLink kind={action.subject.kind} id={action.subject.id}>
                {action.subject.label}
              </DrillLink>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {action.agent} · {action.at}
              </span>
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} weight="bold" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col" style={{ padding: 20, gap: 16 }}>
            <section
              className="flex flex-col"
              style={{
                borderRadius: 12,
                border: "1px solid var(--border-default)",
                background: "var(--color-iris-50)",
                overflow: "hidden",
              }}
            >
              <div className="flex flex-col" style={{ gap: 6, padding: "14px 16px" }}>
                <span className="flex items-center" style={{ gap: 8 }}>
                  <AiStar size={16} />
                  <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                    {action.agent}&apos;s read
                  </span>
                </span>
                <p
                  className="type-body"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}
                >
                  {action.detail}
                </p>

              {/* The run's numbers belong to the agent's read, not to a tab —
                  they're what Rowan looked at to reach it. Mirrors the IRIS
                  summary-metrics row: white tiles on the lavender card. */}
                {METRICS_BY_KIND[action.kind] && (
                  <SummaryMetrics metrics={METRICS_BY_KIND[action.kind]} />
                )}
              </div>

              {/* The decision itself lives at the foot of the agent's card —
                  the recommendation is the headline, the alternatives are
                  buttons beside it. */}
              {action.kind === "resequence" ? <DecisionBand /> : <KindBand action={action} />}
            </section>

            <Tabs
              variant="underline"
              tabs={tabs}
              activeTab={tab}
              onChange={(id) => setTab(id as DeckTab)}
            />

            {tab === "rate" && (
              <div
                className="flex flex-col"
                style={{
                  gap: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border-default)",
                  background: "var(--surface-base)",
                  padding: 16,
                }}
              >
                <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
                  <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
                    Rate — achieved vs plan
                  </span>
                  <StatusPill tone="red">Shortfall since {RUN.deviationAt}</StatusPill>
                </div>

                {/* Legend up top — the chart labels the lines at their right
                    edge, but the reader shouldn't have to scan there first to
                    learn which is which. */}
                <div className="flex items-center flex-wrap" style={{ gap: 16 }}>
                  <span className="flex items-center type-caption" style={{ gap: 6, color: "var(--ds-text-secondary)" }}>
                    <span
                      style={{
                        width: 14,
                        height: 3,
                        borderRadius: 2,
                        background: "var(--run-actual-line)",
                      }}
                    />
                    Achieved rate
                  </span>
                  <span className="flex items-center type-caption" style={{ gap: 6, color: "var(--ds-text-secondary)" }}>
                    <span
                      style={{
                        width: 14,
                        height: 0,
                        borderTop: "2px dashed var(--color-iris-300)",
                      }}
                    />
                    Plan {CONSTRAINT_LINE.standard} yd/hr
                  </span>
                </div>

                <RateChart />

                <p
                  className="type-caption flex items-start"
                  style={{
                    gap: 8,
                    color: "var(--ds-text-secondary)",
                    lineHeight: 1.5,
                    background: "var(--color-iris-50)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <AiStar size={16} />
                  <span>
                    The gap opens steadily rather than dropping off a cliff — which is why the alert
                    band caught it at {RUN.deviationAt} and a walk of the floor wouldn&apos;t have.
                  </span>
                </p>
              </div>
            )}

            {tab === "committed" && (
              <EvidenceCard title="What this run owes">
                <EvidenceRow
                  icon={Stack}
                  tone="iris"
                  label="Dye lot"
                  last={false}
                  trailing={<DrillLink kind="dyelot" id={DYE_LOT.id} />}
                />
                <EvidenceRow
                  icon={Swatches}
                  tone="blue"
                  label="Style"
                  trailing={
                    <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
                      {RUN.style}
                    </span>
                  }
                />
                <EvidenceRow
                  icon={Package}
                  tone="green"
                  label="Line"
                  trailing={
                    <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
                      {CONSTRAINT_LINE.name} · the constraint
                    </span>
                  }
                />
                <EvidenceRow
                  icon={WarningCircle}
                  tone="amber"
                  label="At risk"
                  trailing={<DrillLink kind="order" id={order.id} />}
                />
                <EvidenceRow
                  icon={UsersThree}
                  tone="iris"
                  label="Customer"
                  hint="Usually the distribution center we ship the final output to"
                  trailing={
                    <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
                      {order.customer} · {order.city}
                    </span>
                  }
                />
                <EvidenceRow
                  icon={CalendarBlank}
                  tone="red"
                  label="Promised"
                  trailing={
                    <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
                      {order.promised} · fixed install
                    </span>
                  }
                />
                <EvidenceRow
                  icon={Buildings}
                  tone="teal"
                  label="Also on this lot"
                  last
                  trailing={<DrillLink kind="order" id="ORD-77412" />}
                />
              </EvidenceCard>
            )}

            {tab === "breakdown" && <CostBreakdown />}

            {tab === "measured" && <Measurements />}

            {tab === "cost" && (
              <PanelInfoGrid
                title="What a downgrade costs"
                rows={[
                  { label: "Quantity", value: `${ROLL.qty} lin yd` },
                  { label: "First quality", value: `$${PRICING.first.toFixed(2)} / yd` },
                  { label: "Seconds", value: `$${PRICING.second.toFixed(2)} / yd` },
                  {
                    label: "Margin gap",
                    value: `$${(PRICING.first - PRICING.second).toFixed(2)} / yd`,
                  },
                  {
                    label: "Exposure",
                    value: `$${Math.round(ROLL.qty * (PRICING.first - PRICING.second)).toLocaleString()}`,
                  },
                ]}
              />
            )}

            {tab === "payload" && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <PanelInfoGrid
                  title="What Rowan sends"
                  rows={staticPayload(CONTEXT_OPTIONS[0].label)}
                />
                <p
                  className="type-caption"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
                >
                  The context travels with it — no one re-keys the asset, the reading or the run
                  it puts at risk into the maintenance system.
                </p>
              </div>
            )}

            {tab === "machine" && (
              <div className="flex flex-col" style={{ gap: 12 }}>
                <PanelInfoGrid
                  title={`OEE ${CONSTRAINT_LINE.oee}% — the constraint line`}
                  rows={OEE_FACTORS.map((f) => ({ label: f.label, value: f.value }))}
                />
                <PanelInfoGrid
                  title={`Downtime this shift · ${DOWNTIME_TOTAL} min`}
                  rows={DOWNTIME.map((d) => ({
                    label: d.reason,
                    value: `${d.minutes} min${d.linked ? " · ties to DL-4471" : ""}`,
                  }))}
                />
              </div>
            )}

            {tab === "maintenance" && (
              <div className="flex flex-col" style={{ gap: 12 }}>
                <PanelInfoGrid
                  title="Maintenance"
                  rows={[
                    { label: "Last PM", value: "28 Jul · 14 days ago" },
                    { label: "Next PM", value: CONSTRAINT_LINE.pmWindow ?? "—" },
                    { label: "Vibration", value: CONSTRAINT_LINE.vibration?.current ?? "—" },
                    { label: "Baseline", value: CONSTRAINT_LINE.vibration?.baseline ?? "—" },
                  ]}
                />
                <p
                  className="type-caption"
                  style={{
                    color: "var(--ds-text-secondary)",
                    border: "1px dashed var(--border-strong)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    lineHeight: 1.55,
                  }}
                >
                  <strong style={{ color: "var(--ds-text-primary)" }}>
                    Predictive maintenance
                  </strong>{" "}
                  — the model that would raise this before the signal — is not demo-ready. It needs
                  your machine data.
                </p>
              </div>
            )}

            {tab === "what" && (
              <PanelInfoGrid
                title="What happened"
                rows={[
                  { label: "Raised by", value: `${action.agent} · ${action.at}` },
                  { label: "Subject", value: action.subject.label },
                  { label: "Outcome", value: action.impact },
                  { label: "Needed a person", value: "No — inside the limits set for this plant" },
                ]}
              />
            )}

            {tab === "activity" && (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid var(--border-default)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-default)" }}
                >
                  <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
                    What the agents did
                  </span>
                  <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                    {status === "open" ? "the argument for the decision" : "including your call"}
                  </span>
                </div>
                <ActivityFeed />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarBlank,
  Drop,
  Gauge,
  ShieldCheck,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";
import { AiStar, Button } from "@navanta-ai/design-system";
import { usePersona } from "@/context/PersonaContext";
import { useQuality } from "@/context/QualityContext";
import { useRun } from "@/context/RunContext";
import { useSchedule } from "@/context/ScheduleContext";
import { useScope } from "@/context/ScopeContext";
import { useYarn } from "@/context/YarnContext";
import { plantLabel } from "@/types/division";
import { MAKE_ACTIONS } from "@/types/action";
import { BACKLOG } from "@/data/schedule-data";
import { RUN } from "@/data/run-data";

interface InboxItem {
  id: string;
  /** The agent whose surface resolves it. */
  agent: string;
  icon: Icon;
  /** What is waiting, in one line. */
  label: string;
  /** Why it matters — the cost or the deadline. */
  detail: string;
  count: number;
  href: string;
  urgent?: boolean;
}

/**
 * The cross-agent inbox — the one surface that answers "what needs me this
 * shift" across every agent.
 *
 * It deliberately holds no queue of its own. Each line counts what is waiting
 * on one agent's surface and routes there, because that surface is the only
 * place the thing can actually be resolved. A row that can only send you
 * somewhere else shouldn't pretend to be actionable — but a *count* that
 * sends you somewhere else is exactly what an inbox is for.
 */
export default function OverviewPage() {
  const { plant } = useScope();
  const { profile } = usePersona();
  const router = useRouter();

  const { status, workOrderRaised } = useRun();
  const { pendingRolls } = useQuality();
  const { scheduled, verdict, released } = useSchedule();
  const { pendingApprovals } = useYarn();

  const items = useMemo<InboxItem[]>(() => {
    const openRun = status === "open" ? 1 : 0;
    const workOrders = workOrderRaised
      ? 0
      : MAKE_ACTIONS.filter((a) => a.lane === "limit").length;
    const unplaced = BACKLOG.filter((b) => !scheduled.has(b.id)).length;

    return [
      {
        id: "make",
        agent: "Rowan",
        icon: Gauge,
        label: "The run is behind on the constraint line",
        detail: `${RUN.projectedSlip} projected finish · a promised date is at risk`,
        count: openRun,
        href: "/make",
        urgent: true,
      },
      {
        id: "quality",
        agent: "Wren",
        icon: ShieldCheck,
        label: pendingRolls === 1 ? "A roll needs a grade" : "Rolls need a grade",
        detail: "Borderline shade, and a repeat — the engine won't call it",
        count: pendingRolls,
        href: "/quality",
        urgent: true,
      },
      {
        id: "workorder",
        agent: "Rowan",
        icon: Wrench,
        label: "A machine signal is held at a limit",
        detail: "Vibration rising with PM already due",
        count: workOrders,
        href: "/make",
      },
      {
        id: "schedule",
        agent: "Sawyer",
        icon: CalendarBlank,
        label: "Runs waiting for a slot",
        detail: released
          ? "The sequence holds — these still need placing"
          : "The sequence is a draft and hasn't been re-released",
        count: unplaced,
        href: "/scheduling",
        urgent: !released,
      },
      {
        id: "yarn",
        agent: "Sable",
        icon: Drop,
        label: "Proposals waiting on your sign-off",
        detail: "A dye formula, a run order and a lot size — none run unsigned",
        count: pendingApprovals,
        href: "/yarn",
      },
      {
        id: "rules",
        agent: "Sawyer",
        icon: CalendarBlank,
        label: "The sequence breaks a rule",
        detail: verdict.message,
        count: verdict.level === "bad" ? 1 : 0,
        href: "/scheduling",
        urgent: true,
      },
    ];
  }, [status, workOrderRaised, pendingRolls, scheduled, released, verdict, pendingApprovals]);

  // One owner now, so the only filter left is whether anything is waiting.
  const mine = items.filter((i) => i.count > 0);
  const total = mine.reduce((n, i) => n + i.count, 0);

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
          Overview · {plantLabel(plant)}
        </span>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--ds-text-primary)",
          }}
        >
          {total > 0
            ? `${total} thing${total === 1 ? "" : "s"} need you this shift`
            : "Nothing needs you this shift"}
        </h1>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
          The engine opens by telling you what to act on, not with a dashboard to go read. Each
          line is waiting on one agent — {profile.name}{" "}
          resolves it on that agent&apos;s surface.
        </p>
      </header>

      <section
        style={{
          background: "var(--surface-base)",
          border: "1px solid var(--border-default)",
          borderRadius: 14,
          boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
          overflow: "hidden",
        }}
      >
        <header
          className="flex items-center justify-between"
          style={{ gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--border-default)" }}
        >
          <span className="flex items-center" style={{ gap: 8 }}>
            <AiStar size={16} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-text-primary)" }}>
              What needs a person
            </span>
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            ranked by what it costs you
          </span>
        </header>

        {mine.length === 0 ? (
          <div className="flex flex-col" style={{ gap: 4, padding: "28px 18px", textAlign: "center" }}>
            <span className="type-body-medium" style={{ color: "var(--text-success)" }}>
              Nothing waiting on you
            </span>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              Every exception this shift resolved inside the limits set for this plant.
            </span>
          </div>
        ) : (
          mine.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(item.href)}
              className="flex items-center w-full text-left transition-colors hover:bg-[var(--surface-hover)]"
              style={{
                gap: 14,
                padding: "14px 18px",
                borderTop: i === 0 ? "none" : "1px solid var(--border-light)",
              }}
            >
              <span
                aria-hidden="true"
                className="grid place-items-center shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: item.urgent ? "var(--surface-danger)" : "var(--surface-raised)",
                }}
              >
                <item.icon
                  size={16}
                  weight="duotone"
                  color={item.urgent ? "var(--text-danger)" : "var(--ds-text-secondary)"}
                />
              </span>

              <span
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 26,
                  color: item.urgent ? "var(--text-danger)" : "var(--ds-text-primary)",
                }}
              >
                {String(item.count).padStart(2, "0")}
              </span>

              <span className="flex flex-col min-w-0" style={{ flex: 1, gap: 1 }}>
                <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
                  {item.label}
                </span>
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                  {item.detail}
                </span>
              </span>

              <span className="flex items-center shrink-0" style={{ gap: 10 }}>
                <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
                  {item.agent}
                </span>
                <ArrowRight size={14} weight="bold" color="var(--ds-text-secondary)" />
              </span>
            </button>
          ))
        )}
      </section>

      {/* What the engine handled without anyone. Kept on the inbox because a
          product whose whole claim is "it resolves most of this" has to show
          the most, not only the remainder. */}
      <ResolvedStrip />
    </div>
  );
}

function ResolvedStrip() {
  const router = useRouter();
  const auto = MAKE_ACTIONS.filter((a) => a.lane === "auto").length;

  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{
        gap: 12,
        padding: "12px 16px",
        borderRadius: 12,
        background: "var(--lane-auto-bg)",
        border: "1px solid var(--lane-auto-bd)",
      }}
    >
      <span className="flex items-center" style={{ gap: 10 }}>
        <AiStar size={15} />
        <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
          <strong style={{ fontWeight: 600 }}>{auto} more resolved automatically</strong> — rate
          drift logged, reports built. Nobody was interrupted.
        </span>
      </span>
      <Button variant="outline" size="sm" onClick={() => router.push("/make")}>
        See what the engine did
      </Button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { AiStar, KpiBreakdownCard, KpiGrid } from "@navanta-ai/design-system";
import { useYarn } from "@/context/YarnContext";
import {
  ENGINE_SAVINGS,
  WIP,
  wipVsTarget,
} from "@/data/executive-data";
import { CLAIMS_QUEUE, MARGIN_BRIDGE } from "@/types/quality";
import { YARN_KPIS } from "@/types/yarn";

/**
 * The four numbers an executive opens with.
 *
 * Work in progress leads: the capital sitting between the four stages is the
 * money a plant director actually moves, unlike margin, which finance owns. "Savings by the engine" is
 * the product's own scoreboard and the one figure no conventional plant
 * dashboard carries — it is also what the Thresholds dial moves.
 *
 * `KpiBreakdownCard` rather than `KpiStatCard`: the stat card's trend badge
 * reads the sign of a number, and the sign alone is not the news here — claims
 * falling and yield falling are opposite things. The movement joins the detail
 * line instead, and that line turns red when what it says is bad.
 */
export default function ExecKpis() {
  const router = useRouter();
  const { pendingApprovals } = useYarn();

  const claimsCost = CLAIMS_QUEUE.reduce((n, c) => n + c.cost, 0);

  /** Breakdown cards carry no trend badge, so the movement joins the detail
   *  line. `alert` turns that line red — the only signal left once the badge
   *  is gone, and the reason the class exists rather than a colour prop. */
  const card = (alert?: boolean) => ({ className: alert ? "kpi-alert" : undefined });

  /** The cards route to the surface that owns the figure. */
  const open = (href: string) => ({
    role: "link",
    tabIndex: 0,
    style: { cursor: "pointer" },
    onClick: () => router.push(href),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        router.push(href);
      }
    },
  });

  return (
    <KpiGrid
      columns={3}
      style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
    >
      {/* Work in progress: capital sitting between the four stages. Left
          neutral — WIP over target is a thing to watch, not a fault, and the
          red is reserved for figures that are actually going wrong. */}
      <KpiBreakdownCard
        title="Work in progress"
        value={`$${(WIP.value / 1000).toFixed(2)}m`}
        subtitle={`${WIP.yards.toLocaleString()} lin yd · ${wipVsTarget() > 0 ? "+" : ""}${wipVsTarget()}% vs target`}
        {...open("/scheduling")}
      />

      {/* The agents' dollar value this week — the number no conventional plant
          dashboard carries. Starred like every other agent contribution. */}
      <span className="relative block">
        <KpiBreakdownCard
          className="kpi-agent"
          title="Savings by the engine"
          value={`$${ENGINE_SAVINGS.total}k`}
          subtitle={`waste + changeover + recovery · +${ENGINE_SAVINGS.wkChange}pt wk`}
          {...open("/make")}
        />
        <AiStar
          size={14}
          aria-hidden="true"
          style={{ position: "absolute", left: 16, top: 20, pointerEvents: "none" }}
        />
      </span>

      <KpiBreakdownCard
        title="Yarn output"
        value={YARN_KPIS[1].value}
        subtitle={`creel · ${pendingApprovals} to sign off`}
        {...open("/yarn")}
      />

      <KpiBreakdownCard
        title="Claims this week"
        value={String(CLAIMS_QUEUE.length)}
        subtitle={`$${(claimsCost / 1000).toFixed(1)}k · ${Math.round(
          (MARGIN_BRIDGE.fromSequencing / MARGIN_BRIDGE.total) * 100,
        )}% sequencing`}
        {...card(CLAIMS_QUEUE.length > 0)}
        {...open("/quality")}
      />
    </KpiGrid>
  );
}

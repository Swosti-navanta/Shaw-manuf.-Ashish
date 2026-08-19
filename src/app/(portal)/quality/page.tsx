"use client";

import { KpiBreakdownCard, KpiGrid, PageHeading } from "@navanta-ai/design-system";
import { useScope } from "@/context/ScopeContext";
import { plantLabel } from "@/types/division";
import { CLAIMS_KPIS } from "@/types/quality";
import { DefectHeatmap, ReviewStrip } from "./claims/_ClaimsInsight";
import QcTabs from "./claims/_QcTabs";

/**
 * Quality — the whole quality story on one surface.
 *
 * The standing scorecard (KPIs) sits beside where the defects land (the
 * heatmap), and below them the checks a lot passes through — yarn, dye,
 * finished order — and the claims that got past all three. The Claims tab
 * leads with the rule that closes the loop: the only place the pattern turns
 * into something the scheduler is checked against.
 */
export default function QualityPage() {
  const { plant } = useScope();
  const scope = `${plantLabel(plant)} · last 4 months`;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading
        title="Three claims, four months, one cause"
        subtitle={`Quality & claims · Wren · ${scope}`}
      />

      {/* Who stands behind the reading. */}
      <ReviewStrip />

      {/* Standing scorecard beside where the defects land — half and half. */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <KpiGrid columns={2}>
          {CLAIMS_KPIS.map((kpi) => (
            <KpiBreakdownCard
              key={kpi.key}
              title={kpi.label}
              value={kpi.value}
              subtitle={kpi.detail}
              info={kpi.info}
            />
          ))}
        </KpiGrid>

        <DefectHeatmap />
      </div>

      {/* The checks a lot passes through, and the claims that got past them. */}
      <QcTabs />
    </div>
  );
}

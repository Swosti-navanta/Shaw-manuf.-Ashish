"use client";

import { usePersona } from "@/context/PersonaContext";
import { useScope } from "@/context/ScopeContext";
import { PageHeading } from "@navanta-ai/design-system";
import { plantLabel } from "@/types/division";

import BeltRateChart from "./_components/BeltRateChart";
import ExecKpis from "./_components/ExecKpis";
import MachineHealthCard from "./_components/MachineHealthCard";
import BeltPerformanceTable from "./_components/BeltPerformanceTable";

export default function OverviewPage() {
  const { plant } = useScope();
  const { profile } = usePersona();

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* The scope moved into the subtitle: the heading names the surface, and
          the plant it is scoped to is already stated twice above it — in the
          top bar and in the plant selector. */}
      <PageHeading
        title="Executive dashboard"
        subtitle={`${plantLabel(plant)}, this week. Every figure below is the one its own surface reports — ${profile.name} resolves the exceptions where they live.`}
      />

      <ExecKpis />

      <div
        className="grid"
        style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))" }}
      >
        <MachineHealthCard />

        <BeltRateChart />
      </div>

      <BeltPerformanceTable />
    </div>
  );
}


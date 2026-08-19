"use client";

import { useState } from "react";
import { usePersona } from "@/context/PersonaContext";
import { useScope } from "@/context/ScopeContext";
import { PageHeading, Select } from "@navanta-ai/design-system";
import { plantLabel } from "@/types/division";
import { LINES } from "@/data/run-data";

import SurfaceCard from "@/components/ui/SurfaceCard";
import BeltRateChart from "./_components/BeltRateChart";
import ExecKpis from "./_components/ExecKpis";
import MachineHealthCard from "./_components/MachineHealthCard";
import BeltPerformanceTable from "./_components/BeltPerformanceTable";

const ALL_BELTS = "all";

export default function OverviewPage() {
  const { plant } = useScope();
  const { profile } = usePersona();
  const [belt, setBelt] = useState<string>(ALL_BELTS);

  const beltPicker = (
    <span className="inline-flex" style={{ minWidth: 150 }}>
      <Select value={belt} onValueChange={setBelt} size="sm">
        <Select.Trigger aria-label="Belt">
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value={ALL_BELTS}>All belts</Select.Item>
          {LINES.map((l) => (
            <Select.Item key={l.name} value={l.name}>
              {l.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </span>
  );

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

        <SurfaceCard title="Belt yield · planned vs actual" caption={beltPicker}>
          <BeltRateChart belt={belt} />
        </SurfaceCard>
      </div>

      <BeltPerformanceTable />
    </div>
  );
}


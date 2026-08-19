"use client";

import { useScope } from "@/context/ScopeContext";
import { PageHeading } from "@navanta-ai/design-system";
import { plantLabel } from "@/types/division";
import BeltPlan from "./_components/BeltPlan";

export default function SchedulingPage() {
  const { plant } = useScope();

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading
        title="The visual schedule"
        subtitle={`Scheduling · Sawyer · ${plantLabel(plant)}. Move a run and Sawyer recomputes the changeover, guarding the dye-lot and promised-date rules as you go.`}
      />

      {/* Board and backlog are two views of one plan, so they live in one card
          with two tabs rather than two stacked surfaces. */}
      <BeltPlan />
    </div>
  );
}

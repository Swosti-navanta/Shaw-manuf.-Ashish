"use client";

import SurfaceScaffold from "@/components/layout/SurfaceScaffold";

export default function ThresholdsPage() {
  return (
    <SurfaceScaffold
      agent="Limits"
      title="The dial you set — per plant"
      subtitle="Same engine everywhere; each plant sets its own limits. Change the plant and the dial changes with it."
      contains={[
        "Auto / Limit / Ask per decision type, set per plant",
        "Re-sequence where a promised date moves · grade a borderline roll · split a dye lot · add overtime",
        "Wired rows — flip one to Auto and the matching exception stops reaching a person",
        "What the agents never do: run the line, write the demand plan, grade the product, overrule a hold",
        "What it sits on top of: scheduling, MES & batch management, maintenance",
      ]}
    />
  );
}

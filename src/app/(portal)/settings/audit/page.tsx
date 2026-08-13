"use client";

import SurfaceScaffold from "@/components/layout/SurfaceScaffold";

export default function AuditPage() {
  return (
    <SurfaceScaffold
      agent="Audit"
      title="Every decision, and who made it"
      subtitle="Written as the run happens — which is what makes a claim settleable rather than arguable."
      contains={[
        "Decision log: what the agent proposed, what a person chose, and when",
        "Which threshold sent each decision to a person — or didn't",
        "Overrides, with the reason captured at the moment of the override",
        "Rule changes fed back from Quality into the constraint model",
      ]}
    />
  );
}

"use client";

import { KpiBreakdownCard, KpiGrid } from "@navanta-ai/design-system";
import { useYarn } from "@/context/YarnContext";
import { APPROVALS, YARN_KPIS } from "@/types/yarn";

/** Pull a reading out of YARN_KPIS by label, so the numbers stay in one place. */
const kpi = (label: string) => YARN_KPIS.find((k) => k.label === label);

/**
 * Sable's read — four figures, on DS breakdown cards.
 *
 * Dollars at stake leads: this is a queue of signatures, and the first thing
 * that ranks it is how much money is riding on the lots still waiting. The
 * others are the levers behind it — how full the creel ran, how many signatures
 * are open, and whether the shade-critical lot was held whole. All four move
 * with the queue, so the read never disagrees with the table under it.
 */
export default function SableRead() {
  const { states, pendingApprovals } = useYarn();
  const creel = kpi("Creel utilisation");
  const shade = kpi("Shade-critical lots");

  // Money riding on the lots still waiting — sum of stake over the undecided
  // rows, so signing one off takes it out of the headline too.
  const atStake = APPROVALS.filter((a) => !states.has(a.id)).reduce((n, a) => n + a.value, 0);

  return (
    <KpiGrid columns={4}>
      <KpiBreakdownCard
        title="Value at stake"
        value={`$${atStake.toLocaleString()}`}
        subtitle={`across ${pendingApprovals} lot${pendingApprovals === 1 ? "" : "s"} waiting to sign off`}
      />
      <KpiBreakdownCard
        title="Creel utilisation"
        value={creel?.value ?? "—"}
        subtitle={creel?.detail ?? ""}
      />
      <KpiBreakdownCard
        title="Waiting on you"
        value={String(pendingApprovals)}
        subtitle={
          pendingApprovals > 0
            ? `to sign off · nothing here runs on its own`
            : "queue clear · nothing waiting"
        }
      />
      <KpiBreakdownCard
        title="Shade-critical lots"
        value={shade?.value ?? "—"}
        subtitle={shade?.detail ?? ""}
      />
    </KpiGrid>
  );
}

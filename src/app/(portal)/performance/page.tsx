"use client";

import SurfaceScaffold from "@/components/layout/SurfaceScaffold";
import { useScope } from "@/context/ScopeContext";
import { DIVISIONS, plantLabel } from "@/types/division";

export default function PerformancePage() {
  const { visiblePlants, divisionInfo } = useScope();

  return (
    <SurfaceScaffold
      networkWide
      agent="Roll-up"
      title="One engine, every plant"
      subtitle="Attainment, adherence and auto-resolution rates across the network — and where the dial is set too tight or too loose."
      contains={[]}
    >
      {/* Placeholder roll-up. It exists now purely to prove the division
          filter reaches a page and changes what it sums over. */}
      <div
        style={{
          background: "var(--surface-base)",
          border: "1px solid var(--border-default)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-default)" }}
        >
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            Plants in scope
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {divisionInfo?.name ?? "All divisions"} · {visiblePlants.length}
          </span>
        </div>
        {visiblePlants.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between"
            style={{ padding: "12px 18px", borderTop: "1px solid var(--border-light)" }}
          >
            <div className="flex flex-col">
              <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                {plantLabel(p.id)}
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {DIVISIONS[p.division].name} · {DIVISIONS[p.division].product}
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "var(--ds-text-placeholder, var(--text-muted))",
              }}
            >
              constraint · {p.constraintLine}
            </span>
          </div>
        ))}
      </div>
    </SurfaceScaffold>
  );
}

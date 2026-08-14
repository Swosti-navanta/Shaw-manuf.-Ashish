"use client";

import { KpiBreakdownCard, KpiGrid, PageHeading } from "@navanta-ai/design-system";
import { useScope } from "@/context/ScopeContext";
import { PLANTS, plantMatchesDivision } from "@/types/division";
import {
  DIAL_FINDINGS,
  PLANT_ENGINE,
  enginePct,
  type DialFinding,
} from "@/data/executive-data";
import SurfaceCard from "@/components/ui/SurfaceCard";

/**
 * How every plant runs the same engine.
 *
 * The question here is not "who is behind" — the executive dashboard's plant
 * table answers that. It is *whether each plant has the dial set right*, which
 * only reads when attainment, adherence and autonomy sit on one row. A plant
 * escalating everything is not being careful, it is paying people to
 * rubber-stamp; a plant auto-resolving everything and then taking claims has
 * been set too loose. Both are mis-calibration, in opposite directions.
 */
export default function PerformancePage() {
  const { division, divisionInfo } = useScope();

  const rows = PLANT_ENGINE.filter((e) => plantMatchesDivision(e.plant, division));
  const findings = DIAL_FINDINGS.filter((f) => plantMatchesDivision(f.plant, division));

  const resolved = rows.reduce((n, r) => n + r.resolved, 0);
  const escalated = rows.reduce((n, r) => n + r.escalated, 0);
  const autonomy = Math.round((resolved / Math.max(1, resolved + escalated)) * 1000) / 10;
  const attainment =
    Math.round((rows.reduce((n, r) => n + r.attainment, 0) / Math.max(1, rows.length)) * 10) / 10;
  const adherence =
    Math.round((rows.reduce((n, r) => n + r.adherence, 0) / Math.max(1, rows.length)) * 10) / 10;
  const tight = findings.filter((f) => f.direction === "tight").length;
  const loose = findings.filter((f) => f.direction === "loose").length;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading
        title="One engine, every plant"
        subtitle={`Performance · Iris · ${divisionInfo?.name ?? "All divisions"}. Attainment, adherence and auto-resolution across ${rows.length} plants — and where the dial is set too tight or too loose.`}
      />

      <KpiGrid columns={4}>
        <KpiBreakdownCard
          title="Attainment"
          value={`${attainment}%`}
          subtitle={`output against plan · ${rows.length} plants`}
          className={attainment < 95 ? "kpi-alert" : undefined}
        />
        <KpiBreakdownCard
          title="Schedule adherence"
          value={`${adherence}%`}
          subtitle="ran what was released, in the order released"
          className={adherence < 80 ? "kpi-alert" : undefined}
        />
        <KpiBreakdownCard
          title="Resolved by the engine"
          value={`${autonomy}%`}
          subtitle={`${resolved} settled · ${escalated} reached a person`}
        />
        <KpiBreakdownCard
          title="Dial findings"
          value={String(findings.length)}
          subtitle={`${tight} too tight · ${loose} too loose`}
          className={loose > 0 ? "kpi-alert" : undefined}
        />
      </KpiGrid>

      <SurfaceCard title="Plants" caption="attainment · adherence · what the engine settled">
        <div className="flex flex-col">
          {/* Header */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: "minmax(0,1.4fr) repeat(4, minmax(0,1fr))",
              gap: 8,
              padding: "0 0 8px",
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            {["Plant", "Attainment", "Adherence", "Auto-resolved", "Reached a person"].map((h, i) => (
              <span
                key={h}
                className="type-caption"
                style={{
                  color: "var(--ds-text-secondary)",
                  textAlign: i === 0 ? "left" : "right",
                  fontWeight: 600,
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {rows.map((r) => {
            const p = PLANTS[r.plant];
            const behind = r.attainment < 95;
            return (
              <div
                key={r.plant}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "minmax(0,1.4fr) repeat(4, minmax(0,1fr))",
                  gap: 8,
                  padding: "11px 0",
                  borderBottom: "1px solid var(--border-light)",
                }}
              >
                <span className="flex flex-col" style={{ gap: 1 }}>
                  <span
                    className="type-body font-medium"
                    style={{ color: behind ? "var(--lane-limit-ink)" : "var(--ds-text-primary)" }}
                  >
                    {p.code} · {p.location}
                  </span>
                  <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                    constraint · {p.constraintLine}
                  </span>
                </span>
                <Cell value={`${r.attainment}%`} alert={behind} />
                <Cell value={`${r.adherence}%`} alert={r.adherence < 80} />
                <Cell value={`${enginePct(r)}%`} sub={`${r.resolved} settled`} />
                <Cell
                  value={String(r.escalated)}
                  sub={r.claimsFromAuto > 0 ? `${r.claimsFromAuto} claims from auto` : "no claims"}
                  alert={r.claimsFromAuto > 0}
                />
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Where the dial is mis-set"
        caption="what Iris would change, and the evidence for it"
      >
        <div className="flex flex-col" style={{ gap: 10 }}>
          {findings.map((f) => (
            <DialRow key={`${f.plant}-${f.key}`} finding={f} />
          ))}
          {findings.length === 0 && (
            <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
              Nothing to change — every limit in scope is earning its interruptions.
            </span>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}

function Cell({ value, sub, alert }: { value: string; sub?: string; alert?: boolean }) {
  return (
    <span className="flex flex-col items-end" style={{ gap: 1 }}>
      <span
        className="type-body"
        style={{
          fontVariantNumeric: "tabular-nums",
          color: alert ? "var(--text-danger)" : "var(--ds-text-primary)",
        }}
      >
        {value}
      </span>
      {sub && (
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          {sub}
        </span>
      )}
    </span>
  );
}

/**
 * One mis-set limit.
 *
 * "Too tight" and "too loose" are deliberately not the same colour: a tight
 * limit wastes attention, a loose one has already cost money, and a page that
 * spells them identically invites fixing the cheap one first.
 */
function DialRow({ finding }: { finding: DialFinding }) {
  const loose = finding.direction === "loose";
  const p = PLANTS[finding.plant];

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 4,
        padding: "11px 13px",
        borderRadius: 10,
        border: "1px solid var(--border-light)",
        background: loose ? "var(--surface-danger)" : "var(--surface-raised)",
      }}
    >
      <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: 5,
            background: loose ? "var(--text-danger)" : "var(--lane-limit-bg)",
            color: loose ? "#FFFFFF" : "var(--lane-limit-ink)",
          }}
        >
          {loose ? "Too loose" : "Too tight"}
        </span>
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {finding.label}
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          {p.code} · {p.location}
        </span>
      </span>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        {finding.evidence}
      </span>
      <span className="type-caption" style={{ color: "var(--color-iris-700)" }}>
        {finding.suggestion}
      </span>
    </div>
  );
}

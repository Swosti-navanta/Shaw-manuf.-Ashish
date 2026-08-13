"use client";

import { Button, PanelInfoGrid } from "@navanta-ai/design-system";
import type { DetailTarget } from "@/context/DetailDrawerContext";
import { useDetailDrawer } from "@/context/DetailDrawerContext";
import { useRun } from "@/context/RunContext";
import { useScope } from "@/context/ScopeContext";
import { plantLabel } from "@/types/division";
import { LANE_LABEL, LANE_MEANING, type OptionId } from "@/types/run";
import { thresholdLabel } from "@/types/threshold";
import DrillLink from "@/components/ui/DrillLink";
import Genealogy from "@/app/(portal)/make/_components/Genealogy";
import LaneChip from "@/components/ui/LaneChip";
import {
  BATCH,
  CLAIMS,
  DOWNTIME,
  DOWNTIME_TOTAL,
  DYE_LOT,
  INSPECTION,
  KPI_DETAIL,
  KPI_TRENDS,
  OEE_FACTORS,
  OPTIONS,
  ORDERS,
  PRICING,
  ROLL,
  RUN,
  CONSTRAINT_LINE,
} from "@/data/run-data";
import { Figure, Lead, Pareto, Section, Sparkline, Strong } from "./DetailPrimitives";

/**
 * Title + subtitle for the DS panel header. The identifier is the title —
 * it's what someone came here to look up — and the subtitle says what kind of
 * thing it is plus the one fact that makes it worth opening.
 */
export function detailHeading(target: DetailTarget): { title: string; subtitle: string } {
  switch (target.kind) {
    case "roll":
      return { title: ROLL.id, subtitle: `Roll · ${ROLL.grade.toLowerCase()}` };
    case "dyelot":
      return { title: DYE_LOT.id, subtitle: "Dye lot · shade-critical" };
    case "batch":
      return { title: BATCH.id, subtitle: `Batch · ${BATCH.status.toLowerCase()}` };
    case "yarn":
      return { title: RUN.yarnLot, subtitle: "Yarn lot · solution-dyed BCF" };
    case "order": {
      const o = ORDERS[target.id];
      return {
        title: target.id,
        subtitle: o ? `Order · ${o.customer}` : "Order",
      };
    }
    case "claim": {
      const c = CLAIMS.find((x) => x.id === target.id);
      return {
        title: target.id,
        subtitle: c ? `Field claim · ${c.month} 2026` : "Field claim",
      };
    }
    case "machine":
      return { title: CONSTRAINT_LINE.name, subtitle: "Machine · constraint line" };
    case "workorder":
      return { title: "WO — draft", subtitle: `Work order · ${CONSTRAINT_LINE.name}` };
    case "kpi":
      return {
        title: KPI_DETAIL[target.id]?.title ?? "KPI",
        subtitle: `KPI · ${KPI_DETAIL[target.id]?.value ?? "this shift"}`,
      };
    case "option":
      return {
        title: OPTIONS[target.id]?.title ?? "Option",
        subtitle: `Recovery option · ${OPTIONS[target.id]?.cost ?? ""} ${OPTIONS[target.id]?.costLabel ?? ""}`.trim(),
      };
    case "feed":
      return { title: "Activity", subtitle: "What the agents did, and why" };
  }
}

export function DetailBody({ target }: { target: DetailTarget }) {
  switch (target.kind) {
    case "roll": return <RollDetail />;
    case "dyelot": return <DyeLotDetail />;
    case "batch": return <BatchDetail />;
    case "yarn": return <YarnDetail />;
    case "order": return <OrderDetail id={target.id} />;
    case "claim": return <ClaimDetail id={target.id} />;
    case "machine": return <MachineDetail />;
    case "workorder": return <WorkOrderDetail />;
    case "kpi": return <KpiDetail id={target.id} />;
    case "option": return <OptionDetail id={target.id as OptionId} />;
    case "feed": return <FeedDetail index={Number(target.id)} />;
  }
}

/* ─── Roll ──────────────────────────────────────────────────────────────── */

function RollDetail() {
  const fails = INSPECTION.filter((m) => !m.pass).length;
  const gap = PRICING.first - PRICING.second;
  const loss = Math.round(ROLL.qty * gap);

  return (
    <>
      <Lead
        tone="danger"
        verdict="Borderline — flagged for shade variation"
        detail={`${fails} of ${INSPECTION.length} measurements out of spec, and it's the 2nd occurrence this week (prior: ${ROLL.prior}) — so it goes to a person rather than being auto-graded.`}
      />

      <Section title="End-of-line inspection · measured vs spec">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Measurement", "Spec", "Actual", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h === "Measurement" ? "left" : "right",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ds-text-placeholder, var(--text-muted))",
                    padding: "0 0 6px",
                    fontWeight: 400,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INSPECTION.map((m) => (
              <tr key={m.metric} style={{ borderTop: "1px solid var(--border-light)" }}>
                <td className="type-caption" style={{ padding: "7px 0", color: "var(--ds-text-primary)" }}>
                  {m.metric}
                </td>
                <td style={{ padding: "7px 0", textAlign: "right", fontSize: 11, color: "var(--ds-text-secondary)" }}>
                  {m.spec}
                </td>
                <td
                  style={{
                    padding: "7px 0",
                    textAlign: "right",
                    fontSize: 11,
                    fontWeight: m.pass ? 400 : 600,
                    color: m.pass ? "var(--ds-text-primary)" : "var(--text-danger)",
                  }}
                >
                  {m.actual}
                </td>
                <td style={{ padding: "7px 0 7px 10px", textAlign: "right", width: 20 }}>
                  <span style={{ color: m.pass ? "var(--text-success)" : "var(--text-warning)" }}>
                    {m.pass ? "✓" : "⚠"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <PanelInfoGrid
          title="Where it's coming from"
          rows={[
            { label: "Yarn lot", value: <DrillLink kind="yarn" id={RUN.yarnLot} /> },
            { label: "Dye lot", value: <DrillLink kind="dyelot" id={DYE_LOT.id} /> },
            { label: "Batch", value: <DrillLink kind="batch" id={BATCH.id} /> },
            { label: "Run", value: `${CONSTRAINT_LINE.name} · Shift ${RUN.shift} · ${RUN.start}–${RUN.end}` },
            { label: "Operator", value: `${RUN.operator} · ${CONSTRAINT_LINE.achieved} yd/hr vs std ${CONSTRAINT_LINE.standard}` },
          ]}
        />

      <Section title="Why it's an issue">
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
          Backing 2 ran <Strong tone="bad">12% under rate</Strong> and a shade drift crept in — dye
          ΔE reached <Strong tone="bad">2.9 against a 2.5 tolerance</Strong>, with slight streaking.
          A one-off is watched; this is the second this week, which reads as a{" "}
          <Strong>pattern</Strong>, so Wren routes it to a person and traces the cause upstream.
        </p>
      </Section>

      <Section title="Commercial impact">
        <Figure
          value={`$${loss.toLocaleString()}`}
          tone="bad"
          caption={`${ROLL.qty} lin yd × ($${PRICING.first} first quality − $${PRICING.second} seconds = $${gap.toFixed(1)}). A downgrade, not scrap.`}
        />
      </Section>

      <Section title="What happens next">
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
          Wren proposes: grade as <Strong>second</Strong>, route to outlet, and flag the dye-lot
          split as the cause. You decide the grade —{" "}
          <Strong>the agent never grades the product.</Strong>
        </p>
      </Section>
    </>
  );
}

/* ─── Dye lot ───────────────────────────────────────────────────────────── */

function DyeLotDetail() {
  const { decision } = useRun();
  const split = decision === "B";

  return (
    <>
      <Lead
        tone={split ? "danger" : "warning"}
        verdict={split ? "Split — shade at risk" : "Shade-critical — held whole"}
        detail={`A large order must come from one dye lot; two lots of the same colour won't shade-match. ${DYE_LOT.id} is committed across two orders and sits at the centre of today's exception.`}
      />

      <PanelInfoGrid
          title="Lot detail"
          rows={[
            { label: "Style", value: RUN.style },
            { label: "Colour", value: DYE_LOT.colour },
            { label: "Yarn lot", value: <DrillLink kind="yarn" id={RUN.yarnLot} /> },
            { label: "Quantity", value: `${DYE_LOT.qty.toLocaleString()} lin yd` },
            { label: "Dyed", value: DYE_LOT.dyedAt },
            { label: "Shade target", value: DYE_LOT.shadeTarget },
            {
              label: "Status",
              value: split ? (
                <Strong tone="bad">Split — shade risk</Strong>
              ) : (
                <Strong>Held whole</Strong>
              ),
            },
          ]}
        />

      <PanelInfoGrid
          title="Committed to"
          rows={[
            ...DYE_LOT.orders.map((id) => {
              const o = ORDERS[id];
              return {
                label: o.customer,
                value: (
                  <span className="inline-flex items-baseline" style={{ gap: 8 }}>
                    <DrillLink kind="order" id={o.id} />
                    <span style={{ fontSize: 11, color: "var(--ds-text-secondary)" }}>
                      {o.qty.toLocaleString()} · {o.promised}
                      {o.fixed ? " fixed" : ""}
                    </span>
                  </span>
                ),
              };
            }),
            { label: "Uncommitted", value: `${(DYE_LOT.qty - DYE_LOT.committed).toLocaleString()} lin yd` },
          ]}
        />

      <Section title="Batch genealogy">
        <Genealogy />
        <p className="type-caption" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5, marginTop: 8 }}>
          Written as the run happens — which is what makes a claim{" "}
          <Strong>settleable</Strong>, not arguable.
        </p>
      </Section>

      <Section title="The risk if split">
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
          Two dye runs land <Strong tone="bad">~ΔE 3.4 apart</Strong> — past tolerance. That&apos;s
          what happened on DL-4102 in June → <DrillLink kind="claim" id="CLM-2291" />, a shade claim
          and a seconds downgrade.
        </p>
      </Section>
    </>
  );
}

/* ─── Batch ─────────────────────────────────────────────────────────────── */

function BatchDetail() {
  return (
    <>
      <Lead
        tone="danger"
        verdict={`On quality hold since ${BATCH.since}`}
        detail={`Held at end-of-line inspection when roll ${ROLL.id} showed shade variation. Nothing ships from this batch until a person grades it.`}
      />

      <PanelInfoGrid
          title="Batch detail"
          rows={[
            { label: "Dye lot", value: <DrillLink kind="dyelot" id={DYE_LOT.id} /> },
            { label: "Roll", value: <DrillLink kind="roll" id={ROLL.id} /> },
            { label: "Quantity", value: BATCH.qty },
            { label: "Line", value: BATCH.line },
            { label: "Shift", value: RUN.shift },
            { label: "Run", value: `${RUN.start}–${RUN.end}` },
          ]}
        />

      <PanelInfoGrid
          title="Hold record"
          rows={[
            { label: "Flagged by", value: BATCH.flaggedBy },
            { label: "At", value: BATCH.since },
            { label: "Reason", value: <Strong tone="bad">{BATCH.reason}</Strong> },
            { label: "Station", value: BATCH.station },
            { label: "Escalated", value: "To Wren for grade" },
          ]}
        />

      <Section title="What triggered it">
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
          Shade ΔE reached <Strong tone="bad">2.9 (tol 2.5)</Strong> with slight streaking — see the
          full inspection in the <DrillLink kind="roll" id={ROLL.id} variant="prose">roll detail</DrillLink>.
          The batch behind it (B-88209) hit the same fault in May.
        </p>
      </Section>

      <Section title="Exposure">
        <Figure
          value={`$${Math.round(ROLL.qty * (PRICING.first - PRICING.second)).toLocaleString()}`}
          tone="bad"
          caption="on the roll at risk if downgraded to seconds"
        />
      </Section>
    </>
  );
}

/* ─── Yarn ──────────────────────────────────────────────────────────────── */

function YarnDetail() {
  return (
    <>
      <Lead
        tone="info"
        verdict="Solution-dyed BCF · Dune 240"
        detail="Colour goes into the polymer at extrusion — there's no separate dye step, so shade is set at the yarn and lot continuity is everything."
      />

      <PanelInfoGrid
          title="Yarn detail"
          rows={[
            { label: "Construction", value: "Bulked continuous filament" },
            { label: "Colour", value: "Dune 240 · solution-dyed" },
            { label: "Denier", value: "1,150 / 68 filament" },
            { label: "Supplier lot", value: "SY-2231" },
            { label: "Quantity", value: "3,400 lb" },
            { label: "Creel position", value: "Backing 2 · creel B" },
          ]}
        />

      <PanelInfoGrid
          title="Dye lots from it"
          rows={[
            {
              label: DYE_LOT.id,
              value: (
                <span className="inline-flex items-baseline" style={{ gap: 8 }}>
                  <DrillLink kind="dyelot" id={DYE_LOT.id} />
                  <span style={{ fontSize: 11, color: "var(--ds-text-secondary)" }}>
                    {DYE_LOT.qty.toLocaleString()} lin yd · shade-critical
                  </span>
                </span>
              ),
            },
          ]}
        />

      <Section title="Sable's role">
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
          Sable sizes and sequences this lot so big orders hold their shade with the least waste.
        </p>
      </Section>
    </>
  );
}

/* ─── Order ─────────────────────────────────────────────────────────────── */

function OrderDetail({ id }: { id: string }) {
  const o = ORDERS[id];
  if (!o) return null;

  return (
    <>
      {/* An order record is reference material, so it leads in `info` unless
          the plan actually puts the promise in jeopardy. Colour that shouts on
          every order teaches people to stop reading it. */}
      <Lead tone={o.risk} verdict={o.headline} detail={o.detail} />

      <PanelInfoGrid
          title="Order"
          rows={[
            { label: "Customer", value: `${o.customer} · ${o.city}` },
            { label: "Product", value: RUN.style },
            { label: "Quantity", value: `${o.qty.toLocaleString()} lin yd` },
            { label: "Order value", value: `$${Math.round(o.qty * PRICING.first).toLocaleString()}` },
            { label: "Dye lot", value: <DrillLink kind="dyelot" id={DYE_LOT.id} /> },
          ]}
        />

      <PanelInfoGrid
          title="Commitment"
          rows={[
            { label: "Promised", value: o.promised },
            {
              label: "Type",
              value: o.fixed ? "Fixed install · crew booked" : "Movable ± a few days",
            },
            { label: "Current slot", value: o.risk === "info" ? "Not yet placed" : "Backing 2 · slot 2" },
            {
              label: "Projected finish",
              value:
                o.risk === "info" ? (
                  "On time"
                ) : (
                  <Strong tone="bad">{`${RUN.projectedSlip} · margin tight`}</Strong>
                ),
            },
          ]}
        />

      {o.risk !== "info" && (
        <Section title="If it misses">
          <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
            A missed install means a re-booked crew and a likely chargeback — which is why{" "}
            <DrillLink kind="option" id="A" variant="prose">Option A</DrillLink> (hold the date, pay
            the changeover) beats <DrillLink kind="option" id="B" variant="prose">Option B</DrillLink>{" "}
            (save changeover, risk shade and the date).
          </p>
        </Section>
      )}
    </>
  );
}

/* ─── Claim ─────────────────────────────────────────────────────────────── */

function ClaimDetail({ id }: { id: string }) {
  const c = CLAIMS.find((x) => x.id === id) ?? CLAIMS[0];

  return (
    <>
      <Lead
        tone="danger"
        verdict="Field claim — shade mismatch"
        detail={`${c.id} came back from the field: two areas of the same order didn't match. Traced to a dye lot split to protect a date.`}
      />

      <PanelInfoGrid
          title="Claim"
          rows={[
            { label: "Raised", value: `${c.month} 2026` },
            { label: "Product", value: RUN.style },
            { label: "Root cause", value: c.cause },
            { label: "Batch", value: c.batch },
            { label: "Dye lot", value: c.dyeLot },
            { label: "Rolls", value: c.rolls },
          ]}
        />

      <Section title="Cost">
        <Figure value="$18,400" tone="bad" caption="credit + seconds downgrade on this claim" />
      </Section>

      <Section title="The pattern">
        <Pareto
          rows={CLAIMS.map((x, i) => ({
            label: `${x.id} · ${x.month}`,
            weight: 100 - i * 18,
            value: "split lot",
            hot: true,
          }))}
        />
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55, marginTop: 8 }}>
          Three claims in four months, one cause. This is what Wren sends upstream to become a
          scheduling rule.
        </p>
      </Section>
    </>
  );
}

/* ─── Machine ───────────────────────────────────────────────────────────── */

function MachineDetail() {
  const l = CONSTRAINT_LINE;
  return (
    <>
      <Lead
        tone="danger"
        verdict="Constraint line — running 12% under plan"
        detail={`An hour lost here is lost for the whole plant. OEE ${l.oee}%, PM due ${l.pmWindow}, and a rising vibration signature.`}
      />

      <Section title={`OEE = ${l.oee}%`}>
        <Pareto
          rows={OEE_FACTORS.map((f) => ({ label: f.label, weight: f.pct, value: f.value }))}
        />
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", marginTop: 8 }}>
          Performance is the drag — {l.achieved} against a {l.standard} standard.
        </p>
      </Section>

      <Section title={`Downtime this shift · ${DOWNTIME_TOTAL} min`}>
        <Pareto
          rows={DOWNTIME.map((d) => ({
            label: d.reason,
            weight: d.minutes,
            value: `${d.minutes}m`,
            hot: d.linked,
          }))}
        />

      <PanelInfoGrid
          title="Maintenance"
          rows={[
            { label: "Last PM", value: "28 Jul · 14 days ago" },
            { label: "Next PM", value: l.pmWindow ?? "—" },
            { label: "Vibration", value: <Strong tone="bad">{`Rising · ${l.vibration?.current}`}</Strong> },
            { label: "Baseline", value: l.vibration?.baseline ?? "—" },
          ]}
        />
      </Section>

      <Section title="Act">
        <RaiseWorkOrderButton />
        <p className="type-caption" style={{ color: "var(--ds-text-secondary)", marginTop: 10, lineHeight: 1.5 }}>
          <Strong>Predictive maintenance</Strong> — the model that flags this before failure — is not
          demo-ready; it needs your machine data.
        </p>
      </Section>
    </>
  );
}

function RaiseWorkOrderButton() {
  const { open } = useDetailDrawer();
  return (
    <Button variant="outline" size="sm" onClick={() => open("workorder", "draft")}>
      Create work order
    </Button>
  );
}

/* ─── Work order ────────────────────────────────────────────────────────── */

function WorkOrderDetail() {
  return (
    <>
      <Lead
        tone="info"
        verdict="Plug-in"
        detail="Rowan raises the work order and routes it into your maintenance system with the context already attached — no re-keying."
      />

      <PanelInfoGrid
          title="Work order"
          rows={[
            { label: "Asset", value: CONSTRAINT_LINE.name },
            { label: "Trigger", value: `Vibration ${CONSTRAINT_LINE.vibration?.current} · PM ${CONSTRAINT_LINE.pmWindow}` },
            { label: "Priority", value: <Strong tone="bad">High</Strong> },
            { label: "Route to", value: "your maintenance system" },
            { label: "Context", value: "Deviation + run at risk (ORD-77310)" },
            { label: "Raised", value: "Rowan · auto-drafted" },
          ]}
        />

      <Section title="Not yet">
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
          <Strong>Predictive maintenance</Strong> — the model that would raise this{" "}
          <em>before</em> the signal — is not demo-ready. It needs your machine data.
        </p>
      </Section>
    </>
  );
}

/* ─── KPI ───────────────────────────────────────────────────────────────── */

function KpiDetail({ id }: { id: string }) {
  const m = KPI_DETAIL[id];
  const trend = KPI_TRENDS[id];
  if (!m) return null;

  return (
    <>
      <Lead
        tone={m.tone === "bad" ? "danger" : m.tone === "warn" ? "warning" : "info"}
        verdict={`${m.title} · ${m.value}`}
        detail={m.body}
      />

      {trend && (
        <Section title="Trend · last 7 readings">
          <Sparkline series={trend} tone={m.tone === "bad" ? "bad" : "neutral"} />
          <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
            {["06:00", "now"].map((t) => (
              <span
                key={t}
                style={{ fontSize: 10, color: "var(--ds-text-placeholder, var(--text-muted))" }}
              >
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {m.extra === "downtime" && (
        <Section title="Downtime by reason code">
          <Pareto
            rows={DOWNTIME.map((d) => ({
              label: d.reason,
              weight: d.minutes,
              value: `${d.minutes}m`,
              hot: d.linked,
            }))}
          />
        </Section>
      )}

      {m.extra === "yield" && (
        <Section title="Loss by type">
          <Pareto
            rows={[
              { label: "Shade variation", weight: 2.1, value: "2.1%", hot: true },
              { label: "Edge trim", weight: 1.0, value: "1.0%" },
              { label: "Tuft faults", weight: 0.5, value: "0.5%" },
            ]}
          />
        </Section>
      )}

      <Section title="Current">
        <Figure
          value={m.value}
          tone={m.tone === "bad" ? "bad" : "neutral"}
          caption={`latest reading${m.tone === "bad" ? " · past the alert band" : ""}`}
        />
      </Section>
    </>
  );
}


/* ─── Recovery option ───────────────────────────────────────────────────── */

function OptionDetail({ id }: { id: OptionId }) {
  const o = OPTIONS[id];
  const { accept, status } = useRun();
  const { close } = useDetailDrawer();
  if (!o) return null;

  return (
    <>
      <Lead
        tone={o.risky ? "danger" : o.recommended ? "success" : "info"}
        verdict={
          o.risky
            ? "Repeats a known cause"
            : o.recommended
              ? "Rowan's recommendation"
              : "Alternative"
        }
        detail={o.detail}
      />

      <PanelInfoGrid
          title="Cost breakdown"
          rows={o.breakdown.map((r) => ({
            label: r.label,
            value: (
              <span
                style={{
                  fontWeight: r.net ? 600 : 400,
                  color: r.bad ? "var(--text-danger)" : "var(--ds-text-primary)",
                }}
              >
                {r.value}
              </span>
            ),
          }))}
        />

      <PanelInfoGrid
          title="Effect on the schedule"
          rows={o.schedule.map((r) => ({
            label: r.label,
            value: r.bad ? <Strong tone="bad">{r.value}</Strong> : r.value,
          }))}
        />

      {o.risky && (
        <Section title="History">
          <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
            Done on DL-4102 in June → <DrillLink kind="claim" id="CLM-2291" />. The product argues
            against it before you decide.
          </p>
        </Section>
      )}

      {status === "open" && (
        <div style={{ paddingTop: 20 }}>
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              accept(id);
              close();
            }}
          >
            Accept this option
          </Button>
        </div>
      )}
    </>
  );
}

/* ─── Activity feed entry ───────────────────────────────────────────────── */

function FeedDetail({ index }: { index: number }) {
  const { feed } = useRun();
  const { plant } = useScope();
  const f = feed[index];
  if (!f) return null;

  return (
    <>
      <Section title="What happened">
        <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
          <LaneChip lane={f.lane} />
        </div>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
          {f.text.map((s, i) =>
            s.strong ? <Strong key={i}>{s.t}</Strong> : <span key={i}>{s.t}</span>,
          )}
        </p>
      </Section>

      <Section title="What this lane means">
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}>
          {LANE_MEANING[f.lane]}
        </p>
      </Section>

      <PanelInfoGrid
          title="Event"
          rows={[
            { label: "Agent", value: f.agent },
            { label: "Time", value: f.time },
            { label: "Lane", value: LANE_LABEL[f.lane] },
            { label: "Set by", value: `${thresholdLabel("reseq")} · ${plantLabel(plant)}` },
          ]}
        />
    </>
  );
}

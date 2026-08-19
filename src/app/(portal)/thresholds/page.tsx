"use client";

import { PageHeading, SegmentedControl } from "@navanta-ai/design-system";
import { useScope } from "@/context/ScopeContext";
import { useThresholds } from "@/context/ThresholdContext";
import { plantLabel } from "@/types/division";
import {
  MODE_LABEL,
  THRESHOLD_ROWS,
  type ThresholdKey,
  type ThresholdMode,
} from "@/types/threshold";
import SurfaceCard from "@/components/ui/SurfaceCard";

/**
 * The dial, per plant.
 *
 * Same engine everywhere; each plant decides how much of it runs without
 * asking. That single setting is the argument for the whole product, so the
 * page states plainly what each position means and which rows are actually
 * wired — flipping "Re-sequence" to Auto really does stop Make escalating.
 *
 * The two lists at the bottom are the honest half. An autonomy dial is only
 * trustworthy if it is bounded, and the bound is not a number — it is the list
 * of things the engine will never do no matter where the dial sits.
 */

const MODES: Array<{ value: ThresholdMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "limit", label: "Limit" },
  { value: "ask", label: "Ask" },
];

const MODE_MEANING: Record<ThresholdMode, string> = {
  auto: "The engine settles it and logs what it did.",
  limit: "It settles inside a bound and escalates past it.",
  ask: "It prepares the options and waits for a person.",
};

const NEVER = [
  "Run the line, or change what a machine is doing",
  "Write the demand plan or accept an order",
  "Grade the product — a person signs every borderline roll",
  "Overrule a quality hold, or release held goods",
  "Approve its own dye recipe or lot sizing",
];

const SITS_ON = [
  "Scheduling — the released sequence and the belt plan",
  "MES & batch management — runs, lots and genealogy",
  "Maintenance — machine signals and work orders",
  "Quality — inspection readings and claims",
];

export default function ThresholdsPage() {
  const { plant } = useScope();
  const { modeFor, setMode } = useThresholds();

  const wired = THRESHOLD_ROWS.filter((r) => r.wired);
  const asking = THRESHOLD_ROWS.filter((r) => modeFor(r.key) === "ask").length;
  const auto = THRESHOLD_ROWS.filter((r) => modeFor(r.key) === "auto").length;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading
        title="The dial you set — per plant"
        subtitle={`Thresholds · Iris · ${plantLabel(plant)}. Same engine everywhere; each plant sets its own limits. ${auto} of ${THRESHOLD_ROWS.length} decisions run on their own, ${asking} always reach a person.`}
      />

      {/* What each position means, stated once rather than implied by a word. */}
      <SurfaceCard title="What the three positions mean" caption="set per decision, per plant">
        <div
          className="grid"
          style={{ gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
        >
          {MODES.map((m) => (
            <div
              key={m.value}
              className="flex flex-col"
              style={{
                gap: 3,
                padding: "11px 13px",
                borderRadius: 10,
                border: "1px solid var(--border-light)",
                background: "var(--surface-raised)",
              }}
            >
              <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
                {m.label}
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {MODE_MEANING[m.value]}
              </span>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Decisions"
        caption={`${wired.length} wired · flipping one changes what the app does`}
      >
        <div className="flex flex-col">
          {THRESHOLD_ROWS.map((row, i) => (
            <DialRow
              key={row.key}
              rowKey={row.key}
              label={row.label}
              sub={row.sub}
              wired={row.wired}
              mode={modeFor(row.key)}
              onChange={(m) => setMode(row.key, m)}
              first={i === 0}
            />
          ))}
        </div>
      </SurfaceCard>

      <div
        className="grid"
        style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}
      >
        <SurfaceCard title="What the agents never do" caption="no dial setting unlocks these">
          <List items={NEVER} tone="danger" />
        </SurfaceCard>
        <SurfaceCard title="What it sits on top of" caption="systems of record, unchanged">
          <List items={SITS_ON} />
        </SurfaceCard>
      </div>
    </div>
  );
}

function DialRow({
  rowKey,
  label,
  sub,
  wired,
  mode,
  onChange,
  first,
}: {
  rowKey: ThresholdKey;
  label: string;
  sub: string;
  wired?: boolean;
  mode: ThresholdMode;
  onChange: (m: ThresholdMode) => void;
  first: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between flex-wrap"
      style={{
        gap: 12,
        padding: "12px 0",
        borderTop: first ? "none" : "1px solid var(--border-light)",
      }}
    >
      <span className="flex flex-col" style={{ gap: 2, minWidth: 0, flex: "1 1 260px" }}>
        <span className="inline-flex items-center flex-wrap" style={{ gap: 8 }}>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {label}
          </span>
          {/* Wired rows really move the product; the rest are shown so the dial
              reads as a surface rather than a two-row demo. */}
          {wired && (
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: 5,
                background: "var(--color-iris-50)",
                color: "var(--color-iris-700)",
              }}
            >
              Live
            </span>
          )}
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          {sub} · currently {MODE_LABEL[mode].toLowerCase()}
        </span>
      </span>

      <SegmentedControl
        size="sm"
        options={MODES.map((m) => ({ value: m.value, label: m.label }))}
        value={mode}
        onValueChange={(v) => onChange(v as ThresholdMode)}
        aria-label={`How ${rowKey} is handled`}
      />
    </div>
  );
}

function List({ items, tone }: { items: ReadonlyArray<string>; tone?: "danger" }) {
  return (
    <ul className="flex flex-col" style={{ gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((t) => (
        <li key={t} className="flex items-start" style={{ gap: 9 }}>
          <span
            aria-hidden="true"
            style={{
              marginTop: 6,
              width: 5,
              height: 5,
              borderRadius: "50%",
              flex: "0 0 auto",
              background: tone === "danger" ? "var(--text-danger)" : "var(--color-iris-500)",
            }}
          />
          <span className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}>
            {t}
          </span>
        </li>
      ))}
    </ul>
  );
}

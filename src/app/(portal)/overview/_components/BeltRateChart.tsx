"use client";

import { useState } from "react";
import { SegmentedControl } from "@navanta-ai/design-system";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SurfaceCard from "@/components/ui/SurfaceCard";
import { LINES } from "@/data/run-data";
import { MACHINE_PERF_ROWS } from "./machine-perf";

/**
 * Planned against achieved rate, one pair of bars per unit.
 *
 * **Grouped bars, and the grouping is what makes raw rates legal here.** The
 * belts run at different standards — 520, 400, 420 and 610 yd/hr — so a *line*
 * of raw rates would be incomparable series on one axis. Paired bars ask a
 * different question: each unit is compared against its own plan, inside its
 * own group, and the axis only has to carry magnitude. Comparison happens
 * within a pair, never across the chart.
 *
 * **Belt vs machine is a real toggle, not a relabel.** Yield is a *belt* metric
 * — the belt is the unit that's scheduled and promised — so Belt is the default
 * and top level. Machine drops in a level: a machine's achieved rate is its
 * share of the belt standard, because a belt only runs as well as its machines
 * are up. Each machine bar names its parent belt in the tooltip, so a rate is
 * never read out of the context it belongs to.
 *
 * Achieved is coloured by whether it made its plan, so the unit that missed is
 * identifiable before any label is read. The percentage sits on the bar rather
 * than in a tooltip: it is the number the reader came for, and hiding the
 * conclusion behind a hover is how a chart becomes decorative.
 */

interface RateDatum {
  /** The x-axis label — a belt name, or a machine code. */
  label: string;
  /** The parent belt, for the machine view's tooltip. Equals `label` for belts. */
  belt: string;
  planned: number;
  achieved: number;
  pct: number;
  short: boolean;
}

const BELT_DATA: RateDatum[] = LINES.map((l) => ({
  label: l.name,
  belt: l.name,
  planned: l.standard,
  achieved: l.achieved,
  pct: Math.round((l.achieved / l.standard) * 100),
  short: l.achieved < l.standard * 0.95,
}));

const MACHINE_DATA: RateDatum[] = MACHINE_PERF_ROWS.map((m) => ({
  label: m.code,
  belt: m.belt,
  planned: m.standard,
  achieved: m.achieved,
  pct: m.availability,
  short: m.availability < 95,
}));

const LEVELS = [
  { value: "belt", label: "Belt" },
  { value: "machine", label: "Machine" },
];

export default function BeltRateChart() {
  const [level, setLevel] = useState<string>("belt");
  const machine = level === "machine";
  const data = machine ? MACHINE_DATA : BELT_DATA;

  const toggle = (
    <SegmentedControl
      options={LEVELS}
      value={level}
      onValueChange={setLevel}
      size="sm"
      aria-label="Belt or machine yield"
    />
  );

  return (
    <SurfaceCard
      title={`${machine ? "Machine" : "Belt"} yield · planned vs actual`}
      caption={toggle}
    >
      <div style={{ width: "100%", height: 262 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -14 }} barGap={4}>
            <defs>
              {/* Planned is a neutral hatch, not a flat fill: the texture reads
                  as "the target, not the thing" and stays distinct from achieved
                  without relying on colour — legible in grayscale and to anyone
                  who can't separate the two hues. */}
              <pattern
                id="belt-planned"
                patternUnits="userSpaceOnUse"
                width={6}
                height={6}
                patternTransform="rotate(45)"
              >
                <rect width={6} height={6} fill="var(--surface-raised)" />
                <line x1={0} y1={0} x2={0} y2={6} stroke="var(--border-strong)" strokeWidth={2} />
              </pattern>
              {/* Achieved gets depth — a top-lit gradient reads as a solid,
                  confident bar rather than a flat block. */}
              <linearGradient id="belt-ok" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-iris-400)" />
                <stop offset="100%" stopColor="var(--color-iris-700)" />
              </linearGradient>
              <linearGradient id="belt-short" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E5533D" />
                <stop offset="100%" stopColor="#9E1C0E" />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--border-light)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--ds-text-primary)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--ds-text-secondary)" }}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "rgba(113,113,123,.06)" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--border-default)",
                background: "var(--surface-base)",
                fontSize: 11,
              }}
              labelStyle={{ color: "var(--ds-text-primary)", fontWeight: 600, marginBottom: 2 }}
              itemStyle={{ color: "var(--ds-text-primary)" }}
              formatter={(v, name) => [`${v} yd/hr`, String(name)] as [string, string]}
              // In the machine view the x-label is a code (BAK-01); the tooltip
              // title names the belt it runs on, so the machine is never read
              // out of the context it belongs to.
              labelFormatter={(label) => {
                const row = data.find((d) => d.label === label);
                return machine && row ? `${label} · on ${row.belt}` : String(label ?? "");
              }}
            />
            <Legend verticalAlign="top" align="right" content={<BeltLegend />} />

            <Bar
              dataKey="planned"
              name="Planned"
              fill="url(#belt-planned)"
              stroke="var(--border-strong)"
              strokeWidth={1}
              radius={[3, 3, 0, 0]}
              maxBarSize={38}
            />
            <Bar dataKey="achieved" name="Achieved" radius={[3, 3, 0, 0]} maxBarSize={38}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.short ? "url(#belt-short)" : "url(#belt-ok)"} />
              ))}
              <LabelList
                dataKey="pct"
                position="top"
                formatter={(v: unknown) => `${v}%`}
                style={{ fontSize: 10, fontWeight: 600, fill: "var(--ds-text-secondary)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SurfaceCard>
  );
}

/** Fixed two-item legend. Recharts' own legend can't render the bar's pattern
 *  and gradient fills — they live in the chart's SVG and the legend is a
 *  separate one — so the keys are drawn by hand to match exactly. */
function BeltLegend() {
  return (
    <div
      className="flex items-center justify-end"
      style={{ gap: 14, fontSize: 10, paddingBottom: 6, color: "var(--ds-text-secondary)" }}
    >
      <span className="inline-flex items-center" style={{ gap: 5 }}>
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background:
              "repeating-linear-gradient(45deg, var(--border-strong) 0 2px, var(--surface-raised) 2px 4px)",
            border: "1px solid var(--border-strong)",
          }}
        />
        Planned
      </span>
      <span className="inline-flex items-center" style={{ gap: 5 }}>
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: "linear-gradient(var(--color-iris-400), var(--color-iris-700))",
          }}
        />
        Achieved
      </span>
    </div>
  );
}

"use client";

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
import { LINES } from "@/data/run-data";
import { MACHINE_HEALTH, machineUptimePct } from "@/data/executive-data";

/**
 * Planned against achieved rate, one pair of bars per belt.
 *
 * **Grouped bars, and the grouping is what makes raw rates legal here.** The
 * belts run at different standards — 520, 420 and 610 yd/hr — so a *line* of
 * raw rates would be three incomparable series on one axis. Paired bars ask a
 * different question: each belt is compared against its own plan, inside its
 * own group, and the axis only has to carry magnitude. Comparison happens
 * within a pair, never across the chart.
 *
 * Achieved is coloured by whether it made its plan, so the belt that missed is
 * identifiable before any label is read. The percentage sits on the bar rather
 * than in a tooltip: it is the number the reader came for, and hiding the
 * conclusion behind a hover is how a chart becomes decorative.
 */
const DATA = LINES.map((l) => ({
  belt: l.name,
  planned: l.standard,
  achieved: l.achieved,
  pct: Math.round((l.achieved / l.standard) * 100),
  short: l.achieved < l.standard * 0.95,
}));

/**
 * One belt's machines, as the same planned-vs-achieved pair.
 *
 * Selecting a belt asks "what is happening *inside* it", so the chart drops a
 * level rather than showing the same single bar on its own. A machine's
 * achieved rate is its share of the belt standard — the belt only runs as well
 * as its machines are up, which is exactly what the machine-health card says
 * beside it, so the two surfaces agree by construction.
 */
function machineRows(beltName: string) {
  const line = LINES.find((l) => l.name === beltName);
  const process = beltName.split(" ")[0];
  const group = MACHINE_HEALTH.find((g) => g.process === process);
  if (!line || !group) return null;

  return group.machines.map((m) => {
    const achieved = Math.round((line.standard * machineUptimePct(m)) / 100);
    return {
      belt: m.code,
      planned: line.standard,
      achieved,
      pct: Math.round((achieved / line.standard) * 100),
      short: achieved < line.standard * 0.95,
    };
  });
}

export default function BeltRateChart({ belt = "all" }: { belt?: string }) {
  const data =
    belt === "all" ? DATA : machineRows(belt) ?? DATA.filter((d) => d.belt === belt);
  return (
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
            dataKey="belt"
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
          />
          <Legend
            verticalAlign="top"
            align="right"
            content={<BeltLegend />}
          />

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
            {DATA.map((d) => (
              <Cell key={d.belt} fill={d.short ? "url(#belt-short)" : "url(#belt-ok)"} />
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

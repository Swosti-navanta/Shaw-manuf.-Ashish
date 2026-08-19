"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DOWNTIME_REASON_COLOR,
  downtimeByReason,
  MACHINE_HEALTH,
  type HealthGroup,
} from "@/data/executive-data";

/**
 * Where the plant's lost minutes went, by cause.
 *
 * Horizontal bars, because the categories are named rather than ordered — the
 * labels are words, and words read along the axis they sit on. Sorted longest
 * first, so the cause worth fixing is the top bar rather than something you
 * have to find.
 *
 * Companion to the uptime charts above it: those say *when* a machine stopped,
 * this says *what keeps stopping them*.
 */
export default function DowntimeReasonChart({
  groups = MACHINE_HEALTH,
}: {
  groups?: ReadonlyArray<HealthGroup>;
}) {
  const DATA = downtimeByReason(groups);
  const total = DATA.reduce((n, d) => n + d.minutes, 0);

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <BarChart
          data={DATA}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 0, left: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid stroke="var(--border-light)" horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}m`}
            tick={{ fontSize: 10, fill: "var(--ds-text-secondary)" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            width={112}
            tick={{ fontSize: 11, fill: "var(--ds-text-primary)" }}
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
            formatter={(v) =>
              [
                `${v} min · ${Math.round((Number(v) / total) * 100)}% of downtime`,
                "Lost",
              ] as [string, string]
            }
          />
          <Bar dataKey="minutes" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {DATA.map((d) => (
              <Cell key={d.reason} fill={DOWNTIME_REASON_COLOR[d.reason]} fillOpacity={0.85} />
            ))}
            <LabelList
              dataKey="minutes"
              position="right"
              formatter={(v: unknown) => `${v}m`}
              style={{ fontSize: 10, fontWeight: 600, fill: "var(--ds-text-secondary)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

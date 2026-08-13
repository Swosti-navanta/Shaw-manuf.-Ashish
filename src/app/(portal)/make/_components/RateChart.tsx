"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { RATE_SERIES, RUN, CONSTRAINT_LINE } from "@/data/run-data";

/**
 * Achieved rate against a flat standard. The shaded band between the two is
 * the shortfall — the point is that the gap opens steadily, which is why a
 * fixed alert band caught it and a person walking the floor didn't.
 *
 * Deliberately spare: one horizontal rule per tick, no vertical grid, no
 * frame. The two lines and the widening band between them are the content;
 * anything else competes with them.
 */
export default function RateChart() {
  // A range Area (`[low, high]` per point) shades the gap between the two
  // series. Stacking two areas would work visually but forces Recharts to
  // compute its own axis domain from the stacked totals, which overrides the
  // explicit `domain` below and flattens the whole chart.
  const data = RATE_SERIES.map((d) => ({
    time: d.time,
    actual: d.actual,
    shortfall: [d.actual, d.plan] as [number, number],
  }));

  const last = RATE_SERIES[RATE_SERIES.length - 1];

  return (
    <div style={{ width: "100%", height: 210 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 64, bottom: 4, left: -12 }}>
          <defs>
            <linearGradient id="shaw-shortfall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--run-actual-line)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--run-actual-line)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border-light)" vertical={false} />
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          />
          <YAxis
            domain={[340, 440]}
            ticks={[360, 400, 440]}
            axisLine={false}
            tickLine={false}
            width={44}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          />

          <Area
            dataKey="shortfall"
            stroke="none"
            fill="url(#shaw-shortfall)"
            isAnimationActive={false}
          />

          {/* The standard: dashed and quiet. It's the thing being missed, not
              the thing being reported. */}
          <ReferenceLine
            y={CONSTRAINT_LINE.standard}
            stroke="var(--color-iris-300)"
            strokeDasharray="5 5"
            strokeWidth={1.5}
          >
            <Label
              value={`plan ${CONSTRAINT_LINE.standard}`}
              position="right"
              fontSize={11}
              fill="var(--ds-text-secondary)"
            />
          </ReferenceLine>

          <Line
            dataKey="actual"
            stroke="var(--run-actual-line)"
            strokeWidth={2.25}
            strokeLinecap="round"
            dot={false}
            isAnimationActive={false}
          />

          {/* The latest reading, called out — it's the number the decision is
              actually about. */}
          <ReferenceLine
            y={last.actual}
            stroke="none"
            ifOverflow="extendDomain"
          >
            <Label
              value={`${last.actual} now`}
              position="right"
              fontSize={11}
              fontWeight={600}
              fill="var(--run-actual-line)"
            />
          </ReferenceLine>

          <ReferenceLine
            x={RATE_SERIES[4].time}
            stroke="var(--border-strong)"
            strokeDasharray="3 3"
          >
            <Label
              value={`deviation ${RUN.deviationAt}`}
              position="top"
              offset={10}
              fontSize={11}
              fill="var(--ds-text-secondary)"
            />
          </ReferenceLine>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

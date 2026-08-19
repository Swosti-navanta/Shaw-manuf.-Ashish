"use client";

import { useState } from "react";
import { SegmentedControl, Select } from "@navanta-ai/design-system";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SurfaceCard from "@/components/ui/SurfaceCard";
import DowntimeReasonChart from "./DowntimeReasonChart";
import {
  DOWNTIME_REASON_COLOR,
  DOWNTIME_REASON_LABEL,
  HEALTH_SHIFT,
  MACHINE_HEALTH,
  MACHINE_RATE,
  downtimeHours,
  groupUptimePct,
  healthClock,
  machineOutput,
  machineUptimePct,
  outputSeries,
  type HealthMachine,
} from "@/data/executive-data";

/**
 * Machine health as output over the shift.
 *
 * The line sits at rate while the machine runs and drops to zero while it is
 * stopped, so the area under it *is* the yardage produced — uptime and downtime
 * read as the thing they actually cost rather than as an abstract percentage.
 * Each stop is shaded in the colour of its cause, so "why" is on the same
 * picture as "when".
 */

/** Open on the constraint process — the belt carrying the plant's story. */
const DEFAULT_PROCESS =
  MACHINE_HEALTH.find((g) => g.machines.some((m) => m.constraint))?.process ??
  MACHINE_HEALTH[0].process;

const TICKS = [0, 3, 6, 9, 12];

const VIEWS = [
  { value: "uptime", label: "Uptime" },
  { value: "reason", label: "By reason" },
];

export default function MachineHealthCard() {
  // One process — one belt — at a time.
  const [process, setProcess] = useState<string>(DEFAULT_PROCESS);
  // *When* each machine stopped, or *what* keeps stopping them.
  const [view, setView] = useState<string>("uptime");
  const group = MACHINE_HEALTH.find((g) => g.process === process) ?? MACHINE_HEALTH[0];

  const controls = (
    <span className="inline-flex items-center" style={{ gap: 8 }}>
      <SegmentedControl options={VIEWS} value={view} onValueChange={setView} size="sm" />
      <span className="inline-flex" style={{ minWidth: 132 }}>
        <Select value={process} onValueChange={setProcess} size="sm">
          <Select.Trigger aria-label="Process">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {MACHINE_HEALTH.map((g) => (
              <Select.Item key={g.process} value={g.process}>
                {g.process}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </span>
    </span>
  );

  return (
    <SurfaceCard title="Machine health" caption={controls}>
      <div className="flex flex-col" style={{ gap: 10 }}>
        <div
          className="flex items-center justify-between"
          style={{ paddingBottom: 4, borderBottom: "1px solid var(--border-light)" }}
        >
          <span className="inline-flex items-baseline" style={{ gap: 6 }}>
            <span
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", color: "var(--ds-text-primary)" }}
            >
              {group.process}
            </span>
            {group.machines.some((m) => m.constraint) && (
              <span style={{ fontSize: 9.5, color: "var(--lane-limit-ink)" }}>· constraint</span>
            )}
          </span>
          <span style={{ fontSize: 10, color: "var(--ds-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
            {groupUptimePct(group)}% up · {group.machines.length} machines
          </span>
        </div>

        {/* Legend above the charts — the causes a stop is coloured by, read
            before the picture rather than after it. */}
        <div className="flex items-center flex-wrap" style={{ gap: 14 }}>
          {(Object.keys(DOWNTIME_REASON_LABEL) as Array<keyof typeof DOWNTIME_REASON_LABEL>).map(
            (r) => (
              <span key={r} className="inline-flex items-center" style={{ gap: 6 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 14,
                    height: 10,
                    borderRadius: 3,
                    background: DOWNTIME_REASON_COLOR[r],
                    opacity: view === "reason" ? 0.85 : 0.32,
                  }}
                />
                <span style={{ fontSize: 10, color: "var(--ds-text-secondary)" }}>
                  {DOWNTIME_REASON_LABEL[r]}
                </span>
              </span>
            ),
          )}
        </div>

        {view === "uptime" ? (
          group.machines.map((m) => <MachineOutput key={m.code} machine={m} />)
        ) : (
          <DowntimeReasonChart groups={[group]} />
        )}
      </div>
    </SurfaceCard>
  );
}

/** One machine's output line, with its stops shaded by cause. */
function MachineOutput({ machine }: { machine: HealthMachine }) {
  const data = outputSeries(machine);
  const up = machineUptimePct(machine);
  const low = up < 85;
  const ink = machine.constraint ? "var(--lane-limit-ink)" : "var(--color-iris-500)";
  const id = `mo-${machine.code.replace(/\W/g, "")}`;

  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
        <span className="inline-flex items-baseline" style={{ gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: machine.constraint ? "var(--lane-limit-ink)" : "var(--ds-text-primary)",
            }}
          >
            {machine.code}
          </span>
          <span
            style={{
              fontSize: 10,
              fontVariantNumeric: "tabular-nums",
              color: low ? "var(--text-danger)" : "var(--ds-text-secondary)",
            }}
          >
            {up}% up
          </span>
        </span>
        <span style={{ fontSize: 10, color: "var(--ds-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
          {machineOutput(machine).toLocaleString()} yd · {Math.round(downtimeHours(machine) * 60)}m lost
        </span>
      </div>

      <div style={{ width: "100%", height: 68 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ink} stopOpacity={0.28} />
                <stop offset="100%" stopColor={ink} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-light)" vertical={false} />

            {/* Each stop, shaded in the colour of its cause. */}
            {machine.downtime.map((d, i) => (
              <ReferenceArea
                key={i}
                x1={d.at}
                x2={d.at + d.hours}
                fill={DOWNTIME_REASON_COLOR[d.reason]}
                fillOpacity={0.16}
              />
            ))}

            <XAxis
              dataKey="t"
              type="number"
              domain={[0, HEALTH_SHIFT.hours]}
              ticks={TICKS}
              tickFormatter={(t) => healthClock(t)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--ds-text-secondary)" }}
            />
            <YAxis
              domain={[0, MACHINE_RATE * 1.15]}
              ticks={[0, MACHINE_RATE]}
              tickFormatter={(v) => (v === 0 ? "0" : "run")}
              axisLine={false}
              tickLine={false}
              width={44}
              tick={{ fontSize: 9, fill: "var(--ds-text-secondary)" }}
            />
            <Tooltip
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return (
                  <div style={{ background: "#18181B", borderRadius: 8, padding: "6px 9px" }}>
                    <div style={{ color: "#A1A1AA", fontSize: 11, marginBottom: 2 }}>{p.clock}</div>
                    <div style={{ color: "#FFFFFF", fontSize: 12 }}>
                      {p.reason
                        ? `Stopped · ${DOWNTIME_REASON_LABEL[p.reason]}`
                        : `Running · ${MACHINE_RATE} yd/hr`}
                    </div>
                  </div>
                );
              }}
            />

            {/* `stepAfter` because a machine's state changes at an instant — it
                does not ramp between running and stopped. */}
            <Area
              type="stepAfter"
              dataKey="rate"
              stroke={ink}
              strokeWidth={1.6}
              fill={`url(#${id})`}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

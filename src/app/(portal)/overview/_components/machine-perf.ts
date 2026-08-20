import { LINES } from "@/data/run-data";
import { MACHINE_HEALTH, downtimeHours, machineUptimePct } from "@/data/executive-data";

/**
 * The belt a process runs on — the promised, OEE-reported unit that a set of
 * machines sits under. `MACHINE_HEALTH` groups equipment by process ("Backing")
 * while `LINES` names the belt ("Backing 2"), so this is the join between the
 * two taxonomies the plant actually uses.
 */
export const beltForProcess = (process: string) =>
  LINES.find((l) => l.name.startsWith(process));

/**
 * One equipment asset, resolved against its parent belt.
 *
 * The split the plant's systems make: **belt metrics** — rate, yield, OEE — are
 * the belt's, because the belt is what's scheduled and promised; **machine
 * metrics** — availability and downtime — are the asset's, because a machine is
 * the thing that has a serial, a maintenance history and Ignition tags. Every
 * row names its belt so a machine is never read out of the context it runs in.
 */
export interface MachinePerfRow {
  /** The equipment, named the way the floor names it — BAK-01, TUF-02. */
  code: string;
  /** The belt this machine sits on — Backing 2, Tufting 3. */
  belt: string;
  process: string;
  /** True for the belt's constraint unit — its downtime costs the whole belt. */
  constraint: boolean;
  /** Uptime this shift, as a percentage — a machine metric. */
  availability: number;
  /** Hours the machine was stopped this shift — a machine metric. */
  downtime: number;
  /** The belt's standard rate, yd/hr — a belt metric, carried for context. */
  standard: number;
  /** What the machine ran at while up: the belt standard scaled by availability. */
  achieved: number;
  /** Linear yards the stops cost this shift — downtime hours at belt rate. */
  lost: number;
}

/**
 * Every machine on the floor as a performance row, worst availability first.
 *
 * Derived from the same `MACHINE_HEALTH` downtime the health card draws, so the
 * two surfaces can never disagree: a machine's availability here is one minus
 * the downtime plotted there.
 */
export const MACHINE_PERF_ROWS: MachinePerfRow[] = MACHINE_HEALTH.flatMap((g) => {
  const belt = beltForProcess(g.process);
  const standard = belt?.standard ?? 0;
  const beltName = belt?.name ?? g.process;
  return g.machines.map((m) => {
    const availability = machineUptimePct(m);
    const downtime = downtimeHours(m);
    return {
      code: m.code,
      belt: beltName,
      process: g.process,
      constraint: !!m.constraint,
      availability,
      downtime,
      standard,
      achieved: Math.round((standard * availability) / 100),
      lost: Math.round(downtime * standard),
    };
  });
});

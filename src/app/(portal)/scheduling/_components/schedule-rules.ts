// The rules a board has to obey to describe a real plant.
//
// Both of these were broken in the fixture and neither was visible on the
// board: a lot duplicated across two machines just looked like a busy centre,
// and four stages all starting at 06:00 looked like a full shift. They only
// surfaced once the detail panel put one lot's whole route in a single list.
//
// So they are checked rather than remembered. This runs in development only —
// it is a guard against authoring mistakes in fixture data, not a runtime
// feature, and it costs nothing in a production build.

import type { WeaveNode } from "./weave";

export interface ScheduleViolation {
  rule: "one-machine-per-stage" | "precedence";
  message: string;
}

/**
 * A lot is one physical piece of material.
 *
 * It can be split across orders and it can wait, but it cannot be on two
 * machines of the same work centre at once — being tufted on TUF-01 and TUF-02
 * simultaneously is not a schedule, it is two schedules.
 */
function oneMachinePerStage(nodes: ReadonlyArray<WeaveNode>): ScheduleViolation[] {
  const seen = new Map<string, WeaveNode>();
  const out: ScheduleViolation[] = [];

  for (const n of nodes) {
    const lot = n.dyeLot ?? n.yarn;
    if (!lot) continue;
    const key = `${n.centreIdx}::${lot}`;
    const first = seen.get(key);
    if (first && first.laneCode !== n.laneCode) {
      out.push({
        rule: "one-machine-per-stage",
        message: `${lot} is on ${first.laneCode} and ${n.laneCode} at ${n.centreName} — a lot cannot be on two machines of one work centre.`,
      });
    } else if (!first) {
      seen.set(key, n);
    }
  }
  return out;
}

/**
 * Material flows one way through the plant.
 *
 * Colour does not exist until the dye run, backing needs something to coat and
 * finishing needs something to shear — so each stage has to start after the one
 * before it clears. A downstream card that starts early is claiming to work on
 * material that does not exist yet.
 */
function precedence(nodes: ReadonlyArray<WeaveNode>): ScheduleViolation[] {
  const byLot = new Map<string, WeaveNode[]>();
  for (const n of nodes) {
    /* Keyed on the dye lot, which is what survives across stages — the yarn id
       only exists up to tufting. Tufting joins on through YARN_FOR_DYE, which
       the weave already resolves. */
    const lot = n.dyeLot;
    if (!lot) continue;
    const group = byLot.get(lot) ?? [];
    group.push(n);
    byLot.set(lot, group);
  }

  const out: ScheduleViolation[] = [];
  for (const [lot, group] of byLot) {
    const route = [...group].sort((a, b) => a.centreIdx - b.centreIdx);
    for (let i = 1; i < route.length; i++) {
      const up = route[i - 1];
      const down = route[i];
      if (up.centreIdx === down.centreIdx) continue;

      /* A card sitting at hour zero is already running when the board opens,
         so its upstream stage happened before the window and there is nothing
         on screen to compare it against. Backing a lot at 06:00 that was dyed
         yesterday is normal; the rule only has an opinion once a stage starts
         inside the window it can see. */
      if (down.start === 0) continue;

      if (down.start < up.start + up.hours) {
        out.push({
          rule: "precedence",
          message: `${lot} starts at ${down.centreName} before it clears ${up.centreName} — ${down.centreName} would be working on material that does not exist yet.`,
        });
      }
    }
  }
  return out;
}

/** Every violation on the board as laid out. Empty means the board is sane. */
export function scheduleViolations(nodes: ReadonlyArray<WeaveNode>): ScheduleViolation[] {
  return [...oneMachinePerStage(nodes), ...precedence(nodes)];
}

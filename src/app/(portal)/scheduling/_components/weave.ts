// The weave — how runs on different work centres are the same material.
//
// Shaw's flow for a tufted style is a genealogy: a yarn draw (Y-…) is tufted
// as greige, the greige is dyed and becomes a dye lot (DL-…), and that dye lot
// is what the backing line coats and the finishing line rolls. So two cards on
// different centres are "connected" when they are the same material at
// successive stages — and that connection is also a precedence: the downstream
// card physically cannot start before the upstream one clears.
//
// Three link kinds, in decreasing strength:
//   lot       — same dye lot, same order, at consecutive stages. The hard chain.
//   lot-split — same dye lot serving different orders. Shade holds only
//               because the lot was dyed in one run — the exact signature
//               behind the open claims.
//   yarn      — a dye lot linked back to the greige draw it was built from
//               (via YARN_FOR_DYE), tufting → dyeing.

import { WORK_CENTRES, YARN_FOR_DYE } from "@/data/schedule-data";

export type WeaveKind = "lot" | "lot-split" | "yarn";

export interface WeaveNode {
  runId: string;
  laneIdx: number;
  laneCode: string;
  centreIdx: number;
  centreName: string;
  /** Hours from board start / duration — the overlay turns these into x. */
  start: number;
  hours: number;
  label: string;
  family: string;
  dyeLot?: string;
  yarn?: string;
  order?: string;
  fixed?: boolean;
}

export interface WeaveLink {
  id: string;
  kind: WeaveKind;
  from: WeaveNode;
  to: WeaveNode;
  title: string;
  why: string;
}

export interface Weave {
  links: ReadonlyArray<WeaveLink>;
  /** Every link a run participates in, keyed by run id — the hover set. */
  byRun: ReadonlyMap<string, ReadonlyArray<WeaveLink>>;
}

const DYEING_IDX = WORK_CENTRES.findIndex((w) => w.id === "dyeing");
const TUFTING_IDX = WORK_CENTRES.findIndex((w) => w.id === "tufting");

function lotWhy(kind: "lot" | "lot-split", a: WeaveNode, b: WeaveNode): string {
  if (kind === "lot") {
    return (
      `Same dye lot ${a.dyeLot} · ${a.order ?? "—"}. ${a.centreName} must clear on ${a.laneCode} ` +
      `before ${b.centreName} can start on ${b.laneCode} — move one and the other moves.` +
      (a.fixed || b.fixed ? " The order carries a fixed install date, so this chain is what the date hangs on." : "")
    );
  }
  return (
    `Dye lot ${a.dyeLot} serves two orders (${a.order ?? "—"} → ${b.order ?? "—"}). ` +
    `The shade matches only because both were dyed in one run — split the lot and you get the claim signature.`
  );
}

function yarnWhy(a: WeaveNode, b: WeaveNode): string {
  return (
    `${b.dyeLot} was dyed from draw ${a.yarn}. The greige tufted on ${a.laneCode} is the material ` +
    `in the ${b.label} dye run on ${b.laneCode} — colour doesn't exist until that dye run.`
  );
}

/** Build the weave from every placed run on the visible board. */
export function buildWeave(nodes: ReadonlyArray<WeaveNode>): Weave {
  const links: WeaveLink[] = [];

  // ── Dye-lot chains: consecutive stage levels of the same lot. ────────────
  const byLot = new Map<string, WeaveNode[]>();
  nodes.forEach((n) => {
    if (n.dyeLot) (byLot.get(n.dyeLot) ?? byLot.set(n.dyeLot, []).get(n.dyeLot)!).push(n);
  });

  byLot.forEach((group) => {
    const levels = [...new Set(group.map((n) => n.centreIdx))].sort((x, y) => x - y);
    for (let li = 0; li < levels.length - 1; li++) {
      const ups = group.filter((n) => n.centreIdx === levels[li]);
      const downs = group.filter((n) => n.centreIdx === levels[li + 1]);
      downs.forEach((b) => {
        // Prefer the exact-order upstream; only without one does the link
        // widen to the whole lot (and get labelled as the split it is).
        const exact = ups.filter((a) => a.order && b.order && a.order === b.order);
        const sources = exact.length ? exact : ups;
        sources.forEach((a) => {
          const kind: WeaveKind = exact.length ? "lot" : "lot-split";
          links.push({
            id: `${a.runId}->${b.runId}`,
            kind,
            from: a,
            to: b,
            title: `${a.laneCode} → ${b.laneCode} · ${a.dyeLot}`,
            why: lotWhy(kind, a, b),
          });
        });
      });
    }
  });

  // ── Yarn → dye: the draw each dye lot was built from. ────────────────────
  const tuftNodes = nodes.filter((n) => n.centreIdx === TUFTING_IDX && n.yarn);
  nodes
    .filter((n) => n.centreIdx === DYEING_IDX && n.dyeLot && YARN_FOR_DYE[n.dyeLot])
    .forEach((b) => {
      const draw = YARN_FOR_DYE[b.dyeLot!];
      const sameYarn = tuftNodes.filter((a) => a.yarn === draw);
      // The same draw can feed two styles; the style match names the true feeder.
      const precise = sameYarn.filter((a) => a.family === b.family);
      (precise.length ? precise : sameYarn).forEach((a) => {
        links.push({
          id: `${a.runId}->${b.runId}`,
          kind: "yarn",
          from: a,
          to: b,
          title: `${a.laneCode} → ${b.laneCode} · ${draw}`,
          why: yarnWhy(a, b),
        });
      });
    });

  const byRun = new Map<string, WeaveLink[]>();
  links.forEach((l) => {
    (byRun.get(l.from.runId) ?? byRun.set(l.from.runId, []).get(l.from.runId)!).push(l);
    (byRun.get(l.to.runId) ?? byRun.set(l.to.runId, []).get(l.to.runId)!).push(l);
  });

  return { links, byRun };
}

export const WEAVE_KIND_META: Record<
  WeaveKind,
  { label: string; stroke: string; dash?: string }
> = {
  lot: { label: "Same dye lot", stroke: "var(--color-iris-500, #7C6BF0)" },
  "lot-split": { label: "Lot across orders", stroke: "var(--text-warning, #F79009)" },
  yarn: { label: "Built from draw", stroke: "var(--border-strong, #9F9FA9)", dash: "5 4" },
};

/**
 * The whole journey one piece of material makes, as an ordered list of stages.
 *
 * The links already say which two cards are the same material at consecutive
 * stages; this walks that relation in both directions from the card you
 * clicked and flattens it into tufting → dyeing → backing → finishing. It is
 * the same genealogy the overlay used to draw across the board — read in a
 * detail view, where you can name each stage and its clock, rather than as
 * lines over cards that have to be hovered to be seen.
 */
export function chainFor(runId: string, weave: Weave): ReadonlyArray<WeaveNode> {
  const seen = new Map<string, WeaveNode>();
  const queue = [runId];

  while (queue.length) {
    const id = queue.shift()!;
    for (const link of weave.byRun.get(id) ?? []) {
      for (const node of [link.from, link.to]) {
        if (!seen.has(node.runId)) {
          seen.set(node.runId, node);
          queue.push(node.runId);
        }
      }
    }
  }

  /* One card per work centre — a lot serving two orders puts two cards on the
     same centre, and the journey is the stages, not every card on them. */
  const byCentre = new Map<number, WeaveNode>();
  for (const n of seen.values()) {
    const held = byCentre.get(n.centreIdx);
    if (!held || n.start < held.start) byCentre.set(n.centreIdx, n);
  }

  return [...byCentre.values()].sort((a, b) => a.centreIdx - b.centreIdx);
}

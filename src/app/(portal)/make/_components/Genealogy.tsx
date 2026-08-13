"use client";

import { CaretRight } from "@phosphor-icons/react";
import { useDetailDrawer } from "@/context/DetailDrawerContext";
import { BATCH, DYE_LOT, ROLL, RUN } from "@/data/run-data";
import type { DetailKind } from "@/types/run";

const CHAIN: ReadonlyArray<{ label: string; value: string; kind: DetailKind }> = [
  { label: "Yarn lot", value: RUN.yarnLot, kind: "yarn" },
  { label: "Dye lot", value: DYE_LOT.id, kind: "dyelot" },
  { label: "Batch", value: BATCH.id, kind: "batch" },
  { label: "Roll", value: ROLL.id, kind: "roll" },
];

/**
 * Yarn → dye lot → batch → roll. Written as the run happens rather than
 * reconstructed afterwards, which is what makes a claim settleable instead of
 * arguable — so every node opens its own record.
 */
export default function Genealogy() {
  const { open } = useDetailDrawer();

  return (
    <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
      {CHAIN.map((node, i) => (
        <span key={node.value} className="inline-flex items-center" style={{ gap: 6 }}>
          <button
            type="button"
            onClick={() => open(node.kind, node.value)}
            className="flex flex-col text-left transition-colors hover:border-[var(--color-iris-400)] hover:bg-[var(--color-iris-50)]"
            style={{
              gap: 1,
              padding: "8px 11px",
              borderRadius: 9,
              border: "1px solid var(--border-default)",
              background: "var(--surface-base)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ds-text-placeholder, var(--text-muted))",
              }}
            >
              {node.label}
            </span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--ds-text-primary)",
              }}
            >
              {node.value}
            </span>
          </button>
          {i < CHAIN.length - 1 && (
            <CaretRight size={12} weight="bold" color="var(--border-strong)" aria-hidden="true" />
          )}
        </span>
      ))}
    </div>
  );
}

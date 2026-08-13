"use client";

import { useDetailDrawer } from "@/context/DetailDrawerContext";
import { useRun } from "@/context/RunContext";
import LaneChip from "@/components/ui/LaneChip";

/**
 * What the agents did, in order. This is the argument for the decision — the
 * lane on each row is the whole point: you can see exactly where the engine
 * stopped acting and started asking.
 */
export default function ActivityFeed() {
  const { feed, freshIndices } = useRun();
  const { open } = useDetailDrawer();

  return (
    <div className="flex flex-col">
      {feed.map((f, i) => (
        <button
          key={`${f.time}-${f.agent}-${i}`}
          type="button"
          onClick={() => open("feed", String(i))}
          className="grid text-left transition-colors hover:bg-[var(--surface-hover)]"
          style={{
            gridTemplateColumns: "56px 104px 1fr",
            gap: 12,
            alignItems: "start",
            padding: "11px 18px",
            borderTop: i === 0 ? "none" : "1px solid var(--border-light)",
            animation: freshIndices.has(i) ? "shaw-slidein 350ms ease" : undefined,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--ds-text-placeholder, var(--text-muted))",
              paddingTop: 2,
            }}
          >
            {f.time}
          </span>
          <span>
            <LaneChip lane={f.lane} />
          </span>
          <span className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}>
            <span
              style={{
                fontSize: 11,
                color: "var(--ds-text-placeholder, var(--text-muted))",
                marginRight: 6,
              }}
            >
              {f.agent}
            </span>
            {f.text.map((s, j) =>
              s.strong ? (
                <strong key={j} style={{ fontWeight: 600, color: "var(--ds-text-primary)" }}>
                  {s.t}
                </strong>
              ) : (
                <span key={j}>{s.t}</span>
              ),
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

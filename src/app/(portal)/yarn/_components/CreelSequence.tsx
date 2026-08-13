"use client";

import type { CreelStop } from "@/types/yarn";

/**
 * The creel run order, as a continuous shade ramp.
 *
 * Earlier this was a row of chips with a small swatch beside each name, which
 * buried the one thing worth seeing: the ramp itself. Light → dark is the
 * entire strategy, so each stop is *filled* with its shade and the sequence
 * reads as a gradient — which makes the single step that reverses it visible
 * without reading a word.
 *
 * Purge costs sit on the boundaries beneath, not inside the stops, because a
 * purge is the price of a transition rather than a property of a lot.
 */
export default function CreelSequence({ stops }: { stops: ReadonlyArray<CreelStop> }) {
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      <div
        className="flex w-full"
        style={{ borderRadius: 10, overflow: "hidden", minHeight: 66 }}
      >
        {stops.map((stop) => {
          const ink = readableInk(stop.colour);
          return (
            <div
              key={stop.name}
              className="flex flex-col justify-center"
              style={{
                flex: 1,
                minWidth: 92,
                gap: 2,
                padding: "12px 14px",
                background: stop.colour,
                boxShadow: "inset 0 0 0 1px rgba(24, 24, 27, 0.10)",
              }}
            >
              <span className="type-body-medium" style={{ color: ink }}>
                {stop.name}
              </span>
              {stop.dyeLot && (
                <span className="type-caption" style={{ color: ink, opacity: 0.72 }}>
                  {stop.dyeLot}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Boundaries. Stops are equal-flex, so boundary i sits exactly at
          i / n across the ramp above it. */}
      <div className="relative w-full" style={{ height: 34 }}>
        {stops.map((stop, i) =>
          i === 0 || !stop.purge ? null : (
            <span
              key={stop.name}
              className="absolute flex flex-col items-center"
              style={{ left: `${(i / stops.length) * 100}%`, transform: "translateX(-50%)", gap: 2 }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: stop.purge.kind === "full" ? 2 : 1,
                  height: 9,
                  background:
                    stop.purge.kind === "full" ? "var(--text-danger)" : "var(--border-default)",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: stop.purge.kind === "full" ? 600 : 400,
                  color:
                    stop.purge.kind === "full"
                      ? "var(--text-danger)"
                      : "var(--ds-text-secondary)",
                }}
              >
                {stop.purge.kind === "full" ? "full purge " : "purge "}$
                {stop.purge.cost.toLocaleString()}
              </span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Text colour that survives being written on a dye shade.
 *
 * These are real carpet colours spanning near-white to near-black, so a fixed
 * ink would be unreadable at one end. Rec. 601 luma is enough here — the
 * decision is only ever "dark text or light text".
 */
function readableInk(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#18181B" : "#FFFFFF";
}

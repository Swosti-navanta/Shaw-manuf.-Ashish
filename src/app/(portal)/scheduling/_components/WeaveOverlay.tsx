"use client";

import { X } from "@phosphor-icons/react";
import { BOARD_HOURS } from "@/data/schedule-data";
import { WEAVE_KIND_META, type WeaveLink, type WeaveNode } from "./weave";

/**
 * The weave, drawn — Figma-style connection lines between cards that are the
 * same material at successive stages. Hovering a card lights its chain; the
 * lines are clickable, and a click pins a small card stating what the
 * connection is and why it binds.
 *
 * Geometry is computed from the same numbers the bars use (hours × laneTop),
 * not from DOM rects — so the lines land exactly on the cards at any scroll
 * position, and there is nothing to re-measure.
 */

export interface WeavePin {
  link: WeaveLink;
  /** The hover source at pin time, so the weave stays rooted while pinned. */
  src: string;
  x: number;
  y: number;
}

export default function WeaveOverlay({
  links,
  laneTop,
  axisH,
  trackH,
  trackInset,
  trackWidth,
  pin,
  onPin,
  onUnpin,
}: {
  links: ReadonlyArray<WeaveLink>;
  laneTop: ReadonlyArray<number>;
  /** Height of the timeline header — laneTop is measured below it. */
  axisH: number;
  trackH: number;
  trackInset: number;
  trackWidth: number;
  pin: WeavePin | null;
  onPin: (pin: WeavePin) => void;
  onUnpin: () => void;
}) {
  const inner = trackWidth - trackInset;
  const x = (hours: number) => trackInset + (hours / BOARD_HOURS) * inner;
  const yMid = (n: WeaveNode) => axisH + (laneTop[n.laneIdx] ?? 0) + trackH / 2;

  if (!links.length) return null;

  return (
    <>
      <svg
        aria-hidden="true"
        className="absolute inset-0"
        style={{ width: "100%", height: "100%", pointerEvents: "none", zIndex: 5, overflow: "visible" }}
      >
        {links.map((l) => {
          const x1 = x(l.from.start + l.from.hours);
          const y1 = yMid(l.from);
          const x2 = x(l.to.start);
          const y2 = yMid(l.to);
          const dx = Math.min(Math.max(Math.abs(x2 - x1) * 0.5, 28), 90);
          const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
          // Cubic midpoint (t = .5): average of the four control points,
          // weighted 1:3:3:1 — where the info card anchors.
          const mx = (x1 + 3 * (x1 + dx) + 3 * (x2 - dx) + x2) / 8;
          const my = (y1 + 3 * y1 + 3 * y2 + y2) / 8;
          const meta = WEAVE_KIND_META[l.kind];
          const pinned = pin?.link.id === l.id;
          return (
            <g key={l.id}>
              <path
                d={d}
                fill="none"
                stroke={meta.stroke}
                strokeWidth={pinned ? 2.6 : 1.8}
                strokeDasharray={meta.dash}
                strokeLinecap="round"
                opacity={pin && !pinned ? 0.45 : 0.95}
              />
              <circle cx={x1} cy={y1} r={3} fill={meta.stroke} />
              <circle cx={x2} cy={y2} r={3} fill={meta.stroke} />
              {/* Fat invisible twin — the thing you can actually hover + click. */}
              <path
                d={d}
                data-weave-keep=""
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPin({ link: l, src: l.from.runId, x: mx, y: my });
                }}
              >
                <title>{l.title} — click for the connection</title>
              </path>
            </g>
          );
        })}
      </svg>

      {pin && (
        <div
          role="dialog"
          aria-label={`Connection · ${pin.link.title}`}
          data-weave-keep=""
          className="absolute flex flex-col"
          style={{
            zIndex: 7,
            left: Math.min(Math.max(pin.x - 150, 8), trackWidth - 316),
            top: Math.max(pin.y - 12, 8),
            transform: "translateY(-100%)",
            width: 300,
            gap: 8,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--surface-base)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 12px 32px rgba(15,16,35,.18)",
          }}
        >
          <span className="flex items-center justify-between" style={{ gap: 10 }}>
            <span className="inline-flex items-center" style={{ gap: 7, minWidth: 0 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 0,
                  borderTop: `2.5px ${pin.link.kind === "yarn" ? "dashed" : "solid"} ${WEAVE_KIND_META[pin.link.kind].stroke}`,
                  flexShrink: 0,
                }}
              />
              <span
                className="type-caption"
                style={{
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--ds-text-placeholder, var(--text-muted))",
                  whiteSpace: "nowrap",
                }}
              >
                {WEAVE_KIND_META[pin.link.kind].label}
              </span>
            </span>
            <button
              type="button"
              onClick={onUnpin}
              aria-label="Close connection"
              className="inline-flex items-center justify-center"
              style={{ width: 22, height: 22, borderRadius: 6, background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={13} weight="bold" />
            </button>
          </span>

          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {pin.link.title}
          </span>

          {/* The two ends, named the way the floor names them. */}
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {pin.link.from.label} · {pin.link.from.centreName} → {pin.link.to.label} ·{" "}
            {pin.link.to.centreName}
          </span>

          <span className="type-body" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}>
            {pin.link.why}
          </span>
        </div>
      )}
    </>
  );
}

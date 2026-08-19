"use client";

import type { CSSProperties } from "react";

/**
 * A ball-of-yarn glyph for Sable's queue header. Phosphor ships no yarn icon,
 * so this is drawn to match its stroke weight and the `size` / `color` contract
 * so it drops into `TableShell`'s `icon` slot like any Phosphor icon.
 */
export default function YarnBallIcon({
  size = 16,
  color = "currentColor",
  className,
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      {/* The wound strands crossing the ball. */}
      <path d="M12 3a12 12 0 0 0 0 18" />
      <path d="M12 3a12 12 0 0 1 0 18" />
      <path d="M4 8c5 3 11 3 16 0" />
      <path d="M3.5 15c5.5 2.5 11.5 2.5 17 0" />
      {/* The loose tail. */}
      <path d="M17.5 18.5c1.6 0.6 2.4 1.8 2.2 3" />
    </svg>
  );
}

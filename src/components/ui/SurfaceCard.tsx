"use client";

import type { ReactNode } from "react";

/** The standard card frame on Make: a header with a title and a quiet
 *  right-hand caption, then a body. */
export default function SurfaceCard({
  title,
  caption,
  bodyPadding = "16px 18px",
  divided,
  children,
}: {
  title: string;
  caption?: ReactNode;
  bodyPadding?: string;
  /** Rule under the header. Defaults on only when the body has no padding —
   *  a flush list needs the separator; a padded body already has the gap. */
  divided?: boolean;
  children: ReactNode;
}) {
  const showRule = divided ?? bodyPadding === "0";
  return (
    <section
      style={{
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        overflow: "hidden",
      }}
    >
      <header
        className="flex items-center justify-between"
        style={{
          gap: 10,
          padding: showRule ? "14px 18px" : "14px 18px 0",
          borderBottom: showRule ? "1px solid var(--border-default)" : undefined,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ds-text-primary)" }}>
          {title}
        </span>
        {caption && (
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {caption}
          </span>
        )}
      </header>
      <div style={{ padding: bodyPadding }}>{children}</div>
    </section>
  );
}

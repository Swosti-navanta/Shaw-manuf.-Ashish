"use client";

import type { ReactNode } from "react";
import { useDetailDrawer } from "@/context/DetailDrawerContext";
import type { DetailKind } from "@/types/run";

/**
 * An identifier that opens its own detail — rendered as a plain link in the
 * DS link colour, underlined only on hover.
 *
 * Every figure the agents assert should be one of these. If a number can't be
 * drilled into, the product is asking to be believed rather than checked.
 */
export default function DrillLink({
  kind,
  id,
  children,
}: {
  kind: DetailKind;
  id: string;
  children?: ReactNode;
  /** Retained for call sites that distinguish inline prose from an id cell;
   *  both now render identically. */
  variant?: "id" | "prose";
}) {
  const { open } = useDetailDrawer();

  return (
    <button
      type="button"
      onClick={() => open(kind, id)}
      className="inline transition-colors hover:underline"
      style={{
        background: "none",
        padding: 0,
        cursor: "pointer",
        fontSize: "inherit",
        color: "var(--link-color)",
        // A <button> is centred by UA default; a link inside a table cell has
        // to sit on the same left edge as the text under it.
        textAlign: "left",
      }}
    >
      {children ?? id}
    </button>
  );
}

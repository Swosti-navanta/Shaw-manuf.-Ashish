"use client";

import { useEffect } from "react";
import { DetailPanelShell } from "@navanta-ai/design-system";
import { useDetailDrawer } from "@/context/DetailDrawerContext";
import { DetailBody, detailHeading } from "./DetailBody";

/**
 * The detail drawer — the DS `DetailPanelShell`. It portals above the portal
 * shell and brings its own scrim, so it works from any route.
 *
 * Esc is added here: the shell closes on scrim click but doesn't listen for
 * the key, and this panel opens from dense tables where reaching for the
 * mouse to dismiss is a tax.
 */
export default function DetailDrawer() {
  const { target, close } = useDetailDrawer();

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [target, close]);

  const heading = target ? detailHeading(target) : null;

  return (
    <DetailPanelShell
      open={Boolean(target)}
      onClose={close}
      title={heading?.title ?? ""}
      subtitle={heading?.subtitle}
      width={468}
    >
      {target && <DetailBody target={target} />}
    </DetailPanelShell>
  );
}

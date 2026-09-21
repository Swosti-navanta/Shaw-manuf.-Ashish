"use client";

import { createPortal } from "react-dom";
import { Check } from "@phosphor-icons/react";
import { usePcard } from "@/context/PcardContext";

/** The brief confirmation after an audit action lands — announced through a
 *  live region so it reaches a screen reader, not just the corner of the eye.
 *  Same shape as the Make deck's toast so the two experiences confirm alike. */
export default function PcardToast() {
  const { toast } = usePcard();
  if (!toast || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 flex items-center"
      style={{
        top: 20,
        zIndex: 2000,
        transform: "translateX(-50%)",
        gap: 8,
        padding: "10px 16px",
        background: "var(--ds-text-primary)",
        color: "var(--surface-base)",
        borderRadius: 10,
        boxShadow: "0 12px 32px rgba(15,16,35,.25)",
        fontSize: 14,
        fontWeight: 500,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <Check size={14} weight="bold" />
      {toast}
    </div>,
    document.body,
  );
}

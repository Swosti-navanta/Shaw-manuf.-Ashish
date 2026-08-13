"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GearSix } from "@phosphor-icons/react";
import { usePersona } from "@/context/PersonaContext";

interface ProfileMenuProps {
  /** Controlled open state — driven by the DS SideNav user block. */
  open: boolean;
  /** Which SideNav user element opened it (rail or expanded panel) — sets
   *  where the popover anchors. */
  anchor: "rail" | "panel";
  onClose: () => void;
}

function Avatar({ initials, size = 24 }: { initials: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center shrink-0 font-medium"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: "var(--color-iris-100, #EBDFFF)",
        color: "var(--color-iris-700)",
        fontSize: Math.round(size * 0.42),
        lineHeight: 1,
      }}
    >
      {initials}
    </span>
  );
}

export function ProfileMenu({ open, anchor, onClose }: ProfileMenuProps) {
  const { profile } = usePersona();
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Esc. Listeners attach after paint, so the click
  // that opened the popover never immediately closes it.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const current = profile;

  return (
    <div
      ref={popoverRef}
      role="menu"
      className="fixed z-[60]"
      style={{
        // Anchor above the SideNav user block: the rail sits at the far left
        // (48px wide), the expanded panel is 256px wide flush-left.
        bottom: 16,
        left: anchor === "rail" ? 56 : 16,
        width: 272,
        padding: 8,
        background: "var(--surface-base)",
        border: "1px solid var(--ds-border-subtle)",
        borderRadius: 12,
        boxShadow: "var(--shadow-dropdown, 0 8px 24px rgba(0,0,0,0.12))",
      }}
    >
      <div className="flex items-center w-full" style={{ gap: 10, padding: "6px 8px" }}>
        <Avatar initials={current.initials} size={32} />
        <div className="flex flex-col min-w-0" style={{ flex: 1 }}>
          <span className="type-body font-medium truncate" style={{ color: "var(--ds-text-primary)" }}>
            {current.name}
          </span>
          <span className="type-caption font-normal truncate" style={{ color: "var(--ds-text-secondary)" }}>
            {current.role}
          </span>
        </div>
      </div>

      <div className="w-full" style={{ height: 1, background: "var(--ds-border-subtle)", margin: "6px 0" }} />


      <div className="w-full" style={{ height: 1, background: "var(--ds-border-subtle)", margin: "6px 0" }} />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          router.push("/settings/audit");
        }}
        className="flex items-center w-full rounded-md hover:bg-[var(--sidebar-hover-bg)] transition-colors text-left"
        style={{ gap: 10, padding: "6px 8px" }}
      >
        <GearSix size={16} weight="bold" className="text-[var(--text-secondary)]" />
        <span className="type-body font-normal" style={{ color: "var(--ds-text-secondary)" }}>
          Settings
        </span>
      </button>
    </div>
  );
}

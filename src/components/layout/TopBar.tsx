"use client";

import { usePathname } from "next/navigation";
import { SidebarSimple } from "@phosphor-icons/react";
import { Select } from "@navanta-ai/design-system";
import { useScope } from "@/context/ScopeContext";
import { usePersona } from "@/context/PersonaContext";
import {
  divisionSelectItems,
  plantSelectItems,
  type DivisionFilter,
  type PlantId,
} from "@/types/division";

interface TopBarProps {
  onToggleSidebar: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  overview: "Overview",
  make: "Make",
  quality: "Quality",
  claims: "Field claims",
  scheduling: "Scheduling",
  rules: "Constraint model",
  yarn: "Yarn",
  performance: "Performance",
  thresholds: "Thresholds",
  settings: "Settings",
  audit: "Audit log",
};

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const titleSeg = segments[segments.length - 1] ?? "overview";
  const title =
    ROUTE_LABELS[titleSeg] ?? titleSeg.charAt(0).toUpperCase() + titleSeg.slice(1);

  const { division, setDivision, plant, setPlant } = useScope();
  const { persona } = usePersona();

  // Thresholds is the one surface that reads across the whole network — the
  // VP sets a dial per plant, so a single-plant scope would misrepresent it.
  // The plant Select stays live there (it's what you're editing), but the
  // page itself lists every plant the division filter admits.
  const isNetworkView = pathname.startsWith("/performance");

  return (
    <header
      className="relative z-10 flex items-center justify-between shrink-0"
      style={{
        background: "var(--surface-base)",
        borderBottom: "1px solid #E4E5E7",
        height: 48,
        padding: "0 24px",
      }}
    >
      {/* Left: sidebar toggle + page title */}
      <div className="flex items-center" style={{ gap: 12 }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ width: 18, height: 18, background: "transparent" }}
        >
          <SidebarSimple size={18} weight="bold" color="#181A1B" />
        </button>
        <span
          className="type-body-medium"
          style={{ color: "var(--ds-text-primary)", whiteSpace: "nowrap" }}
        >
          {title}
        </span>
      </div>

      {/* Right: the global scope filters. Division narrows the plant list;
          neither gates a route — every persona can look anywhere. */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <SelectField
          ariaLabel="Division"
          value={division}
          onChange={(v) => setDivision(v as DivisionFilter)}
          items={divisionSelectItems()}
          width={200}
        />
        <SelectField
          ariaLabel="Plant"
          value={plant}
          onChange={(v) => setPlant(v as PlantId)}
          items={plantSelectItems(division)}
          searchable
          disabled={isNetworkView}
          displayLabel={isNetworkView ? "All plants" : undefined}
          width={208}
        />
        <span
          className="type-caption"
          style={{
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ds-text-placeholder, var(--text-muted))",
            border: "1px solid var(--border-default)",
            borderRadius: 5,
            padding: "3px 7px",
            whiteSpace: "nowrap",
          }}
          title={`Signed in as the ${persona} persona`}
        >
          Illustrative data
        </span>
      </div>
    </header>
  );
}

// Thin wrapper over the DS Select (compound API) — a fixed-width single
// select with optional search, matching the IRIS TopBar's scope controls.
function SelectField({
  value,
  onChange,
  items,
  searchable,
  disabled,
  displayLabel,
  width,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { label: string; value: string }[];
  searchable?: boolean;
  disabled?: boolean;
  /** Overrides the shown value without changing the selection — used when
   *  the control is disabled on a network-wide page, so it reads as
   *  scope-less rather than showing a stale pick. */
  displayLabel?: string;
  width: number;
  ariaLabel: string;
}) {
  return (
    <div style={{ width }}>
      <Select
        value={displayLabel ? "" : value}
        onValueChange={onChange}
        size="sm"
        disabled={disabled}
        {...(searchable !== undefined ? { searchable } : {})}
      >
        <Select.Trigger aria-label={ariaLabel}>
          <Select.Value placeholder={displayLabel ?? ariaLabel} />
        </Select.Trigger>
        <Select.Content>
          {items.map((i) => (
            <Select.Item key={i.value} value={i.value}>
              {i.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>
  );
}

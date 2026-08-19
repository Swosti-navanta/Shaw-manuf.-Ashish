"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Factory,
  GridFour,
  Plant,
  RowsPlusBottom,
  Scroll,
  SidebarSimple,
  SquaresFour,
  Spiral,
  Stack,
  Tree,
  Wall,
  Package,
  type Icon,
} from "@phosphor-icons/react";
import { Select } from "@navanta-ai/design-system";
import { useScope } from "@/context/ScopeContext";
import { plantSelectItems, ALL_DIVISIONS, type PlantId } from "@/types/division";
import {
  ALL_CATEGORIES,
  CATEGORIES,
  DEFAULT_CATEGORY,
  categoryById,
} from "@/data/categories";

interface TopBarProps {
  onToggleSidebar: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  overview: "Executive dashboard",
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

  /* The visible control is the product book; `division` stays the thing the
     pages actually filter on. Only broadloom runs plants here, so picking any
     other category empties the plant list rather than pretending. */
  const [category, setCategoryId] = useState<string>(DEFAULT_CATEGORY);
  const cat = categoryById(category);
  const catLoaded = cat?.loaded ?? false;

  const onCategory = (id: string) => {
    setCategoryId(id);
    setDivision(id === ALL_CATEGORIES || id === DEFAULT_CATEGORY ? "residential" : ALL_DIVISIONS);
  };

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

      {/* Right: scope, in two levels — what Shaw makes, then where. Matching
          the supply-chain bar: the glyph sits INSIDE the trigger, because
          `Select.Value` renders the chosen item's label alone, so an icon set
          on the option vanishes the moment it is picked — the one state the
          reader looks at all day. No distribution centre here: this app stops
          at the end of the line, and where the roll is held afterwards is the
          other app's question. */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <Select value={category} onValueChange={onCategory}>
          <Select.Trigger size="sm" aria-label="Product category" className="w-[184px]">
            <span
              className="min-w-0 items-center"
              style={{ display: "flex", gap: 7, whiteSpace: "nowrap" }}
            >
              <CategoryGlyph icon={cat?.icon ?? "Package"} />
              <Select.Value placeholder="Category" />
            </span>
          </Select.Trigger>
          <Select.Content>
            {CATEGORIES.map((c) => (
              <Select.Item key={c.id} value={c.id}>
                <span className="flex items-center" style={{ gap: 8 }}>
                  <CategoryGlyph icon={c.icon} />
                  {c.label}
                </span>
              </Select.Item>
            ))}
          </Select.Content>
        </Select>

        <Select
          /* Empty rather than a stale pick when the category runs no mills
             here, so the trigger shows its placeholder instead of a plant that
             does not belong to what is selected beside it. */
          value={catLoaded && !isNetworkView ? plant : ""}
          onValueChange={(v: string) => setPlant(v as PlantId)}
          disabled={!catLoaded || isNetworkView}
        >
          {/* One glyph for the whole list rather than one per option — every
              option here is a mill. */}
          <Select.Trigger size="sm" aria-label="Plant" className="w-[208px]">
            <span
              className="min-w-0 items-center"
              style={{ display: "flex", gap: 7, whiteSpace: "nowrap" }}
            >
              <Factory
                size={15}
                weight="duotone"
                className="shrink-0"
                style={{ color: "var(--text-secondary)" }}
              />
              <Select.Value
                placeholder={isNetworkView ? "All plants" : catLoaded ? "Plant" : "No plant"}
              />
            </span>
          </Select.Trigger>
          <Select.Content>
            {plantSelectItems(division).map((i) => (
              <Select.Item key={i.value} value={i.value}>
                {i.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
    </header>
  );
}

/**
 * The glyph for each category, resolved here rather than in the data.
 *
 * The catalogue names its icon as a string and this owns the import — a data
 * file that imported React components would drag the whole icon set into
 * anything that reads a category, and the server bundles read categories.
 *
 * Drawn from what the product physically is, matching the supply-chain app so
 * the same category carries the same mark in both: broadloom arrives on a
 * roll, a tile is a grid of them, resilient is laid in planks, hardwood is a
 * tree, laminate is layers, tile and stone is masonry, turf is grass, and yarn
 * is wound.
 */
function CategoryGlyph({ icon }: { icon: string }) {
  const Glyph = CATEGORY_ICON[icon] ?? Package;
  return (
    <Glyph
      size={15}
      weight="duotone"
      className="shrink-0"
      style={{ color: "var(--text-secondary)" }}
    />
  );
}

const CATEGORY_ICON: Record<string, Icon> = {
  SquaresFour,
  GridFour,
  Scroll,
  RowsPlusBottom,
  Tree,
  Stack,
  Wall,
  Plant,
  Spiral,
};

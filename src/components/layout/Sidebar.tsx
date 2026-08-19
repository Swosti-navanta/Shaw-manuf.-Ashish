"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  SquaresFour,
  CalendarBlank,
  ListChecks,
  Drop,
  Gauge,
  ShieldCheck,
  Sliders,
  ChartBar,
  SidebarSimple,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import ShawMark from "@/components/ui/ShawMark";
import {
  SideNav,
  type SideNavItem,
  type SideNavIconProps,
  type SideNavSection,
} from "@navanta-ai/design-system";
import { usePersona } from "@/context/PersonaContext";
import { PERSONAS, isPathAllowedForPersona } from "@/types/persona";
import { ProfileMenu } from "./ProfileMenu";

type NavDef = {
  name: string;
  href: string;
  icon: Icon;
  /** The agent whose queue this surface is. Shown as a caption so the nav
   *  reads as "who is doing this", not just "where things live". */
  agent: string;
};

// Grouped the way the shift actually splits: what's waiting on a person,
// then the plan behind it, then the limits that govern both.
const INBOX_ITEMS: NavDef[] = [
  { name: "Executive dashboard", href: "/overview", icon: SquaresFour, agent: "Roll-up" },
];

const FLOOR_ITEMS: NavDef[] = [
  { name: "Yarn", href: "/yarn", icon: Drop, agent: "Sable" },
  { name: "Make", href: "/make", icon: Gauge, agent: "Rowan" },
  { name: "Quality", href: "/quality", icon: ShieldCheck, agent: "Wren" },
];

const PLAN_ITEMS: NavDef[] = [
  { name: "Scheduling", href: "/scheduling", icon: CalendarBlank, agent: "Sawyer" },
  { name: "Constraint model", href: "/scheduling/rules", icon: ListChecks, agent: "Sawyer" },
];

const NETWORK_ITEMS: NavDef[] = [
  { name: "Performance", href: "/performance", icon: ChartBar, agent: "Roll-up" },
  { name: "Thresholds", href: "/thresholds", icon: Sliders, agent: "Limits" },
];

const ALL_ITEMS = [...INBOX_ITEMS, ...FLOOR_ITEMS, ...PLAN_ITEMS, ...NETWORK_ITEMS];

const SETTINGS_HREF = "/settings/audit";

interface SidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export default function Sidebar({ expanded, onExpandedChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { persona } = usePersona();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<"rail" | "panel">("rail");

  const isActive = (href: string) => {
    if (href === SETTINGS_HREF) return pathname.startsWith("/settings");
    // Scheduling has a child route (/scheduling/rules) with its own nav entry,
    // so the board matches exactly — otherwise both entries light up and the
    // first-match `activeKey` below would always pick the parent.
    if (href === "/scheduling") return pathname === "/scheduling";
    if (href === "/quality") return pathname === "/quality";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // No counts on the rail. One person owns every surface now, so a badge on
  // each of six icons is six numbers competing at the edge of the screen —
  // and the Overview inbox already aggregates all of them into one ranked
  // list. The rail says where things are; the inbox says what to do.
  const toItem = (d: NavDef): SideNavItem => ({
    key: d.href,
    label: d.name,
    icon: d.icon as unknown as React.ComponentType<SideNavIconProps>,
  });

  // The nav is filtered by persona, but the persona allowlist in
  // types/persona.ts stays the single source of truth — a nav entry can
  // never show a route the proxy would bounce.
  const visible = (defs: NavDef[]) =>
    defs.filter(
      (d) =>
        isPathAllowedForPersona(d.href, persona),
    );

  const sections: SideNavSection[] = [];
  const inbox = visible(INBOX_ITEMS);
  const floor = visible(FLOOR_ITEMS);
  const plan = visible(PLAN_ITEMS);
  const network = visible(NETWORK_ITEMS);

  // Ordered the way work actually flows: the plan is set, then it is executed.
  // Yarn sits with execution rather than with the plan — Sable's dye lots and
  // recipes are what the floor consumes, and grouping it beside Make and
  // Quality keeps the three surfaces that share a dye lot together.
  if (inbox.length) sections.push({ items: inbox.map(toItem) });
  if (plan.length) sections.push({ label: "The plan", items: plan.map(toItem) });
  if (floor.length) sections.push({ label: "On the floor", items: floor.map(toItem) });
  if (network.length) sections.push({ label: "Network", items: network.map(toItem) });

  const activeKey = ALL_ITEMS.find((d) => isActive(d.href))?.href;
  const profile = PERSONAS[persona];

  return (
    <>
      <SideNav
        sections={sections}
        activeKey={activeKey}
        onNavigate={(item) => router.push(item.key)}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
        /* The rail's top slot, which used to hold the mark. The expand control
           lives here rather than in the top bar because it acts on the rail —
           a button that widens this column reads as belonging to it, and it
           sits above every nav icon where a person looks for it first. */
        logoCollapsed={
          <button
            type="button"
            onClick={() => onExpandedChange(true)}
            aria-label="Expand navigation"
            aria-expanded={expanded}
            title="Expand navigation"
            className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--sidebar-hover-bg)]"
            style={{ cursor: "pointer" }}
          >
            <SidebarSimple size={18} weight="bold" color="#FFFFFF" />
          </button>
        }
        logo={
          <div className="flex items-center" style={{ gap: 8 }}>
            <ShawMark />
            <div className="flex flex-col" style={{ lineHeight: 1.15 }}>
              <span className="type-subheading" style={{ color: "var(--ds-text-primary)" }}>
                Shaw
              </span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ds-text-secondary)",
                }}
              >
                Manufacturing
              </span>
            </div>
          </div>
        }
        onSettingsClick={() => router.push(SETTINGS_HREF)}
        settingsLabel="Settings"
        user={{
          name: profile.name,
          description: profile.role,
          initials: profile.initials,
          color: "var(--color-iris-700)",
        }}
        onUserClick={(anchor) => {
          setMenuAnchor(anchor);
          setMenuOpen(true);
        }}
      />
      <ProfileMenu
        open={menuOpen}
        anchor={menuAnchor}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}


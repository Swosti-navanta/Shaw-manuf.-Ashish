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
  { name: "Yarn planning", href: "/yarn", icon: Drop, agent: "Sable" },
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

// The P-Card audit experience. A different job entirely — indirect
// procurement, not the plant — so it never shares a section with the
// manufacturing surfaces. The persona allowlist hides one set or the other.
// Only the surfaces that exist are listed; a nav entry to a 404 teaches
// people the rest of the rail can't be trusted either.
const PCARD_ITEMS: NavDef[] = [
  { name: "Command center", href: "/p-card", icon: SquaresFour, agent: "P-Card Audit Agent" },
  { name: "Action center", href: "/p-card/actions", icon: ListChecks, agent: "P-Card Audit Agent" },
  { name: "Audit records", href: "/p-card/records", icon: ShieldCheck, agent: "P-Card Audit Agent" },
];

const ALL_ITEMS = [...INBOX_ITEMS, ...FLOOR_ITEMS, ...PLAN_ITEMS, ...NETWORK_ITEMS, ...PCARD_ITEMS];

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
    // Command center is the parent of every other audit route — exact match
    // for the same reason as the scheduling board.
    if (href === "/p-card") return pathname === "/p-card";
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
  const pcard = visible(PCARD_ITEMS);

  // Ordered the way work actually flows: the plan is set, then it is executed.
  // Yarn sits with execution rather than with the plan — Sable's dye lots and
  // recipes are what the floor consumes, and grouping it beside Make and
  // Quality keeps the three surfaces that share a dye lot together.
  if (inbox.length) sections.push({ items: inbox.map(toItem) });
  if (plan.length) sections.push({ label: "The plan", items: plan.map(toItem) });
  if (floor.length) sections.push({ label: "On the floor", items: floor.map(toItem) });
  if (network.length) sections.push({ label: "Network", items: network.map(toItem) });
  if (pcard.length) sections.push({ label: "P-Card audit", items: pcard.map(toItem) });

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
          /* The white cut of the wordmark: this panel is teal, and the navy
             logo the top bar uses would all but vanish on it. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/shaw-logo-white.svg"
            alt="Shaw"
            style={{ height: 26, width: "auto", marginLeft: 2 }}
          />
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


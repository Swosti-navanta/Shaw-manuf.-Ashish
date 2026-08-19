// Persona system for Shaw MFG — one profile that owns every agent surface.
//
// This started as three personas mirroring an escalation ladder (plant →
// division → network). It collapsed to one because the ladder was costing
// more than it explained: every cross-agent story in the product — Rowan's
// decision rebuilding Sawyer's sequence, Wren's finding writing a scheduling
// rule, Sable's lot sizing sitting behind Rowan's options — had to be told
// across a profile switch. A person who has to change identity to follow the
// consequence of their own decision can't see that the agents are connected,
// which is the entire claim.
//
// The scaffolding is kept rather than deleted: `Persona` is still a union and
// the allowlist still exists, so re-splitting is a data change here and not a
// rewrite of the proxy, the nav and every page.
//
// Division and plant remain the live dimensions (see src/types/division.ts).
// They filter data; they have never gated routes.
//
// Persisted in a cookie so the proxy (src/proxy.ts) can route-guard against
// the same source of truth the client uses.

export type Persona = "ops" | "plant";

export interface PersonaProfile {
  /** Display name shown in the profile menu. */
  name: string;
  /** Role caption beneath the name. */
  role: string;
  /** Two-letter initials for the avatar. */
  initials: string;
  /** One-line scope caption — what this persona is accountable for. */
  scope: string;
  /** Agents whose queue lands on this persona's desk. */
  agents: ReadonlyArray<string>;
}

export const PERSONAS: Record<Persona, PersonaProfile> = {
  ops: {
    name: "Marcus",
    role: "Director of Manufacturing",
    initials: "MB",
    scope: "All divisions · every agent",
    agents: ["Rowan", "Wren", "Sawyer", "Sable"],
  },
  // The floor seat. Owns the shift's decisions but not the financial read —
  // Performance (POVA, budgets) and the network Thresholds dial are senior
  // views, so this persona never sees them.
  plant: {
    name: "Dana",
    role: "Plant Manager · Plant 12",
    initials: "DW",
    scope: "Plant 12 · shift decisions, no financials",
    agents: ["Rowan", "Wren", "Sable"],
  },
};

export const PERSONA_ORDER: ReadonlyArray<Persona> = ["ops", "plant"];

/** The only persona there is. Everything that used to branch on identity
 *  resolves to this. */
export const DEFAULT_PERSONA: Persona = "ops";

/** Sections every signed-in persona can reach. */
export const SHARED_PREFIXES: ReadonlyArray<string> = ["/settings"];

/**
 * Path-prefix allowlist per persona, on top of SHARED_PREFIXES. The proxy
 * checks each protected path against the active persona's list (plus the
 * shared list) and redirects home if no prefix matches.
 *
 * One persona, so today this is every surface. The mechanism stays because
 * the cost of keeping it is a single array and the cost of removing it is
 * re-deriving route guarding from scratch the first time a real deployment
 * needs two roles.
 */
export const PERSONA_PAGES: Record<Persona, ReadonlyArray<string>> = {
  ops: [
    "/overview",
    "/make",
    "/quality",
    "/scheduling",
    "/yarn",
    "/performance",
    "/sage",
    "/thresholds",
  ],
  // No /performance and no /thresholds — financials and network dials are
  // senior views. Everything operational stays.
  plant: ["/overview", "/make", "/quality", "/scheduling", "/yarn", "/sage"],
};

/** Where you land after sign-in. The inbox, because the product's opening
 *  claim is that it tells you what to act on rather than handing you a
 *  dashboard to read. */
export const PERSONA_HOME: Record<Persona, string> = {
  ops: "/overview",
  plant: "/overview",
};

/** One owner, so both of these are simply true. They stay as functions
 *  because they are the seams a future role split would reopen. */
export function canEditThresholds(): boolean {
  return true;
}

export function canReleaseSchedule(): boolean {
  return true;
}

export function isPathAllowedForPersona(
  pathname: string,
  persona: Persona,
): boolean {
  const allowed = [...SHARED_PREFIXES, ...PERSONA_PAGES[persona]];
  return allowed.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPersona(value: string | undefined): value is Persona {
  return value === "ops" || value === "plant";
}

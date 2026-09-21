// Persona system for Shaw MFG — role-scoped access to the agent surfaces.
//
// Three seats, each with a different slice of the plant:
//   • VP of Manufacturing — the executive read: the dashboard, Performance
//     (POVA, budgets) and the network Thresholds dial. No floor decisions.
//   • Scheduler — the plan: the belt schedule, yarn/dye lots, and the Make
//     queue where the shift's decisions land.
//   • Plant Manager — sees everything, the full app.
//
// Division and plant remain the live data dimensions (see
// src/types/division.ts). They filter data; persona gates routes.
//
// Persisted in a cookie so the proxy (src/proxy.ts) can route-guard against
// the same source of truth the client uses.

export type Persona = "vp" | "scheduler" | "plant" | "pcard";

export interface PersonaProfile {
  /** Display name shown in the profile menu. */
  name: string;
  /** Role caption beneath the name. */
  role: string;
  /** Two-letter initials for the avatar. */
  initials: string;
  /** Agents whose queue lands on this persona's desk. */
  agents: ReadonlyArray<string>;
}

export const PERSONAS: Record<Persona, PersonaProfile> = {
  // The executive seat. The financial and network read — never the floor.
  vp: {
    name: "Marcus Bell",
    role: "VP of Manufacturing",
    initials: "MB",
    agents: ["Sage"],
  },
  // The plan seat. Owns the sequence, the lots that feed it, and the shift's
  // decisions — but not the financial read or the network dials.
  scheduler: {
    name: "Sam Ortiz",
    role: "Scheduler",
    initials: "SO",
    agents: ["Sawyer", "Sable", "Rowan"],
  },
  // The floor's most senior seat — every surface, every agent.
  plant: {
    name: "Dana Whitfield",
    role: "Plant Manager",
    initials: "DW",
    agents: ["Rowan", "Wren", "Sawyer", "Sable"],
  },
  // The second experience in the portal: indirect procurement, not the plant.
  // The P-Card Auditor sees only the audit surfaces — none of the
  // manufacturing agents' queues reach her desk, and hers reach nobody else's.
  pcard: {
    name: "Carol Nance",
    role: "P-Card Auditor",
    initials: "CN",
    agents: ["P-Card Audit Agent"],
  },
};

export const PERSONA_ORDER: ReadonlyArray<Persona> = ["vp", "scheduler", "plant", "pcard"];

/** Where the demo opens: the Plant Manager, who can reach every surface so
 *  nothing reads as missing on first load. */
export const DEFAULT_PERSONA: Persona = "plant";

/** Sections every signed-in persona can reach. */
export const SHARED_PREFIXES: ReadonlyArray<string> = ["/settings"];

/**
 * Path-prefix allowlist per persona, on top of SHARED_PREFIXES. The proxy
 * checks each protected path against the active persona's list (plus the
 * shared list) and redirects home if no prefix matches. The sidebar reads the
 * same list to decide which nav items to show.
 */
export const PERSONA_PAGES: Record<Persona, ReadonlyArray<string>> = {
  // Executive: dashboard, Performance, Thresholds.
  vp: ["/overview", "/performance", "/thresholds"],
  // The plan: schedule (and the constraint model under it), yarn, Make.
  scheduler: ["/scheduling", "/yarn", "/make"],
  // Everything.
  plant: [
    "/overview",
    "/make",
    "/quality",
    "/scheduling",
    "/yarn",
    "/performance",
    "/sage",
    "/thresholds",
  ],
  // The audit experience only. The prefix covers every /p-card route, so the
  // remaining audit surfaces land here as they're built.
  pcard: ["/p-card"],
};

/** Where each persona lands after sign-in — the surface they live in. */
export const PERSONA_HOME: Record<Persona, string> = {
  vp: "/overview",
  scheduler: "/scheduling",
  plant: "/overview",
  pcard: "/p-card",
};

/** Thresholds is a senior/network view — only the VP and the Plant Manager
 *  reach it, so only they can move the dial. */
export function canEditThresholds(persona: Persona): boolean {
  return persona === "vp" || persona === "plant";
}

/** Releasing the sequence is the Scheduler's and Plant Manager's call. */
export function canReleaseSchedule(persona: Persona): boolean {
  return persona === "scheduler" || persona === "plant";
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
  return value === "vp" || value === "scheduler" || value === "plant" || value === "pcard";
}

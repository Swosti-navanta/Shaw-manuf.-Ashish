// Persona cookie helpers. The cookie is the source of truth so both the
// React client and the Next proxy (src/proxy.ts) read the same value.

import { isPersona, type Persona } from "@/types/persona";

export const PERSONA_COOKIE = "shaw_persona";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

/** Fired after the cookie is written so `useSyncExternalStore` re-reads —
 *  cookies emit no native change event. */
export const PERSONA_CHANGE_EVENT = "shaw:persona-change";

export function clientSetPersona(persona: Persona) {
  document.cookie = `${PERSONA_COOKIE}=${persona};path=/;max-age=${ONE_WEEK_SECONDS};samesite=lax`;
}

export function clientReadPersona(): Persona | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${PERSONA_COOKIE}=`));
  if (!match) return null;
  const value = match.slice(PERSONA_COOKIE.length + 1);
  return isPersona(value) ? value : null;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Persona, PersonaProfile } from "@/types/persona";
import {
  DEFAULT_PERSONA,
  PERSONAS,
  PERSONA_HOME,
  isPathAllowedForPersona,
} from "@/types/persona";
import {
  clientReadPersona,
  clientSetPersona,
  PERSONA_CHANGE_EVENT,
} from "@/lib/persona";

interface PersonaContextValue {
  persona: Persona;
  profile: PersonaProfile;
  setPersona: (next: Persona) => void;
}

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

interface PersonaProviderProps {
  /** Optional server-resolved cookie value, to avoid a first-render flash. */
  initialPersona?: Persona;
  children: ReactNode;
}

export function PersonaProvider({
  initialPersona = DEFAULT_PERSONA,
  children,
}: PersonaProviderProps) {
  // The persona lives in a cookie so the proxy can read it too. Server and
  // client must agree on the first render or React throws a hydration
  // mismatch — `useSyncExternalStore` lets the server render
  // `initialPersona` while the client hydrates against the cookie.
  const persona = useSyncExternalStore(
    (notify) => {
      window.addEventListener(PERSONA_CHANGE_EVENT, notify);
      return () => window.removeEventListener(PERSONA_CHANGE_EVENT, notify);
    },
    () => clientReadPersona() ?? initialPersona,
    () => initialPersona,
  );
  const router = useRouter();
  const pathname = usePathname();

  const setPersona = useCallback(
    (next: Persona) => {
      clientSetPersona(next);
      window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
      // Never leave someone on a page their new persona has no nav to.
      if (pathname && !isPathAllowedForPersona(pathname, next)) {
        router.replace(PERSONA_HOME[next]);
      }
    },
    [pathname, router],
  );

  return (
    <PersonaContext.Provider
      value={{ persona, profile: PERSONAS[persona], setPersona }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    throw new Error("usePersona must be used within a PersonaProvider");
  }
  return ctx;
}

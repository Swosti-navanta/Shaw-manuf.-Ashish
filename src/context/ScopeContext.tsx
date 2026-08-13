"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DIVISIONS,
  PLANTS,
  plantMatchesDivision,
  plantsInDivision,
  type Division,
  type DivisionFilter,
  type Plant,
  type PlantId,
} from "@/types/division";
import {
  DEFAULT_DIVISION,
  DEFAULT_PLANT,
  SCOPE_CHANGE_EVENT,
  clientReadDivision,
  clientReadPlant,
  clientSetDivision,
  clientSetPlant,
} from "@/lib/scope";

interface ScopeContextValue {
  /** The active division filter — `"all"` means unfiltered. */
  division: DivisionFilter;
  /** The resolved division record, or null when unfiltered. */
  divisionInfo: Division | null;
  setDivision: (next: DivisionFilter) => void;

  /** The plant currently in focus. Always a real plant — the pages need a
   *  concrete constraint line to talk about, so there's no "all plants". */
  plant: PlantId;
  plantInfo: Plant;
  setPlant: (next: PlantId) => void;

  /** Plants the division filter currently admits — what the plant Select
   *  offers, and what a cross-plant roll-up should sum over. */
  visiblePlants: ReadonlyArray<Plant>;
}

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

export function ScopeProvider({ children }: { children: ReactNode }) {
  // Same cookie-backed external-store pattern as PersonaContext, so a
  // reload keeps the scope and SSR never disagrees with the client.
  const division = useSyncExternalStore(
    (notify) => {
      window.addEventListener(SCOPE_CHANGE_EVENT, notify);
      return () => window.removeEventListener(SCOPE_CHANGE_EVENT, notify);
    },
    () => clientReadDivision() ?? DEFAULT_DIVISION,
    () => DEFAULT_DIVISION,
  );

  const plant = useSyncExternalStore(
    (notify) => {
      window.addEventListener(SCOPE_CHANGE_EVENT, notify);
      return () => window.removeEventListener(SCOPE_CHANGE_EVENT, notify);
    },
    () => clientReadPlant() ?? DEFAULT_PLANT,
    () => DEFAULT_PLANT,
  );

  const setPlant = useCallback((next: PlantId) => {
    clientSetPlant(next);
    window.dispatchEvent(new Event(SCOPE_CHANGE_EVENT));
  }, []);

  const setDivision = useCallback(
    (next: DivisionFilter) => {
      clientSetDivision(next);
      // Narrowing the division can orphan the selected plant. Snap to the
      // first plant of the new division so the pages below never render
      // against a plant the filter has just excluded.
      const currentPlant = clientReadPlant() ?? DEFAULT_PLANT;
      if (!plantMatchesDivision(currentPlant, next)) {
        const [first] = plantsInDivision(next);
        if (first) clientSetPlant(first.id);
      }
      window.dispatchEvent(new Event(SCOPE_CHANGE_EVENT));
    },
    [],
  );

  const value = useMemo<ScopeContextValue>(
    () => ({
      division,
      divisionInfo: division === "all" ? null : DIVISIONS[division],
      setDivision,
      plant,
      plantInfo: PLANTS[plant],
      setPlant,
      visiblePlants: plantsInDivision(division),
    }),
    [division, plant, setDivision, setPlant],
  );

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) {
    throw new Error("useScope must be used within a ScopeProvider");
  }
  return ctx;
}

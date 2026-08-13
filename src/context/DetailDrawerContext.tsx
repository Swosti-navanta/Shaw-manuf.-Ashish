"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DetailKind } from "@/types/run";

export interface DetailTarget {
  kind: DetailKind;
  id: string;
}

interface DetailDrawerContextValue {
  target: DetailTarget | null;
  open: (kind: DetailKind, id: string) => void;
  close: () => void;
}

const DetailDrawerContext = createContext<DetailDrawerContextValue | undefined>(undefined);

/**
 * One drawer for the whole portal. Every identifier the engine touches —
 * a roll, a dye lot, an order, a claim, the machine — is a link into it, so
 * "why did it say that" is always one click from wherever the claim appears.
 */
export function DetailDrawerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<DetailTarget | null>(null);

  const open = useCallback((kind: DetailKind, id: string) => setTarget({ kind, id }), []);
  const close = useCallback(() => setTarget(null), []);

  const value = useMemo(() => ({ target, open, close }), [target, open, close]);

  return (
    <DetailDrawerContext.Provider value={value}>{children}</DetailDrawerContext.Provider>
  );
}

export function useDetailDrawer(): DetailDrawerContextValue {
  const ctx = useContext(DetailDrawerContext);
  if (!ctx) {
    throw new Error("useDetailDrawer must be used within a DetailDrawerProvider");
  }
  return ctx;
}

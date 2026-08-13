"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { APPROVALS, type ApprovalState } from "@/types/yarn";

interface YarnContextValue {
  /** What a person has done with each approval, keyed by approval id.
   *  Absent means still pending. */
  states: ReadonlyMap<string, ApprovalState>;
  approve: (id: string) => void;
  /** Sends it back to Sable rather than signing it. Distinct from undo: a
   *  return is a decision with a reason, an undo is a correction. */
  returnToAgent: (id: string, reason: string) => void;
  /** Why an approval was returned, for the row and the deck. */
  reasons: ReadonlyMap<string, string>;
  reset: (id: string) => void;
  /** Approvals still waiting. Drives the nav badge and the inbox count. */
  pendingApprovals: number;
}

const YarnContext = createContext<YarnContextValue | undefined>(undefined);

/**
 * Sable's state.
 *
 * Nothing here auto-resolves, and that is deliberate rather than unfinished.
 * Every other agent in the product can settle work inside a limit; Sable
 * proposes recipes and run orders that commit fibre and tank time before any
 * product exists to inspect. There is no reading that would make signing one
 * of those safe to automate, so the Thresholds dial has no row for it.
 */
export function YarnProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Map<string, ApprovalState>>(new Map());
  const [reasons, setReasons] = useState<Map<string, string>>(new Map());

  const approve = useCallback((id: string) => {
    setStates((cur) => new Map(cur).set(id, "approved"));
  }, []);

  const returnToAgent = useCallback((id: string, reason: string) => {
    setStates((cur) => new Map(cur).set(id, "returned"));
    setReasons((cur) => new Map(cur).set(id, reason));
  }, []);

  const reset = useCallback((id: string) => {
    setStates((cur) => {
      const next = new Map(cur);
      next.delete(id);
      return next;
    });
    setReasons((cur) => {
      const next = new Map(cur);
      next.delete(id);
      return next;
    });
  }, []);

  const pendingApprovals = useMemo(
    () => APPROVALS.filter((a) => !states.has(a.id)).length,
    [states],
  );

  const value = useMemo<YarnContextValue>(
    () => ({ states, approve, returnToAgent, reasons, reset, pendingApprovals }),
    [states, approve, returnToAgent, reasons, reset, pendingApprovals],
  );

  return <YarnContext.Provider value={value}>{children}</YarnContext.Provider>;
}

export function useYarn(): YarnContextValue {
  const ctx = useContext(YarnContext);
  if (!ctx) {
    throw new Error("useYarn must be used within a YarnProvider");
  }
  return ctx;
}

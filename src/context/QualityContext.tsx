"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CLAIMS_QUEUE, ROLLS, type Grade } from "@/types/quality";
import { QUALITY_RULE } from "@/types/schedule";
import { useSchedule } from "@/context/ScheduleContext";

interface QualityContextValue {
  /** Grades a person has set this shift, keyed by roll id. */
  grades: ReadonlyMap<string, Grade>;
  grade: (rollId: string, grade: Grade) => void;
  ungrade: (rollId: string) => void;
  /** Rolls still waiting on a person. Drives the nav badge. */
  pendingRolls: number;

  /** Claim ids whose finding has been sent upstream. */
  sentFindings: ReadonlySet<string>;
  /** Sends the pattern to Sawyer — this is what writes the rule into the
   *  constraint model, so it goes through the schedule store rather than
   *  being asserted locally. */
  sendFinding: (claimId: string) => void;
}

const QualityContext = createContext<QualityContextValue | undefined>(undefined);

/**
 * Wren's state. Deliberately above both quality surfaces: the grade set on
 * the inspection page and the finding sent from the claims page are the two
 * halves of the same loop, and the finding's effect lands in Sawyer's rules.
 */
export function QualityProvider({ children }: { children: ReactNode }) {
  const { addRule } = useSchedule();
  const [grades, setGrades] = useState<Map<string, Grade>>(new Map());
  const [sentFindings, setSentFindings] = useState<Set<string>>(new Set());

  const grade = useCallback((rollId: string, g: Grade) => {
    setGrades((cur) => new Map(cur).set(rollId, g));
  }, []);

  const ungrade = useCallback((rollId: string) => {
    setGrades((cur) => {
      const next = new Map(cur);
      next.delete(rollId);
      return next;
    });
  }, []);

  const sendFinding = useCallback(
    (claimId: string) => {
      setSentFindings((cur) => new Set(cur).add(claimId));
      // The whole point of the loop: a grading problem becomes a scheduling
      // rule, without anyone writing a policy document.
      addRule(QUALITY_RULE);
    },
    [addRule],
  );

  const pendingRolls = useMemo(
    () => ROLLS.filter((r) => !r.graded && !grades.has(r.id)).length,
    [grades],
  );

  const value = useMemo<QualityContextValue>(
    () => ({ grades, grade, ungrade, pendingRolls, sentFindings, sendFinding }),
    [grades, grade, ungrade, pendingRolls, sentFindings, sendFinding],
  );

  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}

export function useQuality(): QualityContextValue {
  const ctx = useContext(QualityContext);
  if (!ctx) {
    throw new Error("useQuality must be used within a QualityProvider");
  }
  return ctx;
}

/** Claims with their sent-state resolved, for the claims queue. */
export function useClaims() {
  const { sentFindings } = useQuality();
  return useMemo(
    () => CLAIMS_QUEUE.map((c) => ({ ...c, sent: sentFindings.has(c.id) })),
    [sentFindings],
  );
}

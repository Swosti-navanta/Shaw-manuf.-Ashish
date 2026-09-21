"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { FindingId, HistoryEvent } from "@/data/pcard-statements";

/**
 * The auditor's decisions, and the one modal they're made in.
 *
 * Decisions are the only state the prototype mutates: which findings Carol
 * confirmed or dismissed (and why), which statements she returned or
 * completed. Everything else — transactions, documents, the agent's proposals
 * — is seed and stays read-only. Persisted to localStorage so a refresh
 * doesn't erase a morning's work. Read through `useSyncExternalStore`, the
 * same way the persona cookie is: the server renders the empty store, the
 * client subscribes to it, and the two agree on the first paint without a
 * hydration effect.
 *
 * Every mutation writes a history event. That is the audit trail the spec
 * asks for: who did what, when, why and from what evidence.
 */

export type DismissReason =
  | "Correct as entered"
  | "Threshold too tight"
  | "Duplicate finding"
  | "Policy does not apply"
  | "Supporting evidence found elsewhere"
  | "Reviewed and supported"
  | "Something else";

export const DISMISS_REASONS: ReadonlyArray<DismissReason> = [
  "Correct as entered",
  "Threshold too tight",
  "Duplicate finding",
  "Policy does not apply",
  "Supporting evidence found elsewhere",
  "Reviewed and supported",
  "Something else",
];

export type FindingDecision =
  | { kind: "confirmed"; at: string }
  | { kind: "dismissed"; reason: DismissReason; note?: string; at: string };

export type StatementOutcome = "returned" | "completed_with_finding" | "completed_no_finding";

interface StatementRecord {
  decisions: Partial<Record<FindingId, FindingDecision>>;
  outcome?: { kind: StatementOutcome; at: string };
  /** Events the auditor's actions appended, after the seed history. */
  events: HistoryEvent[];
}

interface PcardState {
  statements: Record<string, StatementRecord>;
}

interface PcardContextValue {
  /** The statement open in the review modal, if any. */
  openId: string | null;
  openStatement: (id: string) => void;
  closeStatement: () => void;

  record: (id: string) => StatementRecord;
  decision: (id: string, finding: FindingId) => FindingDecision | undefined;
  confirmFinding: (id: string, finding: FindingId, evidence: string) => void;
  dismissFinding: (id: string, finding: FindingId, reason: DismissReason, note?: string) => void;
  undoDecision: (id: string, finding: FindingId) => void;
  returnStatement: (id: string, requested: string) => void;
  completeAudit: (id: string, withFinding: boolean) => void;

  toast: string | null;
  /** Development-only: wipe every decision. Lives in Settings, not the UI. */
  resetDemo: () => void;
}

const KEY = "shaw.pcard.decisions.v1";
const AUDITOR = "C. Nance";
const CHANGE = "shaw:pcard-change";

const EMPTY_STATE: PcardState = { statements: {} };

/* localStorage as an external store. Reads are memoised on the raw string so
   a re-render doesn't hand React a fresh object for unchanged data — that is
   what would make `useSyncExternalStore` loop. */
let cachedRaw: string | null | undefined;
let cachedState: PcardState = EMPTY_STATE;

function readStore(): PcardState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* blocked store reads as empty */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedState = raw ? (JSON.parse(raw) as PcardState) : EMPTY_STATE;
    } catch {
      cachedState = EMPTY_STATE; // a corrupt store just means a fresh demo
    }
  }
  return cachedState;
}

function writeStore(next: PcardState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode etc. — the session still works, it just won't survive */
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(notify: () => void) {
  window.addEventListener(CHANGE, notify);
  window.addEventListener("storage", notify); // another tab deciding
  return () => {
    window.removeEventListener(CHANGE, notify);
    window.removeEventListener("storage", notify);
  };
}

const PcardContext = createContext<PcardContextValue | undefined>(undefined);

const EMPTY: StatementRecord = { decisions: {}, events: [] };

function stamp(): string {
  const d = new Date();
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, " ");
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function PcardProvider({ children }: { children: ReactNode }) {
  // The server has no store, so it renders empty; the client reads the real
  // one. Both paths return the same object for the same contents.
  const state = useSyncExternalStore(subscribe, readStore, () => EMPTY_STATE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Escape closes the modal — the topmost dialog, per the contract.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  const record = useCallback((id: string) => state.statements[id] ?? EMPTY, [state]);

  const mutate = useCallback(
    (id: string, fn: (r: StatementRecord) => StatementRecord, message: string) => {
      const cur = readStore();
      writeStore({ statements: { ...cur.statements, [id]: fn(cur.statements[id] ?? EMPTY) } });
      setToast(message);
    },
    [],
  );

  const confirmFinding = useCallback(
    (id: string, finding: FindingId, evidence: string) =>
      mutate(
        id,
        (r) => ({
          ...r,
          decisions: { ...r.decisions, [finding]: { kind: "confirmed", at: stamp() } },
          events: [
            ...r.events,
            { event: `${finding} confirmed`, actor: AUDITOR, at: stamp(), result: `Recorded · ${evidence}` },
          ],
        }),
        `${finding} confirmed and recorded`,
      ),
    [mutate],
  );

  const dismissFinding = useCallback(
    (id: string, finding: FindingId, reason: DismissReason, note?: string) =>
      mutate(
        id,
        (r) => ({
          ...r,
          decisions: { ...r.decisions, [finding]: { kind: "dismissed", reason, note, at: stamp() } },
          events: [
            ...r.events,
            {
              event: `${finding} dismissed`,
              actor: AUDITOR,
              at: stamp(),
              result: `${reason}${note ? ` · ${note}` : ""} · rule precision updated`,
            },
          ],
        }),
        `${finding} dismissed · ${reason}`,
      ),
    [mutate],
  );

  const undoDecision = useCallback(
    (id: string, finding: FindingId) =>
      mutate(
        id,
        (r) => {
          const decisions = { ...r.decisions };
          delete decisions[finding];
          return {
            ...r,
            decisions,
            events: [...r.events, { event: `${finding} reopened`, actor: AUDITOR, at: stamp(), result: "Decision withdrawn" }],
          };
        },
        `${finding} reopened`,
      ),
    [mutate],
  );

  const returnStatement = useCallback(
    (id: string, requested: string) =>
      mutate(
        id,
        (r) => ({
          ...r,
          outcome: { kind: "returned", at: stamp() },
          events: [
            ...r.events,
            { event: "Statement returned", actor: AUDITOR, at: stamp(), result: `To cardholder · ${requested}` },
          ],
        }),
        "Statement returned to cardholder",
      ),
    [mutate],
  );

  const completeAudit = useCallback(
    (id: string, withFinding: boolean) =>
      mutate(
        id,
        (r) => ({
          ...r,
          outcome: { kind: withFinding ? "completed_with_finding" : "completed_no_finding", at: stamp() },
          events: [
            ...r.events,
            {
              event: "Audit completed",
              actor: AUDITOR,
              at: stamp(),
              result: withFinding ? "Completed · with finding" : "Completed · no finding",
            },
          ],
        }),
        withFinding ? "Audit completed · with finding" : "Audit completed · no finding",
      ),
    [mutate],
  );

  const resetDemo = useCallback(() => {
    writeStore(EMPTY_STATE);
    setToast("Demo data reset");
  }, []);

  const value = useMemo<PcardContextValue>(
    () => ({
      openId,
      openStatement: setOpenId,
      closeStatement: () => setOpenId(null),
      record,
      decision: (id, f) => record(id).decisions[f],
      confirmFinding,
      dismissFinding,
      undoDecision,
      returnStatement,
      completeAudit,
      toast,
      resetDemo,
    }),
    [openId, record, confirmFinding, dismissFinding, undoDecision, returnStatement, completeAudit, toast, resetDemo],
  );

  return <PcardContext.Provider value={value}>{children}</PcardContext.Provider>;
}

export function usePcard(): PcardContextValue {
  const ctx = useContext(PcardContext);
  if (!ctx) throw new Error("usePcard must be used within a PcardProvider");
  return ctx;
}

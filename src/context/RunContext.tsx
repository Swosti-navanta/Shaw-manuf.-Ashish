"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FEED_AUTO_TAIL,
  FEED_BASE,
  OPTIONS,
  decisionFeed,
} from "@/data/run-data";
import type { FeedEvent, OptionId } from "@/types/run";
import { useThresholds } from "@/context/ThresholdContext";

/** How today's deviation currently stands. */
export type RunStatus =
  /** Rowan prepared the options and escalated — waiting on a person. */
  | "open"
  /** The plant's dial had re-sequencing at Auto; Rowan resolved it itself. */
  | "auto"
  /** A person accepted an option. */
  | "decided";

interface RunContextValue {
  status: RunStatus;
  /** Which option was accepted, when status is "decided". */
  decision: OptionId | null;
  /** The feed as it should render right now, for the current status. */
  feed: ReadonlyArray<FeedEvent>;
  /** Indices in `feed` added by the last action — animated in. */
  freshIndices: ReadonlySet<number>;
  /** How many decisions on this run still need a person. Drives the nav badge. */
  pendingCount: number;
  /** Which option the band is currently showing. Shared rather than local so
   *  the deck's cost-breakdown tab describes the option you're looking at. */
  selectedOption: OptionId;
  selectOption: (id: OptionId) => void;
  /** The maintenance work order, once a person has raised it. Nothing else
   *  owns this action, so it commits here rather than routing away. */
  workOrderRaised: boolean;
  raiseWorkOrder: () => void;
  undoWorkOrder: () => void;
  accept: (option: OptionId) => void;
  undo: () => void;
}

const RunContext = createContext<RunContextValue | undefined>(undefined);

/**
 * The state of today's deviation. It lives above the page because the
 * decision is not Make's alone: accepting an option is what Sawyer rebuilds
 * the sequence from, and Sable's whole/split status follows it too. Keeping
 * it here means those pages read one source of truth instead of re-deriving.
 */
export function RunProvider({ children }: { children: ReactNode }) {
  const { modeFor } = useThresholds();
  const [decision, setDecision] = useState<OptionId | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionId>(
    (Object.keys(OPTIONS) as OptionId[]).find((id) => OPTIONS[id].recommended) ?? "A",
  );
  const [extraFeed, setExtraFeed] = useState<FeedEvent[]>([]);
  const [workOrderRaised, setWorkOrderRaised] = useState(false);

  // The dial decides whether this ever reaches a person. At Auto, Rowan
  // re-sequences inside the limit and the last two escalation entries are
  // replaced by a single automated one.
  const autoResolved = modeFor("reseq") === "auto";
  const status: RunStatus = decision ? "decided" : autoResolved ? "auto" : "open";

  const feed = useMemo<FeedEvent[]>(() => {
    if (decision) return [...FEED_BASE, ...extraFeed];
    if (autoResolved) return [...FEED_BASE.slice(0, 5), FEED_AUTO_TAIL];
    return [...FEED_BASE];
  }, [decision, autoResolved, extraFeed]);

  const freshIndices = useMemo(() => {
    if (!decision || extraFeed.length === 0) return new Set<number>();
    const start = feed.length - extraFeed.length;
    return new Set(extraFeed.map((_, i) => start + i));
  }, [decision, extraFeed, feed.length]);

  const accept = useCallback((option: OptionId) => {
    setDecision(option);
    setExtraFeed(decisionFeed(OPTIONS[option].title));
  }, []);

  const undo = useCallback(() => {
    setDecision(null);
    setExtraFeed([]);
  }, []);

  const selectOption = useCallback((id: OptionId) => setSelectedOption(id), []);
  const raiseWorkOrder = useCallback(() => setWorkOrderRaised(true), []);
  const undoWorkOrder = useCallback(() => setWorkOrderRaised(false), []);

  const value = useMemo<RunContextValue>(
    () => ({
      status,
      decision,
      feed,
      freshIndices,
      pendingCount: status === "open" ? 1 : 0,
      selectedOption,
      selectOption,
      workOrderRaised,
      raiseWorkOrder,
      undoWorkOrder,
      accept,
      undo,
    }),
    [
      status, decision, feed, freshIndices, selectedOption, selectOption,
      workOrderRaised, raiseWorkOrder, undoWorkOrder, accept, undo,
    ],
  );

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}

export function useRun(): RunContextValue {
  const ctx = useContext(RunContext);
  if (!ctx) {
    throw new Error("useRun must be used within a RunProvider");
  }
  return ctx;
}

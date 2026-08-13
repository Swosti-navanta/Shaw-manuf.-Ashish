"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlantId } from "@/types/division";
import {
  DEFAULT_THRESHOLDS,
  type PlantThresholds,
  type ThresholdKey,
  type ThresholdMode,
} from "@/types/threshold";
import { useScope } from "@/context/ScopeContext";

interface ThresholdContextValue {
  /** The dial for the plant currently in scope. */
  thresholds: PlantThresholds;
  /** How a given decision type is handled at the plant in scope. */
  modeFor: (key: ThresholdKey) => ThresholdMode;
  setMode: (key: ThresholdKey, mode: ThresholdMode) => void;
  /** Read another plant's dial — the VP's Thresholds page lists them all. */
  thresholdsFor: (plant: PlantId) => PlantThresholds;
  setModeFor: (plant: PlantId, key: ThresholdKey, mode: ThresholdMode) => void;
}

const ThresholdContext = createContext<ThresholdContextValue | undefined>(undefined);

/**
 * In-memory for the demo: the dial resets on reload, which is what you want
 * when showing it — flip a row to Auto, watch Make resolve itself, reload and
 * you're back to the story. Swap the useState for a persisted store when this
 * needs to survive a session.
 */
export function ThresholdProvider({ children }: { children: ReactNode }) {
  const { plant } = useScope();
  const [byPlant, setByPlant] = useState<Record<PlantId, PlantThresholds>>(
    () => structuredClone(DEFAULT_THRESHOLDS),
  );

  const setModeFor = useCallback(
    (target: PlantId, key: ThresholdKey, mode: ThresholdMode) => {
      setByPlant((prev) => ({ ...prev, [target]: { ...prev[target], [key]: mode } }));
    },
    [],
  );

  const setMode = useCallback(
    (key: ThresholdKey, mode: ThresholdMode) => setModeFor(plant, key, mode),
    [plant, setModeFor],
  );

  const value = useMemo<ThresholdContextValue>(() => {
    const thresholds = byPlant[plant];
    return {
      thresholds,
      modeFor: (key) => thresholds[key],
      setMode,
      thresholdsFor: (target) => byPlant[target],
      setModeFor,
    };
  }, [byPlant, plant, setMode, setModeFor]);

  return <ThresholdContext.Provider value={value}>{children}</ThresholdContext.Provider>;
}

export function useThresholds(): ThresholdContextValue {
  const ctx = useContext(ThresholdContext);
  if (!ctx) {
    throw new Error("useThresholds must be used within a ThresholdProvider");
  }
  return ctx;
}

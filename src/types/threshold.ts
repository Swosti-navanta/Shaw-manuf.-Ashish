// The dial. Same engine at every plant; each plant sets its own limits, and
// that setting is what decides whether a decision reaches a person at all.
//
// Make (Rowan) reads `reseq`: at Ask it prepares three costed options and
// escalates; at Auto it re-sequences itself and nobody is interrupted. That
// single switch is the argument for the whole product, so it lives here
// rather than inside a page.

import type { PlantId } from "@/types/division";
import type { Lane } from "@/types/run";

export type ThresholdMode = "auto" | "limit" | "ask";

/** The mode maps 1:1 onto the lane a decision ends up in. */
export const MODE_LANE: Record<ThresholdMode, Lane> = {
  auto: "auto",
  limit: "limit",
  ask: "person",
};

export const MODE_LABEL: Record<ThresholdMode, string> = {
  auto: "Auto",
  limit: "Limit",
  ask: "Ask",
};

export type ThresholdKey =
  | "reseq"
  | "grade2"
  | "split"
  | "expedite"
  | "drift"
  | "grade"
  | "report"
  | "workorder";

export interface ThresholdRow {
  key: ThresholdKey;
  label: string;
  sub: string;
  /** Wired rows actually change what the app does. The rest are shown so the
   *  dial reads as a real surface, not a two-row demo. */
  wired?: boolean;
}

export const THRESHOLD_ROWS: ReadonlyArray<ThresholdRow> = [
  { key: "reseq", label: "Re-sequence where a promised date moves", sub: "Reorder runs when a customer date is at risk", wired: true },
  { key: "grade2", label: "Grade a borderline or repeat fault", sub: "Decide the grade on a marginal roll", wired: true },
  { key: "split", label: "Split a dye lot to hold a date", sub: "Break a shade-critical lot across dye runs" },
  { key: "expedite", label: "Add overtime to recover a date", sub: "Schedule a weekend or extra shift" },
  { key: "drift", label: "Log drift inside the alert band", sub: "Rate wobble within ±8% of plan" },
  { key: "grade", label: "Grade a clear pass", sub: "First-quality rolls with no flags" },
  { key: "report", label: "Publish shift & downtime reports", sub: "Assemble and send the standing reports" },
  { key: "workorder", label: "Create a maintenance work order", sub: "Open a work order from a machine signal" },
];

export type PlantThresholds = Record<ThresholdKey, ThresholdMode>;

/** Deliberately different per plant — switching plants should visibly change
 *  the dial, because that's the point of setting it per plant. */
// The demo plant's dial is the contested one — several calls still set to
// "ask" — so widening a limit visibly changes what the engine settles alone.
const CONTESTED: PlantThresholds = {
  reseq: "ask", grade2: "ask", split: "ask", expedite: "limit",
  drift: "auto", grade: "auto", report: "auto", workorder: "limit",
};
const STEADY: PlantThresholds = {
  reseq: "auto", grade2: "limit", split: "ask", expedite: "auto",
  drift: "auto", grade: "auto", report: "auto", workorder: "auto",
};

export const DEFAULT_THRESHOLDS: Record<PlantId, PlantThresholds> = {
  p04: { ...CONTESTED },
  p07: { ...STEADY, reseq: "limit" },
  p15: { ...CONTESTED, expedite: "ask" },
};

export function thresholdLabel(key: ThresholdKey): string {
  return THRESHOLD_ROWS.find((r) => r.key === key)?.label ?? key;
}

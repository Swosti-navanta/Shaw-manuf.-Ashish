// P-Card audit — the seed the portal's second experience runs on.
//
// This is the indirect-procurement audit, not the plant: every P-Card
// statement is evaluated, the ones that pass every configured check clear on
// their own, and only exceptions or selected samples reach a person. The
// person is Carol Nance, the P-Card Auditor. The agent recommends, drafts and
// prepares; she owns every consequential decision.
//
// Illustrative fixtures, shaped so Concur / the receipt store / the policy
// tables can each replace a block without the screens changing. All names,
// statements and amounts are fictional.

export type Severity = "Major" | "Minor";

/** Finding states: proposed → confirmed | dismissed; confirmed → corrected | retained. */
export type FindingState = "Proposed" | "Confirmed" | "Dismissed" | "Corrected" | "Retained";

/** Where a statement sits in the cycle. */
export type WorkflowState =
  | "Needs review"
  | "Awaiting cardholder"
  | "Awaiting manager"
  | "Ready for re-audit"
  | "Auto-cleared"
  | "Completed · no finding"
  | "Completed · with finding";

/* ── Command Center ────────────────────────────────────────────────────── */

export interface PcardKpi {
  key: string;
  label: string;
  value: string;
  detail: string;
  /** Red when the figure is the thing needing a person. */
  alert?: boolean;
  /** Where the card routes. Null until that surface is built. */
  href: string | null;
}

/** The four numbers the cycle opens with. Review-by-exception is the story:
 *  1,284 in, 18 to a person. */
export const PCARD_KPIS: ReadonlyArray<PcardKpi> = [
  {
    key: "evaluated",
    label: "Statements evaluated",
    value: "1,284",
    detail: "Every submitted statement",
    href: "/p-card/records?tab=all",
  },
  {
    key: "review",
    label: "Need human review",
    value: "18",
    detail: "7 major · 11 minor",
    alert: true,
    href: "/p-card/actions?tab=needs-review",
  },
  {
    key: "cleared",
    label: "Auto-cleared",
    value: "1,236",
    detail: "96.3% required no human touch",
    href: "/p-card/records?tab=auto-cleared",
  },
  {
    key: "returned",
    label: "Returned / re-audit",
    value: "12",
    detail: "8 waiting · 4 ready",
    href: "/p-card/actions?tab=returned",
  },
];

export interface PriorityReview {
  statement: string;
  cardholder: string;
  trigger: string;
  severity: Severity;
  exposure: string;
}

/** Ranked for the auditor's first hour. Exposure is the amount at issue,
 *  not the statement total. */
export const PRIORITY_REVIEWS: ReadonlyArray<PriorityReview> = [
  { statement: "PC-0826-0042", cardholder: "M. Alvarez", trigger: "3 missing receipts", severity: "Major", exposure: "$4,180" },
  { statement: "PC-0726-0192", cardholder: "S. Park", trigger: "Non-business expense", severity: "Major", exposure: "$840" },
  { statement: "PC-0826-0064", cardholder: "A. Gbeho", trigger: "Event approval missing", severity: "Minor", exposure: "$4,200" },
  { statement: "PC-0826-0051", cardholder: "R. D'Souza", trigger: "Meal $204/person", severity: "Minor", exposure: "$612" },
];

export interface ReturnedItem {
  statement: string;
  cardholder: string;
  state: WorkflowState;
  since: string;
  next: string;
}

export const RETURNED_ITEMS: ReadonlyArray<ReturnedItem> = [
  { statement: "PC-0826-0019", cardholder: "J. Whitaker", state: "Awaiting cardholder", since: "4d", next: "Receipts for lines 2, 9" },
  { statement: "PC-0726-0203", cardholder: "L. Chen", state: "Awaiting manager", since: "2d", next: "Reapproval · K. Doyle" },
  { statement: "PC-0726-0177", cardholder: "T. Nguyen", state: "Ready for re-audit", since: "1d", next: "Re-audit" },
  { statement: "PC-0726-0158", cardholder: "P. Romero", state: "Ready for re-audit", since: "6h", next: "Re-audit" },
];

export interface FindingCategory {
  category: string;
  confirmed: number;
  share: string;
  trend: "up" | "down" | "flat";
}

export const FINDINGS_THIS_CYCLE: ReadonlyArray<FindingCategory> = [
  { category: "Missing receipt", confirmed: 14, share: "41%", trend: "up" },
  { category: "Business purpose inadequate", confirmed: 8, share: "24%", trend: "flat" },
  { category: "Meal / attendee policy", confirmed: 5, share: "15%", trend: "down" },
  { category: "Event approval", confirmed: 4, share: "12%", trend: "up" },
  { category: "Tax anomaly", confirmed: 3, share: "9%", trend: "flat" },
];

export interface RulePerformance {
  rule: string;
  fired: number;
  confirmRate: string;
  /** Below the precision floor, the rule is interrupting people for nothing. */
  state: "Healthy" | "Watch" | "Below floor";
}

export const RULE_PERFORMANCE: ReadonlyArray<RulePerformance> = [
  { rule: "Receipt missing", fired: 41, confirmRate: "88%", state: "Healthy" },
  { rule: "Justification blank", fired: 22, confirmRate: "73%", state: "Healthy" },
  { rule: "Meal per head", fired: 17, confirmRate: "47%", state: "Watch" },
  { rule: "Tax magnitude", fired: 12, confirmRate: "31%", state: "Below floor" },
  { rule: "Recurring amount drift", fired: 9, confirmRate: "56%", state: "Watch" },
];

/* ── Action Center ─────────────────────────────────────────────────────── */

export type ActionTab = "needs-review" | "returned" | "ready";

export const ACTION_TABS: ReadonlyArray<{ id: ActionTab; label: string; count: number }> = [
  { id: "needs-review", label: "Needs review", count: 18 },
  { id: "returned", label: "Returned", count: 8 },
  { id: "ready", label: "Ready for re-audit", count: 4 },
];

export interface NeedsReviewRow {
  statement: string;
  cardholder: string;
  plantDept: string;
  whySelected: string;
  open: number;
  severity: Severity;
  total: string;
  age: string;
}

export const NEEDS_REVIEW: ReadonlyArray<NeedsReviewRow> = [
  { statement: "PC-0826-0042", cardholder: "M. Alvarez", plantDept: "Plant 04 / Coating", whySelected: "Rule exceptions", open: 2, severity: "Major", total: "$8,940", age: "3d" },
  { statement: "PC-0826-0051", cardholder: "R. D'Souza", plantDept: "Plant 07 / Sales", whySelected: "Meal and tip", open: 2, severity: "Minor", total: "$4,260", age: "2d" },
  { statement: "PC-0726-0192", cardholder: "S. Park", plantDept: "Plant 07 / Production", whySelected: "Non-business", open: 1, severity: "Major", total: "$1,940", age: "5d" },
  { statement: "PC-0826-0064", cardholder: "A. Gbeho", plantDept: "Plant 15 / HR", whySelected: "Event policy", open: 1, severity: "Minor", total: "$6,890", age: "1d" },
  { statement: "PC-0826-0083", cardholder: "D. Okafor", plantDept: "Plant 11 / Maintenance", whySelected: "Tax anomaly", open: 1, severity: "Minor", total: "$2,050", age: "1d" },
  { statement: "PC-0826-0077", cardholder: "A. Moreau", plantDept: "Plant 11 / Quality", whySelected: "Recurring charge", open: 2, severity: "Minor", total: "$4,220", age: "4d" },
];

export interface ReturnedRow {
  statement: string;
  cardholder: string;
  returned: string;
  lastFinding: string;
  state: WorkflowState;
  age: string;
  owner: string;
}

export const RETURNED_ROWS: ReadonlyArray<ReturnedRow> = [
  { statement: "PC-0826-0019", cardholder: "J. Whitaker", returned: "14 Sep 2026", lastFinding: "Missing receipts · lines 2, 9", state: "Awaiting cardholder", age: "4d", owner: "Cardholder" },
  { statement: "PC-0726-0203", cardholder: "L. Chen", returned: "16 Sep 2026", lastFinding: "Business purpose · line 5", state: "Awaiting manager", age: "2d", owner: "K. Doyle" },
  { statement: "PC-0826-0031", cardholder: "H. Baptiste", returned: "12 Sep 2026", lastFinding: "Attendee list missing", state: "Awaiting cardholder", age: "6d", owner: "Cardholder" },
];

export interface ReadyRow {
  statement: string;
  cardholder: string;
  originalFinding: string;
  correction: string;
  reapproved: string;
  change: string;
}

export const READY_ROWS: ReadonlyArray<ReadyRow> = [
  { statement: "PC-0726-0177", cardholder: "T. Nguyen", originalFinding: "Missing receipt · line 4", correction: "Receipt attached", reapproved: "17 Sep 2026", change: "1 document added" },
  { statement: "PC-0726-0158", cardholder: "P. Romero", originalFinding: "Business purpose · line 2", correction: "Purpose rewritten", reapproved: "18 Sep 2026", change: "1 field edited" },
];

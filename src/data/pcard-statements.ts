// The statement — P-Card's one work object. Transactions, findings, evidence,
// documents and history live inside it; nothing about a statement floats on a
// page on its own. PC-0826-0042 is authored in full (the hero the spec walks
// through); the rest carry enough to open, read and decide.
//
// Nothing here is a verdict. A finding is *proposed* until a person confirms
// or dismisses it, and the copy never calls one a violation before that.

import type { Severity } from "@/data/pcard";

export type FindingId = "F-01" | "F-02";

export interface Finding {
  id: FindingId;
  /** What the check found, stated as a proposal. */
  proposed: string;
  category: string;
  /** The transaction evidence — lines, amounts — the finding rests on. */
  evidence: string;
  policy: string;
  severity: Severity;
  /** The agent's suggested root cause, offered for the confirm step. */
  rootCause: string;
  affected: string;
  /** Anything the agent could not establish. Shown, never hidden. */
  uncertainty?: string;
  /** The lines it touches, for the transaction table to flag. */
  lines: ReadonlyArray<number>;
}

export type CheckResult = "Passed" | "No receipt" | "Purpose inadequate" | "Flagged";

export interface Transaction {
  line: number;
  merchant: string;
  date: string;
  type: string;
  purpose: string;
  amount: string;
  tax: string;
  receipt: "Attached" | "Missing";
  attendees?: string;
  result: CheckResult;
}

export interface StatementDocument {
  name: string;
  line: number | null;
  date: string;
  type: string;
  extraction: "Extracted" | "Failed" | "—";
  /** Never a broken attachment: a receipt that isn't there says so. */
  availability: "Available" | "Missing";
}

export interface HistoryEvent {
  event: string;
  actor: string;
  at: string;
  result: string;
}

export interface Statement {
  id: string;
  cardholder: string;
  email: string;
  plantDept: string;
  cycle: string;
  total: string;
  transactionCount: number;
  approvedBy: string;
  approvedOn: string;
  /** The agent's opening read of the statement. */
  summary: string;
  findings: ReadonlyArray<Finding>;
  transactions: ReadonlyArray<Transaction>;
  documents: ReadonlyArray<StatementDocument>;
  /** What happened before the auditor opened it. Decisions append after. */
  history: ReadonlyArray<HistoryEvent>;
}

/* ── The hero ─────────────────────────────────────────────────────────────── */

const ALVAREZ: Statement = {
  id: "PC-0826-0042",
  cardholder: "M. Alvarez",
  email: "m.alvarez@example.internal",
  plantDept: "Plant 04 / Coating",
  cycle: "Aug 2026",
  total: "$8,940",
  transactionCount: 14,
  approvedBy: "K. Doyle",
  approvedOn: "12 Sep 2026",
  summary:
    "I evaluated 14 transactions and found two issues requiring your decision. Three transactions have no receipt, and one has an inadequate business purpose. The other 10 transactions passed all configured checks.",
  findings: [
    {
      id: "F-01",
      proposed: "Missing receipts",
      category: "Receipt coverage",
      evidence: "Lines 3, 8 and 11 · $2,410 + $1,180 + $590 · no document on file",
      policy: "P-Card Policy 4.2 — receipt required over $75",
      severity: "Major",
      rootCause: "Receipts not uploaded at reconciliation",
      affected: "$4,180",
      uncertainty:
        "I could not verify these receipts — none are in the document store. I have not assumed they don't exist.",
      lines: [3, 8, 11],
    },
    {
      id: "F-02",
      proposed: "Business purpose inadequate",
      category: "Business purpose",
      evidence: "Line 7 · W.W. Grainger · $840 · purpose reads “supplies”",
      policy: "P-Card Policy 3.1 — purpose must state what and why",
      severity: "Minor",
      rootCause: "Purpose field completed generically",
      affected: "$840",
      lines: [7],
    },
  ],
  transactions: [
    { line: 1, merchant: "Uline", date: "02 Aug 2026", type: "Supplies", purpose: "Pallet wrap for Coating line 2", amount: "$412", tax: "$29", receipt: "Attached", result: "Passed" },
    { line: 2, merchant: "McMaster-Carr", date: "03 Aug 2026", type: "Repairs", purpose: "Replacement rollers, coater head", amount: "$1,260", tax: "$88", receipt: "Attached", result: "Passed" },
    { line: 3, merchant: "Lowe's", date: "05 Aug 2026", type: "Repairs", purpose: "Coater enclosure repair materials", amount: "$2,410", tax: "$169", receipt: "Missing", result: "No receipt" },
    { line: 4, merchant: "Fastenal", date: "06 Aug 2026", type: "Tools", purpose: "Torque wrench set, maintenance", amount: "$318", tax: "$22", receipt: "Attached", result: "Passed" },
    { line: 5, merchant: "Grainger", date: "08 Aug 2026", type: "Safety", purpose: "Cut-resistant gloves, 40 pr", amount: "$264", tax: "$18", receipt: "Attached", result: "Passed" },
    { line: 6, merchant: "Amazon Business", date: "10 Aug 2026", type: "Supplies", purpose: "Label printer ribbons", amount: "$96", tax: "$7", receipt: "Attached", result: "Passed" },
    { line: 7, merchant: "W.W. Grainger", date: "12 Aug 2026", type: "Supplies", purpose: "supplies", amount: "$840", tax: "$59", receipt: "Attached", result: "Purpose inadequate" },
    { line: 8, merchant: "Grainger", date: "14 Aug 2026", type: "Repairs", purpose: "Drive belt, coater feed", amount: "$1,180", tax: "$83", receipt: "Missing", result: "No receipt" },
    { line: 9, merchant: "Motion Industries", date: "15 Aug 2026", type: "Repairs", purpose: "Bearing, coater idler", amount: "$488", tax: "$34", receipt: "Attached", result: "Passed" },
    { line: 10, merchant: "Staples", date: "18 Aug 2026", type: "Office", purpose: "Shift log binders", amount: "$72", tax: "$5", receipt: "Attached", result: "Passed" },
    { line: 11, merchant: "Fastenal", date: "20 Aug 2026", type: "Tools", purpose: "Hex key sets, line kits", amount: "$590", tax: "$41", receipt: "Missing", result: "No receipt" },
    { line: 12, merchant: "Cintas", date: "22 Aug 2026", type: "Services", purpose: "Shop towel service, Aug", amount: "$310", tax: "$0", receipt: "Attached", result: "Passed" },
    { line: 13, merchant: "Chick-fil-A", date: "25 Aug 2026", type: "Meals", purpose: "Shift changeover lunch, 6 crew", amount: "$118", tax: "$8", receipt: "Attached", attendees: "6", result: "Passed" },
    { line: 14, merchant: "Home Depot", date: "28 Aug 2026", type: "Supplies", purpose: "Floor marking tape, Coating", amount: "$582", tax: "$41", receipt: "Attached", result: "Passed" },
  ],
  documents: [
    { name: "Receipt · Uline · line 1", line: 1, date: "02 Aug 2026", type: "Receipt", extraction: "Extracted", availability: "Available" },
    { name: "Receipt · McMaster-Carr · line 2", line: 2, date: "03 Aug 2026", type: "Receipt", extraction: "Extracted", availability: "Available" },
    { name: "Receipt · Lowe's · line 3", line: 3, date: "—", type: "Receipt", extraction: "—", availability: "Missing" },
    { name: "Receipt · W.W. Grainger · line 7", line: 7, date: "12 Aug 2026", type: "Receipt", extraction: "Extracted", availability: "Available" },
    { name: "Receipt · Grainger · line 8", line: 8, date: "—", type: "Receipt", extraction: "—", availability: "Missing" },
    { name: "Receipt · Fastenal · line 11", line: 11, date: "—", type: "Receipt", extraction: "—", availability: "Missing" },
    { name: "Attendee list · line 13", line: 13, date: "25 Aug 2026", type: "Attendees", extraction: "Extracted", availability: "Available" },
    { name: "Statement · Aug 2026", line: null, date: "31 Aug 2026", type: "Statement", extraction: "Extracted", availability: "Available" },
  ],
  history: [
    { event: "Statement submitted", actor: "M. Alvarez", at: "31 Aug 2026 · 16:40", result: "14 transactions · $8,940" },
    { event: "Manager approved", actor: "K. Doyle", at: "12 Sep 2026 · 09:12", result: "Approved as submitted" },
    { event: "Agent evaluated", actor: "P-Card Audit Agent", at: "12 Sep 2026 · 09:14", result: "5 checks run · 10 passed" },
    { event: "Findings proposed", actor: "P-Card Audit Agent", at: "12 Sep 2026 · 09:14", result: "F-01 Major · F-02 Minor" },
    { event: "Routed for review", actor: "P-Card Audit Agent", at: "12 Sep 2026 · 09:14", result: "Needs review · C. Nance" },
  ],
};

/* ── The rest, from the queue rows ──────────────────────────────────────── */

/** Enough of a statement to open and decide, built off the row's own facts. */
function light(
  id: string,
  cardholder: string,
  plantDept: string,
  total: string,
  count: number,
  finding: Omit<Finding, "id" | "lines"> & { lines: ReadonlyArray<number> },
  second?: Omit<Finding, "id">,
): Statement {
  const findings: Finding[] = [{ id: "F-01", ...finding }];
  if (second) findings.push({ id: "F-02", ...second });
  const last = cardholder.split(" ").pop()?.toLowerCase() ?? "cardholder";
  return {
    id,
    cardholder,
    email: `${cardholder[0].toLowerCase()}.${last}@example.internal`,
    plantDept,
    cycle: id.startsWith("PC-07") ? "Jul 2026" : "Aug 2026",
    total,
    transactionCount: count,
    approvedBy: "K. Doyle",
    approvedOn: "12 Sep 2026",
    summary: `I evaluated ${count} transactions and found ${findings.length === 1 ? "one issue" : "two issues"} requiring your decision — ${findings.map((f) => f.proposed.toLowerCase()).join(", and ")}. The other ${count - findings.reduce((n, f) => n + f.lines.length, 0)} transactions passed all configured checks.`,
    findings,
    transactions: Array.from({ length: count }, (_, i) => {
      const line = i + 1;
      const hit = findings.find((f) => f.lines.includes(line));
      return {
        line,
        merchant: hit ? "See finding" : ["Grainger", "Uline", "Fastenal", "Staples", "Cintas"][i % 5],
        date: `${String(2 + i * 2).padStart(2, "0")} Aug 2026`,
        type: hit?.category ?? "Supplies",
        purpose: hit ? hit.evidence : "Routine operating purchase",
        amount: hit?.affected ?? "$" + (80 + i * 37).toLocaleString(),
        tax: "$" + Math.round((80 + i * 37) * 0.07),
        receipt: hit?.category === "Receipt coverage" ? "Missing" : "Attached",
        result: hit ? "Flagged" : "Passed",
      };
    }),
    documents: [
      { name: `Statement · ${id.startsWith("PC-07") ? "Jul" : "Aug"} 2026`, line: null, date: "31 Aug 2026", type: "Statement", extraction: "Extracted", availability: "Available" },
      ...findings.flatMap((f) =>
        f.lines.map<StatementDocument>((l) => ({
          name: `Receipt · line ${l}`,
          line: l,
          date: f.category === "Receipt coverage" ? "—" : "20 Aug 2026",
          type: "Receipt",
          extraction: f.category === "Receipt coverage" ? "—" : "Extracted",
          availability: f.category === "Receipt coverage" ? "Missing" : "Available",
        })),
      ),
    ],
    history: [
      { event: "Statement submitted", actor: cardholder, at: "31 Aug 2026 · 15:02", result: `${count} transactions · ${total}` },
      { event: "Manager approved", actor: "K. Doyle", at: "12 Sep 2026 · 09:20", result: "Approved as submitted" },
      { event: "Agent evaluated", actor: "P-Card Audit Agent", at: "12 Sep 2026 · 09:22", result: `5 checks run · ${count - findings.length} passed` },
      { event: "Findings proposed", actor: "P-Card Audit Agent", at: "12 Sep 2026 · 09:22", result: findings.map((f) => `${f.id} ${f.severity}`).join(" · ") },
      { event: "Routed for review", actor: "P-Card Audit Agent", at: "12 Sep 2026 · 09:22", result: "Needs review · C. Nance" },
    ],
  };
}

export const STATEMENTS: Record<string, Statement> = {
  "PC-0826-0042": ALVAREZ,
  "PC-0826-0051": light(
    "PC-0826-0051", "R. D'Souza", "Plant 07 / Sales", "$4,260", 9,
    { proposed: "Meal exceeds per-person limit", category: "Meals", evidence: "Line 4 · $612 · 3 attendees · $204/person", policy: "P-Card Policy 5.3 — $75 per person", severity: "Minor", rootCause: "Client dinner booked above limit", affected: "$612", lines: [4] },
    { proposed: "Tip unsupported", category: "Tips", evidence: "Line 4 · tip 28% · no itemised receipt", policy: "P-Card Policy 5.4 — tip ≤ 20%", severity: "Minor", rootCause: "Itemised receipt not attached", affected: "$134", lines: [4] },
  ),
  "PC-0726-0192": light(
    "PC-0726-0192", "S. Park", "Plant 07 / Production", "$1,940", 6,
    { proposed: "Non-business expense", category: "Classification", evidence: "Line 2 · Best Buy · $840 · personal electronics MCC", policy: "P-Card Policy 2.1 — business use only", severity: "Major", rootCause: "Card used in error", affected: "$840", uncertainty: "MCC indicates consumer electronics; I have not seen the receipt to confirm the item.", lines: [2] },
  ),
  "PC-0826-0064": light(
    "PC-0826-0064", "A. Gbeho", "Plant 15 / HR", "$6,890", 11,
    { proposed: "Event approval missing", category: "Events", evidence: "Line 6 · Marriott · $4,200 · team offsite · no pre-approval on file", policy: "P-Card Policy 6.1 — events over $2,500 need prior approval", severity: "Minor", rootCause: "Approval obtained verbally, not recorded", affected: "$4,200", lines: [6] },
  ),
  "PC-0826-0083": light(
    "PC-0826-0083", "D. Okafor", "Plant 11 / Maintenance", "$2,050", 7,
    { proposed: "Tax anomaly", category: "Tax", evidence: "Line 3 · $410 · tax 19% vs 7% expected", policy: "P-Card Policy 7.2 — tax within jurisdiction rate", severity: "Minor", rootCause: "Out-of-state vendor charged home rate", affected: "$49", uncertainty: "Could be a legitimate shipping surcharge coded as tax — the receipt line items would settle it.", lines: [3] },
  ),
  "PC-0826-0077": light(
    "PC-0826-0077", "A. Moreau", "Plant 11 / Quality", "$4,220", 8,
    { proposed: "Recurring amount drifted", category: "Recurring", evidence: "Line 1 · Minitab · $1,890 vs $1,240 prior 6 cycles", policy: "P-Card Policy 8.1 — recurring within ±10%", severity: "Minor", rootCause: "Licence tier changed without notice", affected: "$650", lines: [1] },
    { proposed: "Recurring document stale", category: "Recurring", evidence: "Line 1 · agreement on file dated 2024", policy: "P-Card Policy 8.2 — agreement refreshed annually", severity: "Minor", rootCause: "Renewal not re-filed", affected: "$1,890", lines: [1] },
  ),
};

export function getStatement(id: string): Statement | undefined {
  return STATEMENTS[id];
}

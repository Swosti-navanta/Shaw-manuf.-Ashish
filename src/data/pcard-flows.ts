// P-Card · agent runs. One per row action in the Action Center — Review,
// Check status, Re-audit. Each returns an AgentTask the chat panel narrates:
// a visible progress checklist, then an evidence-based result card, then the
// confirmation the auditor has to press before anything changes state.
//
// The agent recommends and prepares. It never finalises, returns or sends —
// every `action` label here is a confirmation, and the run says so in words.
// Where evidence is missing (a receipt that isn't there) the run says that
// too, rather than implying it was read.

import type { AgentTask } from "@/types/agent-task";
import type { NeedsReviewRow, ReadyRow, ReturnedRow } from "@/data/pcard";

const AGENT = "P-Card Audit Agent";

/**
 * Review a statement that needs a first decision. The checklist is the
 * spec's own five checks; the result card is the findings the checks raised.
 * Seed detail is authored for PC-0826-0042 (the hero) and generalised for the
 * rest off the row's own figures.
 */
export function reviewStatementTask(row: NeedsReviewRow): AgentTask {
  const hero = row.statement === "PC-0826-0042";
  const findings = hero
    ? [
        {
          label: "F-01 · Missing receipts",
          sub: "lines 3, 8, 11 · P-Card Policy 4.2",
          value: "Major",
          hot: true,
        },
        {
          label: "F-02 · Business purpose inadequate",
          sub: "line 7 reads “supplies” · Policy 3.1",
          value: "Minor",
        },
      ]
    : [
        {
          label: `F-01 · ${row.whySelected}`,
          sub: `${row.open === 1 ? "1 line" : `${row.open} lines`} · policy check fired`,
          value: row.severity,
          hot: row.severity === "Major",
        },
        ...(row.open > 1
          ? [{ label: "F-02 · Related exception", sub: "same statement · same cycle", value: "Minor" }]
          : []),
      ];

  return {
    id: `pcard-review-${row.statement}`,
    agent: AGENT,
    label: "Review statement",
    subject: `${row.statement} · ${row.cardholder} · ${row.plantDept}`,
    steps: [
      `Read the statement · ${hero ? 14 : Math.max(6, row.open * 5)} transactions`,
      "Checked receipt coverage against the threshold",
      "Checked classifications against merchant category",
      "Checked meals, attendees, tips, tax and recurring charges",
      "Compared every exception with policy",
    ],
    outcome: {
      summary: hero
        ? "I found two issues requiring your decision. Three transactions have no receipt, and one has an inadequate business purpose. The other 10 transactions passed all configured checks. I could not verify the missing receipts — they are not in the document store."
        : `I found ${row.open} ${row.open === 1 ? "issue" : "issues"} requiring your decision on this statement, raised by the ${row.whySelected.toLowerCase()} check. Every other transaction passed all configured checks.`,
      tiles: [
        { label: "Statement total", value: row.total, tone: "quiet" },
        {
          label: "Proposed findings",
          value: String(row.open),
          tone: row.severity === "Major" ? "behind" : "quiet",
        },
        { label: "Severity", value: row.severity, tone: row.severity === "Major" ? "behind" : "quiet" },
        { label: "In queue", value: row.age, tone: "quiet" },
      ],
      artifact: {
        kind: "ranked",
        title: "Proposed findings · evidence and policy basis",
        items: findings,
      },
      prompts: [
        "Confirm F-01 and record it",
        "Dismiss F-02 — reviewed and supported",
        "Draft the return to the cardholder",
        "What did the passed transactions look like?",
      ],
      // A confirmation, not an execution: opens the confirm-finding step.
      action: { label: "Review findings with me" },
    },
  };
}

/**
 * Check where a returned statement sits. Nothing to decide yet — the run
 * reports the workflow state honestly, including that the correction hasn't
 * arrived, and offers the nudge rather than sending it.
 */
export function checkReturnStatusTask(row: ReturnedRow): AgentTask {
  const withCardholder = row.state === "Awaiting cardholder";
  return {
    id: `pcard-status-${row.statement}`,
    agent: AGENT,
    label: "Check status",
    subject: `${row.statement} · ${row.cardholder}`,
    steps: [
      `Read the return sent ${row.returned}`,
      "Checked for a correction against the requested lines",
      withCardholder ? "Checked manager reapproval — not yet reached" : "Checked manager reapproval",
    ],
    outcome: {
      summary: withCardholder
        ? `Returned ${row.returned} for “${row.lastFinding}”. No correction has arrived in ${row.age} — it is still with the cardholder, so manager reapproval hasn't started. It stays out of your active queue until both happen.`
        : `Returned ${row.returned} for “${row.lastFinding}”. The cardholder's correction is in; it has been awaiting ${row.owner}'s reapproval for ${row.age}. Once reapproved it moves to Ready for re-audit.`,
      tiles: [
        { label: "State", value: row.state, tone: "behind" },
        { label: "Waiting", value: row.age, tone: "behind" },
        { label: "Owner", value: row.owner, tone: "quiet" },
      ],
      artifact: {
        kind: "compare",
        title: "Where it is against where it needs to be",
        rows: [
          { label: "Correction received", before: "Requested", after: withCardholder ? "Not yet" : "Yes", good: !withCardholder },
          { label: "Manager reapproval", before: "Required", after: withCardholder ? "Not started" : "Pending", good: false },
          { label: "Back in your queue", before: "—", after: "After reapproval", good: false },
        ],
      },
      prompts: [
        withCardholder ? "Draft a reminder to the cardholder" : `Draft a reminder to ${row.owner}`,
        "Show the original return email",
        "Escalate if nothing by end of week",
      ],
      action: { label: withCardholder ? "Draft reminder to cardholder" : "Draft reminder to manager" },
    },
  };
}

/**
 * Re-audit a corrected statement. The spec's rule: rerun every check, not
 * only the corrected field — so the checklist is the full five again, and the
 * result is an explicit before/after with a recommendation the auditor
 * confirms.
 */
export function reauditTask(row: ReadyRow): AgentTask {
  return {
    id: `pcard-reaudit-${row.statement}`,
    agent: AGENT,
    label: "Re-audit",
    subject: `${row.statement} · ${row.cardholder}`,
    steps: [
      `Read the correction · ${row.change}`,
      "Reran receipt coverage on every line, not just the corrected one",
      "Reran classification, meals, tax and recurring checks",
      `Compared against the original finding · ${row.originalFinding}`,
    ],
    outcome: {
      summary: `The correction resolves the original finding — ${row.correction.toLowerCase()}, reapproved ${row.reapproved}. Rerunning every check raised nothing new. I recommend completing this audit with the finding recorded as corrected. Confirm before I stamp it.`,
      tiles: [
        { label: "Original", value: row.originalFinding.split(" · ")[0], tone: "behind" },
        { label: "Now", value: "Resolved", tone: "good" },
        { label: "New issues", value: "0", tone: "good" },
        { label: "Reapproved", value: row.reapproved, tone: "quiet" },
      ],
      artifact: {
        kind: "compare",
        title: "Before the return → after the correction",
        rows: [
          { label: row.originalFinding, before: "Proposed · open", after: "Corrected", good: true },
          { label: "Receipt coverage", before: "1 line missing", after: "All lines covered", good: true },
          { label: "Manager approval", before: "Original", after: `Reapproved ${row.reapproved}`, good: true },
          { label: "Audit state", before: "Returned", after: "Ready to complete", good: true },
        ],
      },
      prompts: [
        "Keep it open — I want to check line 4 myself",
        "Return it again",
        "Show what changed line by line",
      ],
      action: { label: "Complete audit · finding corrected" },
    },
  };
}

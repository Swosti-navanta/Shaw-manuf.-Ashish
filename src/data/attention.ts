/**
 * What crossed a limit, and the rule that says so.
 *
 * The join between the two halves of the product. Performance explains why a
 * number moved; Make decides what to do. Attention is the seam: it names what
 * breached, quotes the rule verbatim so the reader can argue with the rule
 * rather than the number, and hands the item to Make. It decides nothing
 * itself, which is the point — an analysis surface that could also act would
 * make the split between the two pages arbitrary.
 *
 * Each item carries the id of the decision it becomes, so the horizon and the
 * exposure shown here are the same ones the queue shows. Nothing is restated
 * in two places and allowed to drift.
 */
import type { Horizon } from "@/types/action";

export interface AttentionItem {
  id: string;
  /** What breached — the category and where. */
  subject: string;
  /** Why it is here, in one line. */
  detail: string;
  /** The rule that fired, quoted. Set on Thresholds. */
  rule: string;
  /** What it costs or protects. */
  exposure: string;
  horizon: Horizon;
  /** The decision on Make this becomes. */
  actionId: string;
}

/** Raised by the Overall / POVA read. */
export const ATTENTION_OVERALL: ReadonlyArray<AttentionItem> = [
  {
    id: "at-ot",
    subject: "Overtime · Plant 04 · Dalton, GA",
    detail:
      "Band broken 4 of the last 6 periods. 85% traces to machine downtime and late sequencing rather than staffing, so the open headcount ask would fix about a seventh of it.",
    rule: "unfavourable 3+ consecutive periods",
    exposure: "$47k U",
    horizon: "period",
    actionId: "act-labor",
  },
  {
    id: "at-maint",
    subject: "Maintenance spending · Plant 15 · Chatsworth, GA",
    detail:
      "First breach in 6 periods. Two unplanned stops drive $12k of it, and a monitorable signal preceded both — the window where a sensor is cheap and the failure is not.",
    rule: "category >15% over budget AND new this period",
    exposure: "$24k U",
    horizon: "shift",
    actionId: "act-wo",
  },
  {
    id: "at-headroom",
    subject: "Constraint headroom · Plant 04 · Dalton, GA",
    detail:
      "Forward headroom on the constraint belt has sat 8% below the promise floor for four weeks. Every week it holds is another week of dates promised against capacity that is not there.",
    rule: "forward headroom below the promise floor 3+ weeks",
    exposure: "Promise ceiling",
    horizon: "quarter",
    actionId: "act-promise",
  },
];

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
import type { AnalysisSource, Horizon } from "@/types/action";

export interface AttentionItem {
  id: string;
  /** What breached. The plant is NOT baked in — the band appends whichever
   *  plant the top bar is scoped to, so a row can never name a mill the rest
   *  of the screen is not showing. */
  subject: string;
  /** Why it is here, in one line. */
  detail: string;
  /** The rule that fired, quoted. Set on Thresholds. */
  rule: string;
  /** Which of the four analyses owns the "why" behind it. Reuses the queue's
   *  own vocabulary rather than a second list of the same four things. */
  affects: AnalysisSource;
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
    subject: "Overtime",
    detail:
      "Band broken 4 of the last 6 periods. 85% traces to machine downtime and late sequencing rather than staffing, so the open headcount ask would fix about a seventh of it.",
    rule: "unfavourable 3+ consecutive periods",
    affects: "labor",
    exposure: "$47k",
    horizon: "period",
    actionId: "act-labor",
  },
  {
    id: "at-maint",
    subject: "Maintenance spending",
    detail:
      "First breach in 6 periods. Two unplanned stops drive $12k of it, and a monitorable signal preceded both — the window where a sensor is cheap and the failure is not.",
    rule: "category >15% over budget AND new this period",
    affects: "machine",
    exposure: "$24k",
    horizon: "shift",
    actionId: "act-wo",
  },
  {
    id: "at-headroom",
    subject: "Constraint headroom",
    detail:
      "Forward headroom on the constraint belt has sat 8% below the promise floor for four weeks. Every week it holds is another week of dates promised against capacity that is not there.",
    rule: "forward headroom below the promise floor 3+ weeks",
    affects: "manufacturing",
    exposure: "Promise ceiling",
    horizon: "quarter",
    actionId: "act-promise",
  },
];

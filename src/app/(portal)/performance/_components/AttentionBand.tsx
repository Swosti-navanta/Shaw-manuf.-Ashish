"use client";

import { ArrowRight, Check } from "@phosphor-icons/react";
import {
  AiStar,
  Button,
  DataTable,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { useRun } from "@/context/RunContext";
import { useScope } from "@/context/ScopeContext";
import { plantLabel } from "@/types/division";
import { ATTENTION_OVERALL, type AttentionItem } from "@/data/attention";
import { MAKE_ACTIONS, SOURCE_LABEL } from "@/types/action";

/**
 * The seam between analysis and decision, on the Overall read.
 *
 * A table rather than a stack of cards, and the same table the queue on Make
 * is: these rows become those rows, so reading them in one shape and deciding
 * them in another would hide that they are the same things.
 *
 * The rule travels with each row, quoted rather than summarised, so the
 * argument can be with the limit — a setting someone chose on Thresholds —
 * instead of with the figure it produced.
 */
export default function AttentionBand({ onOpenMake }: { onOpenMake: (id: string) => void }) {
  const { status, workOrderRaised } = useRun();
  const { plant } = useScope();

  /* Decided-ness is read from the run state Make writes, not tracked again
     here — two copies of "has this been decided" is how a page ends up
     disagreeing with the queue it links to. */
  const decidedLabel = (item: AttentionItem): string | null => {
    const action = MAKE_ACTIONS.find((a) => a.id === item.actionId);
    if (!action) return null;
    if (action.kind === "resequence" && status !== "open") return "Re-sequenced";
    if (action.kind === "workorder" && workOrderRaised) return "Work order raised";
    return null;
  };

  const live = ATTENTION_OVERALL.filter((i) => !decidedLabel(i));
  const open = live.length;

  const columns: DataTableColumn<AttentionItem>[] = [
    {
      key: "subject",
      label: "Subject",
      alwaysVisible: true,
      /* Fixed, and the caption truncates inside it. The detail is a sentence,
         and a sentence in an unbounded column widens the table until the
         columns after it are pushed off the edge. */
      width: 380,
      cell: (row) => (
        <span className="flex flex-col min-w-0" style={{ gap: 1 }}>
          <span className="type-body-medium truncate" style={{ color: "var(--ds-text-primary)" }}>
            {row.subject} · {plantLabel(plant)}
          </span>
          {/* Wraps rather than truncates: this line carries the argument —
              "85% traces to downtime, not staffing" — and half of that
              sentence is worse than none of it. DataTable sets nowrap on its
              cell wrapper, so the override has to be here. */}
          <span
            className="type-caption"
            style={{
              color: "var(--ds-text-secondary)",
              whiteSpace: "normal",
              lineHeight: 1.4,
            }}
          >
            {row.detail}
          </span>
        </span>
      ),
    },
    {
      key: "rule",
      label: "Rule that fired",
      width: 250,
      cell: (row) => (
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          {row.rule}
        </span>
      ),
    },
    {
      key: "affects",
      label: "Affects",
      width: 150,
      cell: (row) => (
        <span
          className="type-caption inline-flex items-center"
          style={{
            padding: "2px 9px",
            borderRadius: 999,
            background: "var(--color-iris-50)",
            border: "1px solid var(--color-iris-200)",
            color: "var(--color-iris-700)",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {SOURCE_LABEL[row.affects]}
        </span>
      ),
    },
    {
      key: "exposure",
      label: "Exposure",
      width: 118,
      align: "right" as const,
      cell: (row) => {
        const done = decidedLabel(row);
        return (
          <span
            className="type-body-medium"
            style={{
              fontVariantNumeric: "tabular-nums",
              color: done ? "var(--ds-text-secondary)" : "var(--text-danger)",
            }}
          >
            {done ? "decided" : row.exposure}
          </span>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      width: 132,
      align: "right" as const,
      stopRowClick: true,
      cell: (row) => {
        const done = decidedLabel(row);
        return done ? (
          <span
            className="type-caption inline-flex items-center"
            style={{ gap: 5, color: "var(--text-success, #15803d)", fontWeight: 600 }}
          >
            <Check size={12} weight="bold" />
            {done}
          </span>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onOpenMake(row.actionId)}>
            Open
          </Button>
        );
      },
    },
  ];

  return (
    <TableShell
      title="Threshold exceptions"
      totalItems={ATTENTION_OVERALL.length}
      currentPage={1}
      onPageChange={() => {}}
      pageSize={25}
      onPageSizeChange={() => {}}
      /* Nothing here is column-configurable: four fixed facts about a breach. */
      customize={false}
      header={
        <div style={{ padding: "0 16px 14px" }}>
          <span
            className="flex items-start justify-between flex-wrap"
            style={{
              gap: 12,
              padding: "11px 13px",
              borderRadius: 10,
              background: "var(--color-iris-50)",
              border: "1px solid var(--color-iris-200)",
            }}
          >
            <span className="flex items-start" style={{ gap: 9, minWidth: 0 }}>
            <AiStar size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            <span
              className="type-body"
              style={{ color: "var(--ds-text-secondary)", lineHeight: 1.5 }}
            >
              {open > 0 ? (
                <>
                  <strong style={{ color: "var(--ds-text-primary)" }}>
                    This analysis surfaced {open} thing{open === 1 ? "" : "s"} that may need a call.
                  </strong>{" "}
                  Decisions aren&apos;t taken here — they&apos;re raised on Make, where the whole
                  plant&apos;s calls sit in one queue.
                </>
              ) : (
                <>
                  <strong style={{ color: "var(--ds-text-primary)" }}>Nothing to raise.</strong>{" "}
                  Everything this read surfaced has been decided.
                </>
              )}
            </span>
            </span>
            {open > 0 && (
              <Button
                variant="primary"
                size="sm"
                className="shrink-0"
                onClick={() => onOpenMake(live[0].actionId)}
                iconRight={<ArrowRight size={14} weight="bold" />}
              >
                See {open} on Make
              </Button>
            )}
          </span>
        </div>
      }
    >
      <DataTable<AttentionItem>
        columns={columns}
        data={ATTENTION_OVERALL}
        rowKey={(r) => r.id}
        rowHeight={72}
        rowBorderColor="#F1F3F5"
      />
    </TableShell>
  );
}

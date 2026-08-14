"use client";

import { useMemo, useState } from "react";
import { Check, PencilSimple, X, type Icon } from "@phosphor-icons/react";
import {
  AiStar,
  Button,
  DataTable,
  EmptyState,
  PageHeading,
  TableShell,
  type DataTableColumn,
} from "@navanta-ai/design-system";
import { usePersona } from "@/context/PersonaContext";
import { useScope } from "@/context/ScopeContext";
import { useYarn } from "@/context/YarnContext";
import { plantLabel } from "@/types/division";
import { approvalsForTab, type ApprovalRow } from "@/types/yarn";
import DrillLink from "@/components/ui/DrillLink";
import ApprovalDeckModal from "./_components/ApprovalDeckModal";
import YarnBallIcon from "./_components/YarnBallIcon";
import LotSwatchChip from "./_components/LotSwatch";
import SableRead from "./_components/SableRead";

type TabId = "yarn" | "dye" | "approved";


/**
 * Yarn is Sable's approval queue.
 *
 * Same decision-queue shape as Make and Quality, with one difference that
 * runs all the way through the surface: there is no automated lane. Rowan can
 * re-sequence inside a limit and Wren can grade a clean roll, because both are
 * reacting to product that already exists and can be measured. Sable proposes
 * recipes, run orders and lot sizes — instructions for product that hasn't
 * been made yet. There is no reading that makes signing one of those safe to
 * automate, so every row here ends in a person's signature by design rather
 * than by an unset threshold.
 *
 * The queue is split into two tabs, because Sable brings two different jobs.
 * *Yarn lot to order* is a supply decision — which draw of undyed fibre serves
 * which orders, made before any colour exists. *Dye lot to approve* is a shade
 * decision — does this recipe hit standard. They share the decision-queue
 * shape but not their columns (a yarn lot has a grade and a receipt; a dye lot
 * has a shade and a formula), and the swatch in front of the id is a different
 * object in each. So they are tabs, not a filter on one list.
 */
export default function YarnPage() {
  const { plant } = useScope();
  const { profile } = usePersona();
  const { states, approve, returnToAgent, pendingApprovals } = useYarn();

  const [tab, setTab] = useState<TabId>("yarn");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deck, setDeck] = useState<ApprovalRow | null>(null);

  // The queue holds only what still needs a person. An approved allocation is
  // committed and leaves; a rejected one has gone back to Sable. Either way it
  // is no longer waiting, so it drops out rather than sitting settled in place.
  const rows = useMemo(
    () =>
      tab === "approved"
        ? approvalsForTab("approved")
        : approvalsForTab(tab).filter((a) => !states.has(a.id)),
    [tab, states],
  );

  // Shared cells, then the per-tab column set. Subject, recommendation and
  // action are the same everywhere; the middle columns are what the tab is
  // actually about.
  const subjectCol: DataTableColumn<ApprovalRow> = {
    key: "subject",
    label: "Lot",
    alwaysVisible: true,
    width: 190,
    stopRowClick: true,
    cell: (row) => {
      // The id is the object; the family name (Cascade / Dune / Aria base) is
      // context. Same stacked shape as the Make and Quality subject cells —
      // link on top, the descriptor quiet beneath it.
      const [id, ...rest] = row.subject.label.split(" · ");
      return (
        <span className="flex items-center" style={{ gap: 9 }}>
          <LotSwatchChip swatch={row.swatch} />
          <span className="flex flex-col" style={{ gap: 1 }}>
            <button
              type="button"
              onClick={() => setDeck(row)}
              className="type-body font-medium text-left hover:underline"
              style={{ background: "none", padding: 0, cursor: "pointer", color: "var(--link-color)" }}
            >
              {id}
            </button>
            {rest.length > 0 && (
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {rest.join(" · ")}
              </span>
            )}
          </span>
        </span>
      );
    },
  };

  const stakeCol: DataTableColumn<ApprovalRow> = {
    key: "value",
    label: "Value",
    width: 100,
    cell: (row) => (
      <span
        className="type-body"
        style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}
      >
        ${row.value.toLocaleString()}
      </span>
    ),
  };

  const recommendationCol: DataTableColumn<ApprovalRow> = {
    key: "insight",
    label: "Recommendation",
    width: 180,
    headerCell: () => (
      <span className="inline-flex items-center" style={{ gap: 6 }}>
        <AiStar size={14} />
        <span>Recommendation</span>
      </span>
    ),
    // Concise on the row — the call, Sable's confidence in it, and the one lab
    // reading behind it. The full prose is on the title and in the Review modal.
    cell: (row) => (
      <span className="flex flex-col" style={{ gap: 2 }} title={row.insight.headline}>
        <span className="inline-flex items-center" style={{ gap: 8 }}>
          <span
            className="type-body"
            style={{ color: "var(--color-iris-700)", fontWeight: 500 }}
          >
            {row.verdict}
          </span>
          <span
            className="type-caption"
            style={{
              fontVariantNumeric: "tabular-nums",
              color: "var(--color-iris-700)",
              background: "var(--color-iris-50)",
              borderRadius: 999,
              padding: "1px 7px",
            }}
          >
            {row.confidence}% confidence
          </span>
        </span>
      </span>
    ),
  };

  // Both queues offer the whole decision inline — reject and send back,
  // override in the deck (the quantity for a yarn lot, the recipe for a dye
  // lot), or approve as proposed. Three DS outline buttons, icon-only so all
  // three fit beside the data columns without the row scrolling, each with its
  // verb on hover. The reject reason and the override's tooltip adapt to what
  // the row actually commits.
  const decisionCol: DataTableColumn<ApprovalRow> = {
    key: "action",
    label: "Action",
    width: 132,
    align: "right" as const,
    stopRowClick: true,
    cell: (row) => {
      const dye = row.tab === "dye";
      return (
        <span className="inline-flex items-center justify-end" style={{ gap: 6 }}>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Reject ${row.subject.label}`}
            title="Reject — send back to Sable"
            onClick={() =>
              returnToAgent(
                row.id,
                dye ? "Rejected — re-propose the recipe" : "Rejected — re-propose the allocation",
              )
            }
          >
            <X size={15} weight="bold" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Override ${row.subject.label}`}
            title={dye ? "Override — open the dip and formula" : "Override the quantity to order"}
            onClick={() => setDeck(row)}
          >
            <PencilSimple size={15} weight="bold" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Approve ${row.subject.label}`}
            title="Approve as proposed"
            onClick={() => approve(row.id)}
          >
            <Check size={15} weight="bold" />
          </Button>
        </span>
      );
    },
  };

  const plain = (
    key: string,
    label: string,
    width: number,
    get: (r: ApprovalRow) => string | undefined,
    opts: { tabular?: boolean; muted?: boolean } = {},
  ): DataTableColumn<ApprovalRow> => ({
    key,
    label,
    width,
    cell: (row) => (
      <span
        className="type-body"
        style={{
          fontVariantNumeric: opts.tabular ? "tabular-nums" : undefined,
          color: opts.muted ? "var(--ds-text-secondary)" : "var(--ds-text-primary)",
        }}
      >
        {get(row) ?? "—"}
      </span>
    ),
  });

  /** Who signed a settled row, and the limit that let them. Sable's name is
   *  starred — the engine's own work is marked wherever it appears. */
  const approvedByCol: DataTableColumn<ApprovalRow> = {
    key: "approvedBy",
    label: "Approved by",
    width: 190,
    cell: (row) => {
      const engine = row.approvedBy !== undefined && row.approvedBy !== profile.name;
      return (
        <span className="flex flex-col" style={{ gap: 1 }}>
          <span className="inline-flex items-center" style={{ gap: 5 }}>
            {engine && <AiStar size={13} />}
            <span
              className="type-body"
              style={{ color: engine ? "var(--color-iris-700)" : "var(--ds-text-primary)" }}
            >
              {row.approvedBy ?? "—"}
            </span>
          </span>
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            {row.approvedRule ?? ""}
          </span>
        </span>
      );
    },
  };

  const columns = useMemo<DataTableColumn<ApprovalRow>[]>(
    () =>
      tab === "approved"
      ? [
          subjectCol,
          {
            key: "yarnLot",
            label: "Built from",
            width: 126,
            stopRowClick: true,
            cell: (row) => <DrillLink kind="yarn" id={row.yarnLot} />,
          },
          plain("qty", "Commits", 104, (r) => r.qty, { tabular: true }),
          plain("covers", "Covers", 100, (r) => r.covers, { muted: true }),
          stakeCol,
          approvedByCol,
          plain("at", "At", 80, (r) => r.at, { tabular: true, muted: true }),
        ]
      : tab === "yarn"
        ? [
            subjectCol,
            plain("grade", "Grade", 128, (r) => r.grade),
            plain("received", "Received", 104, (r) => r.received, { tabular: true }),
            {
              key: "covers",
              label: "Allocating to",
              width: 168,
              stopRowClick: true,
              cell: (row) => (
                <span className="flex flex-wrap items-center" style={{ gap: 6 }}>
                  {row.covers.split(" · ").map((o) =>
                    /^ORD-/.test(o) ? (
                      <DrillLink key={o} kind="order" id={o} />
                    ) : (
                      <span key={o} className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
                        {o}
                      </span>
                    ),
                  )}
                </span>
              ),
            },
            plain("qty", "Committing", 104, (r) => r.qty, { tabular: true }),
            stakeCol,
            recommendationCol,
            decisionCol,
          ]
        : [
            subjectCol,
            {
              key: "yarnLot",
              label: "Built from",
              width: 126,
              stopRowClick: true,
              cell: (row) => <DrillLink kind="yarn" id={row.yarnLot} />,
            },
            plain("qty", "Commits", 104, (r) => r.qty, { tabular: true }),
            plain("covers", "Covers", 100, (r) => r.covers, { muted: true }),
            stakeCol,
            recommendationCol,
            decisionCol,
          ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, states],
  );

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <PageHeading
        title="Yarn planning"
        subtitle={`Yarn · Sable · ${plantLabel(plant)}. Two decisions before any colour is made: which yarn lot serves which orders, and whether each dye lot\u2019s recipe hits standard. Sable proposes${
          pendingApprovals > 0 ? ` — ${pendingApprovals} waiting on ${profile.name}` : ""
        }; nothing here runs on its own.`}
      />

      <SableRead />

      <TableShell
      customize={false}
        title="Approval queue"
        icon={YarnBallIcon as unknown as Icon}
        tabs={[
          {
            id: "yarn",
            label: "Yarn lot → order",
            badge: approvalsForTab("yarn").filter((a) => !states.has(a.id)).length,
          },
          {
            id: "dye",
            label: "Dye lot → approve",
            badge: approvalsForTab("dye").filter((a) => !states.has(a.id)).length,
          },
          {
            id: "approved",
            label: "Approved",
            badge: approvalsForTab("approved").length,
          },
        ]}
        activeTab={tab}
        onTabChange={(id) => {
          setTab(id as TabId);
          setPage(1);
        }}
        totalItems={rows.length}
        currentPage={page}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyState={
          <EmptyState
            icon={<YarnBallIcon size={24} />}
            title="Nothing in this queue"
            description={
              tab === "yarn"
                ? "No yarn lots waiting to be allocated to an order."
                : "No dye lots waiting on a shade sign-off."
            }
          />
        }
      >
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          rowHeight={64}
          rowBorderColor="#F1F3F5"
        />
      </TableShell>

      {deck && <ApprovalDeckModal approval={deck} onClose={() => setDeck(null)} />}
    </div>
  );
}

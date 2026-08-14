"use client";

import {
  CREEL_LINES,
  CREEL_UTIL_TARGET,
  LOT_ORDER_MAP,
  LOT_STATUS_LABEL,
  LOT_STATUS_SUMMARY,
  QUEUE_PROPOSALS,
  RUN_OUT_SPREAD,
  SHADE_CRITICAL_LOTS,
  SPREAD_TARGET_MIN,
  type LotOrderMap,
  type LotStatus,
  type QueueProposal,
} from "@/types/yarn";
import DrillLink from "@/components/ui/DrillLink";
import {
  Bar,
  Block,
  Check,
  Dot,
  Footnote,
  GridTable,
  Num,
  Text,
  type GridColumn,
} from "./PanelPrimitives";

/**
 * Modal 1 — the yarn-lot deck.
 *
 * Four panels, each answering a different question about the same lot: who it
 * is promised to, whether the frame is full enough to run it, how much yarn the
 * run will strand, and what is waiting on a signature.
 */

/* ─── Lot to Order Mapping ──────────────────────────────────────────────── */

/**
 * Which orders each lot is promised to.
 *
 * Drawn as a bracket rather than a table on purpose: the fact worth reading is
 * that DL-4471 owes *two* orders, and a flat table repeating the lot id down a
 * column is exactly what hides it. One lot feeding two orders is the whole
 * reason a split is a shade risk rather than a scheduling inconvenience.
 */
export function LotToOrderMapping() {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Block title="Lot-to-order mapping" caption="★ marks an order whose install date cannot move">
        <div
          className="flex flex-col"
          style={{ borderRadius: 12, background: "var(--surface-raised)", overflow: "hidden" }}
        >
          {LOT_ORDER_MAP.map((m, i) => (
            <LotGroup key={m.dyeLot} map={m} last={i === LOT_ORDER_MAP.length - 1} />
          ))}
        </div>
      </Block>

      <Block title="Shade-critical lots">
        <GridTable
          columns={LOT_COLUMNS}
          rows={SHADE_CRITICAL_LOTS}
          rowKey={(r) => r.lot}
          note={`… 3 more · ${SHADE_CRITICAL_LOTS.length} of 7 shown`}
        />
        <div className="flex items-center flex-wrap" style={{ gap: 16, paddingTop: 2 }}>
          {LOT_STATUS_SUMMARY.map((s) => (
            <Dot key={s.status} tone={STATUS_TONE[s.status]}>
              {s.count} {s.label}
            </Dot>
          ))}
        </div>
      </Block>

      <Footnote>
        A lot serving two orders holds both to the same shade. That is the reason to keep it whole —
        and the reason splitting it is a commercial call rather than a scheduling one.
      </Footnote>
    </div>
  );
}

/** One lot and the orders hanging off it, as a bracket. */
function LotGroup({ map, last }: { map: LotOrderMap; last: boolean }) {
  const many = map.orders.length > 1;
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "112px 20px 1fr",
        gap: 0,
        padding: "12px 14px",
        borderBottom: last ? undefined : "1px solid var(--border-light)",
      }}
    >
      <span style={{ paddingTop: 1 }}>
        <DrillLink kind="dyelot" id={map.dyeLot} />
      </span>

      {/* The bracket. A single order gets a plain rule; two or more get the
          vertical spine that makes the one-to-many shape visible. */}
      <span aria-hidden="true" className="relative block" style={{ height: "100%" }}>
        <span
          className="absolute"
          style={{ left: 0, right: 8, top: 9, height: 1, background: "var(--border-default)" }}
        />
        {many && (
          <span
            className="absolute"
            style={{
              left: "calc(100% - 8px)",
              top: 9,
              bottom: 10,
              width: 1,
              background: "var(--border-default)",
            }}
          />
        )}
      </span>

      <span className="flex flex-col" style={{ gap: 6, minWidth: 0 }}>
        {map.orders.map((o, i) => (
          <span key={o.order} className="relative flex items-center flex-wrap" style={{ gap: 8 }}>
            {/* The stub joining this order to the spine. */}
            {many && i > 0 && (
              <span
                aria-hidden="true"
                className="absolute"
                style={{ left: -8, top: 9, width: 8, height: 1, background: "var(--border-default)" }}
              />
            )}
            <DrillLink kind="order" id={o.order} />
            <Text tone="secondary">{o.style}</Text>
            <Num tone="secondary">· {o.sqyd.toLocaleString()} sqyd</Num>
            {o.fixed && (
              <span
                className="type-caption"
                style={{ color: "var(--text-warning, #B26B00)", fontWeight: 600 }}
              >
                ★ fixed
              </span>
            )}
          </span>
        ))}
      </span>
    </div>
  );
}

const STATUS_TONE: Record<LotStatus, "success" | "warn" | "danger"> = {
  allocated: "success",
  pending: "warn",
  "at-risk": "danger",
};

const LOT_COLUMNS: ReadonlyArray<GridColumn<(typeof SHADE_CRITICAL_LOTS)[number]>> = [
  {
    key: "lot",
    label: "Lot",
    width: "104px",
    cell: (r) => <DrillLink kind="dyelot" id={r.lot} />,
  },
  {
    key: "orders",
    label: "Orders",
    width: "132px",
    cell: (r) => (
      <span className="flex flex-col" style={{ gap: 2 }}>
        {r.orders.map((o) => (
          <DrillLink key={o} kind="order" id={o} />
        ))}
      </span>
    ),
  },
  { key: "shade", label: "Shade", width: "96px", cell: (r) => <Text>{r.shade}</Text> },
  {
    key: "status",
    label: "Status",
    width: "104px",
    cell: (r) => <Dot tone={STATUS_TONE[r.status]}>{LOT_STATUS_LABEL[r.status]}</Dot>,
  },
  {
    key: "risk",
    label: "Risk",
    cell: (r) =>
      r.risk ? (
        <Text tone={r.status === "at-risk" ? "warn" : "secondary"}>{r.risk}</Text>
      ) : (
        <Text tone="secondary">—</Text>
      ),
  },
];

/* ─── Creel Utilisation ─────────────────────────────────────────────────── */

/**
 * How full each line's creel is.
 *
 * An empty position is yarn the line cannot run, so the bar is measured against
 * the target rather than against 100% — a line at 90% reads as fine until you
 * see the notch it is short of.
 */
export function CreelUtilisation() {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Block title="Creel utilisation" caption={`Target ${CREEL_UTIL_TARGET}% of positions filled`}>
        <GridTable
          columns={UTIL_COLUMNS}
          rows={CREEL_LINES}
          rowKey={(r) => r.line}
          footer={[
            "Total",
            CREEL_LINES.reduce((n, l) => n + l.positions, 0).toLocaleString(),
            CREEL_LINES.reduce((n, l) => n + l.filled, 0).toLocaleString(),
            `${utilPct(
              CREEL_LINES.reduce((n, l) => n + l.filled, 0),
              CREEL_LINES.reduce((n, l) => n + l.positions, 0),
            )}%`,
            "",
          ]}
        />
      </Block>

      <Footnote>
        Utilisation below target is not idle capacity — it is a run that may not finish on the yarn
        loaded. L-03 is the line to fill before the shift turns over.
      </Footnote>
    </div>
  );
}

function utilPct(filled: number, positions: number) {
  return Math.round((filled / positions) * 100);
}

const UTIL_COLUMNS: ReadonlyArray<GridColumn<(typeof CREEL_LINES)[number]>> = [
  { key: "line", label: "Line", width: "72px", cell: (r) => <Text>{r.line}</Text> },
  {
    key: "positions",
    label: "Positions",
    width: "84px",
    align: "right",
    cell: (r) => <Num tone="secondary">{r.positions}</Num>,
  },
  {
    key: "filled",
    label: "Filled",
    width: "72px",
    align: "right",
    cell: (r) => <Num>{r.filled}</Num>,
  },
  {
    key: "util",
    label: "Util",
    width: "64px",
    align: "right",
    cell: (r) => {
      const pct = utilPct(r.filled, r.positions);
      return (
        <Num tone={pct >= CREEL_UTIL_TARGET ? "success" : "warn"} bold>
          {pct}%
        </Num>
      );
    },
  },
  {
    key: "bar",
    label: "",
    cell: (r) => {
      const pct = utilPct(r.filled, r.positions);
      return <Bar pct={pct} target={CREEL_UTIL_TARGET} tone={pct >= CREEL_UTIL_TARGET ? "success" : "warn"} />;
    },
  },
];

/* ─── Run-Out Spread & Waste ────────────────────────────────────────────── */

/**
 * How tightly each run's positions exhaust together.
 *
 * The spread bar is the argument: positions that run out at different times
 * leave partial cones on the frame, and that stranded yarn is the cost of
 * loading packages that were never wound to the same length.
 */
export function RunOutSpreadPanel() {
  const worst = Math.max(...RUN_OUT_SPREAD.map((r) => r.spreadMin));

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Block
        title="Run-out spread & waste"
        caption={`Target ±${SPREAD_TARGET_MIN} min · bar is spread against the worst run`}
      >
        <GridTable
          columns={spreadColumns(worst)}
          rows={RUN_OUT_SPREAD}
          rowKey={(r) => r.run}
          // Six cells for six columns — run, lot, bar, spread, stranded, flag.
          footer={[
            "Total",
            "",
            "",
            "",
            `${RUN_OUT_SPREAD.reduce((n, r) => n + r.strandedLb, 0)} lbs`,
            "",
          ]}
        />
      </Block>

      <Footnote>
        A wide spread is not a defect on its own — it is yarn left on the frame when the run stops.
        R-1207 is flagged because 31 lb is past the point where re-winding pays for itself.
      </Footnote>
    </div>
  );
}

function spreadColumns(worst: number): ReadonlyArray<GridColumn<(typeof RUN_OUT_SPREAD)[number]>> {
  return [
    { key: "run", label: "Run", width: "84px", cell: (r) => <Text>{r.run}</Text> },
    {
      key: "lot",
      label: "Lot",
      width: "100px",
      cell: (r) => <DrillLink kind="dyelot" id={r.lot} />,
    },
    {
      key: "bar",
      label: "Run-out spread",
      cell: (r) => (
        <Bar
          pct={(r.spreadMin / worst) * 100}
          tone={r.flag === "ok" ? "success" : r.flag === "wide" ? "warn" : "danger"}
        />
      ),
    },
    {
      key: "spread",
      label: "Spread",
      width: "76px",
      align: "right",
      cell: (r) => (
        <Num tone={r.spreadMin <= SPREAD_TARGET_MIN ? "success" : "warn"}>±{r.spreadMin} min</Num>
      ),
    },
    {
      key: "stranded",
      label: "Stranded",
      width: "80px",
      align: "right",
      cell: (r) => <Num bold>{r.strandedLb} lbs</Num>,
    },
    {
      key: "flag",
      label: "Flag",
      width: "76px",
      cell: (r) => (
        <Dot tone={r.flag === "ok" ? "success" : r.flag === "wide" ? "warn" : "danger"}>
          {r.flag}
        </Dot>
      ),
    },
  ];
}

/* ─── Approval Queue ────────────────────────────────────────────────────── */

/**
 * Every proposal Sable assembled for this lot, waiting on a signature.
 *
 * Each card states both answers. A proposal that only lists what approving it
 * buys you is a pitch; the two columns side by side are what make it a
 * decision — and the reason the escalation path is named rather than implied.
 */
export function ApprovalQueuePanel() {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {QUEUE_PROPOSALS.map((p, i) => (
        <ProposalCard key={p.id} proposal={p} index={i + 1} />
      ))}

      <Footnote>
        Both outcomes are stated for every proposal. Sable never signs its own work — what it can do
        is make the cost of each answer legible before you pick one.
      </Footnote>
    </div>
  );
}

function ProposalCard({ proposal: p, index }: { proposal: QueueProposal; index: number }) {
  const escalated = p.tone === "escalation";
  const ink = escalated ? "var(--text-warning, #B26B00)" : "var(--color-iris-700)";

  return (
    <section
      className="flex flex-col"
      style={{
        gap: 12,
        padding: 14,
        borderRadius: 12,
        background: "var(--surface-raised)",
        borderLeft: `3px solid ${ink}`,
      }}
    >
      <div className="flex flex-col" style={{ gap: 3 }}>
        <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: ink,
            }}
          >
            {escalated ? "⚠ Escalation" : "● Standard"}
          </span>
          <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
            {p.action}
          </span>
          <span
            className="type-caption"
            style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}
          >
            Proposal {index}
          </span>
        </span>
        <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
          <DrillLink kind="dyelot" id={p.lot} />
          <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
            · {p.shade} · {p.style}
          </span>
        </span>
      </div>

      <div className="flex flex-col" style={{ gap: 4 }}>
        <Label>What it proposes</Label>
        {p.proposes.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          <Label>Built from</Label>
          <div
            className="flex flex-col"
            style={{ gap: 4, padding: 10, borderRadius: 10, background: "var(--surface-base)" }}
          >
            {p.builtFrom.map((b) => (
              <span key={b.label} className="flex items-baseline justify-between" style={{ gap: 10 }}>
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                  {b.label}
                </span>
                <Num>{b.value}</Num>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <Label>What&apos;s at stake</Label>
          <div className="flex flex-col" style={{ gap: 8 }}>
            <Outcome title="If signed" tone="success" points={p.ifSigned} />
            <Outcome title="If rejected" tone="danger" points={p.ifRejected} />
          </div>
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 5 }}>
        <Label>Shade rule compliance</Label>
        <span className="flex items-center flex-wrap" style={{ gap: 14 }}>
          {p.compliance.map((c) => (
            <Check key={c.label} label={c.label} pass={c.pass} />
          ))}
        </span>
      </div>

      <div className="flex flex-col" style={{ gap: 4 }}>
        <Label>Escalation path</Label>
        <span className="flex items-center flex-wrap" style={{ gap: 6 }}>
          {p.escalationPath.map((step, i) => (
            <span key={step} className="flex items-center" style={{ gap: 6 }}>
              {i > 0 && (
                <span aria-hidden="true" style={{ color: "var(--ds-text-secondary)" }}>
                  →
                </span>
              )}
              <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                {step}
              </span>
            </span>
          ))}
          {p.escalationPath.length === 1 && (
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              (signs here)
            </span>
          )}
        </span>
      </div>
    </section>
  );
}

function Outcome({
  title,
  tone,
  points,
}: {
  title: string;
  tone: "success" | "danger";
  points: ReadonlyArray<string>;
}) {
  const ink = tone === "success" ? "var(--text-success)" : "var(--text-danger)";
  return (
    <div
      className="flex flex-col"
      style={{
        gap: 3,
        padding: "8px 10px",
        borderRadius: 10,
        background: tone === "success" ? "var(--surface-success)" : "var(--surface-danger)",
      }}
    >
      <span className="type-caption" style={{ color: ink, fontWeight: 600 }}>
        {title}
      </span>
      {points.map((p) => (
        <span key={p} className="type-body" style={{ color: "var(--ds-text-primary)" }}>
          {p}
        </span>
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ds-text-placeholder, var(--text-muted))",
      }}
    >
      {children}
    </span>
  );
}

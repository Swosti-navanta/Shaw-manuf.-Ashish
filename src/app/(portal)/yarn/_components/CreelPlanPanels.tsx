"use client";

import {
  CREEL_PLAN_HEADER,
  CREEL_POSITIONS,
  CREEL_SECTION_LABEL,
  PACKAGE_ALIGNMENT,
  PACKAGE_TRACE,
  PACKAGE_TRACE_ELIDED,
  PACKAGE_TRACE_LAST,
  THREADING_SECTIONS,
  THREADING_TOTAL,
} from "@/types/yarn";
import DrillLink from "@/components/ui/DrillLink";
import {
  Block,
  Dot,
  Footnote,
  GridTable,
  Num,
  Text,
  type GridColumn,
} from "./PanelPrimitives";

/**
 * Modal 2 — the creel-plan deck.
 *
 * Where Modal 1 asks who the yarn is promised to, this one asks how it gets
 * onto the frame: which cone sits in which position, whether they exhaust
 * together, what threading costs, and whether every cone can be traced back.
 */

/* ─── Package Alignment ─────────────────────────────────────────────────── */

/**
 * Whether the creel exhausts together.
 *
 * The window is drawn as a band with the target marked inside it, because the
 * whole judgement is "does the spread fit in ±5 min" — two clock times in a
 * caption make that arithmetic the reader's problem. Outlier positions are
 * named: "outside target" without the position numbers is a complaint, not a
 * work instruction.
 */
export function PackageAlignment() {
  const { targetMin, earliest, latest, spreadMin, outliers } = PACKAGE_ALIGNMENT;
  const inside = spreadMin <= targetMin;

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Block title="Position map" caption={CREEL_SECTION_LABEL}>
        <GridTable
          columns={POSITION_COLUMNS}
          rows={CREEL_POSITIONS}
          rowKey={(r) => r.pos}
          note="… 006–120 · 5 of 120 positions shown"
        />
      </Block>

      <Block
        title="Package alignment"
        caption={`Target: all positions exhaust within ±${targetMin} min`}
      >
        <div
          className="flex flex-col"
          style={{ gap: 12, padding: 14, borderRadius: 12, background: "var(--surface-raised)" }}
        >
          {/* The window. The band is the actual spread; the notch is where the
              target window ends, so overshoot is visible rather than computed. */}
          <div className="flex flex-col" style={{ gap: 6 }}>
            <div className="flex items-center justify-between">
              <span className="type-caption" style={{ color: "var(--text-success)" }}>
                earliest {earliest}
              </span>
              <span
                className="type-caption"
                style={{ color: inside ? "var(--text-success)" : "var(--text-warning, #B26B00)" }}
              >
                latest {latest}
              </span>
            </div>

            <div
              className="relative"
              style={{
                height: 14,
                borderRadius: 999,
                background: "var(--border-light)",
                overflow: "hidden",
              }}
            >
              {/* Inside the target window. */}
              <span
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${Math.min(100, (targetMin / spreadMin) * 100)}%`,
                  background: "var(--text-success)",
                }}
              />
              {/* The overshoot. */}
              {!inside && (
                <span
                  className="absolute inset-y-0"
                  style={{
                    left: `${(targetMin / spreadMin) * 100}%`,
                    right: 0,
                    background: "var(--text-warning, #B26B00)",
                    opacity: 0.65,
                  }}
                />
              )}
              <span
                aria-hidden="true"
                className="absolute inset-y-0"
                style={{
                  left: `${(targetMin / spreadMin) * 100}%`,
                  width: 2,
                  background: "var(--ds-text-primary)",
                  opacity: 0.45,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span
                className="type-caption"
                style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}
              >
                ±{targetMin} min target
              </span>
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                ±{spreadMin} min actual
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
            <Dot tone={inside ? "success" : "warn"}>
              {inside ? `Inside target (±${targetMin} min)` : `Outside target (±${targetMin} min)`}
            </Dot>
            <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
              Outlier positions:{" "}
              <span style={{ color: "var(--ds-text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {outliers.join(", ")}
              </span>
            </span>
          </div>
        </div>
      </Block>

      <Footnote>
        Positions that exhaust apart leave partial cones on the frame. Four outliers are worth
        re-winding by hand; a whole section out of sync is a package-winding problem upstream.
      </Footnote>
    </div>
  );
}

const POSITION_COLUMNS: ReadonlyArray<GridColumn<(typeof CREEL_POSITIONS)[number]>> = [
  { key: "pos", label: "Pos", width: "56px", cell: (r) => <Num>{r.pos}</Num> },
  {
    key: "cone",
    label: "Cone wt",
    width: "76px",
    align: "right",
    cell: (r) => <Num tone="secondary">{r.coneWtLb.toFixed(1)} lbs</Num>,
  },
  {
    key: "lot",
    label: "Lot",
    width: "96px",
    cell: (r) => <DrillLink kind="dyelot" id={r.lot} />,
  },
  { key: "pkg", label: "Package", width: "104px", cell: (r) => <Text>{r.pkgId}</Text> },
  {
    key: "runout",
    label: "Run-out",
    width: "80px",
    align: "right",
    cell: (r) => (
      <Num tone={r.sync ? "success" : "warn"} bold={!r.sync}>
        {r.runOut}
      </Num>
    ),
  },
  {
    key: "sync",
    label: "Sync",
    width: "72px",
    cell: (r) => <Dot tone={r.sync ? "success" : "warn"}>{r.sync ? "in" : "wide"}</Dot>,
  },
];

/* ─── Threading Set-Up ──────────────────────────────────────────────────── */

/**
 * What threading the frame up costs in yarn.
 *
 * A quarter-pound per position is invisible; the same number at 480 positions
 * is 120 lb and 4.2% of the lot. That is why the total and the percentage sit
 * in the footer rather than being left as a rate for the reader to multiply.
 */
export function ThreadingSetUp() {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Block title="Threading-up set-off" caption="Yarn spent bringing each section up to speed">
        <GridTable
          columns={THREADING_COLUMNS}
          rows={THREADING_SECTIONS}
          rowKey={(r) => r.section}
          footer={[
            "Total",
            "",
            `${THREADING_TOTAL.positions}`,
            "—",
            `${THREADING_TOTAL.totalLb} lbs`,
            `${THREADING_TOTAL.pctOfLot}%`,
          ]}
        />
      </Block>

      <Footnote>
        Set-off is unavoidable, not waste — the first yards through a freshly threaded section are
        off-tension. It is shown because 4.2% of the lot is worth sizing the lot for.
      </Footnote>
    </div>
  );
}

const THREADING_COLUMNS: ReadonlyArray<GridColumn<(typeof THREADING_SECTIONS)[number]>> = [
  { key: "section", label: "Section", width: "76px", cell: (r) => <Text>{r.section}</Text> },
  { key: "range", label: "Range", width: "96px", cell: (r) => <Num tone="secondary">{r.range}</Num> },
  {
    key: "positions",
    label: "Positions",
    width: "84px",
    align: "right",
    cell: (r) => <Num tone="secondary">{r.positions}</Num>,
  },
  {
    key: "per",
    label: "Set-off / pos",
    width: "104px",
    align: "right",
    cell: (r) => <Num tone="secondary">{r.setOffPerPosLb.toFixed(2)} lbs</Num>,
  },
  {
    key: "total",
    label: "Total",
    width: "80px",
    align: "right",
    cell: (r) => <Num bold>{r.totalLb} lbs</Num>,
  },
  {
    key: "pct",
    label: "% of lot",
    width: "76px",
    align: "right",
    cell: (r) => <Num tone="secondary">{r.pctOfLot}%</Num>,
  },
];

/* ─── Lot Tracebility ───────────────────────────────────────────────────── */

/**
 * Every cone, back to the lot it came from.
 *
 * This is the record a claim is walked along months later — lot → package →
 * position → order. Three packages and the last are shown with the gap stated:
 * seventeen more rows of the same shape teach nothing the pattern already has,
 * and pretending otherwise is how a table becomes decoration.
 */
export function LotTracebility() {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <Block title="Lot traceability" caption="lot → package → creel position → order">
        <div
          className="flex flex-col"
          style={{ gap: 10, padding: 14, borderRadius: 12, background: "var(--surface-raised)" }}
        >
          <DrillLink kind="dyelot" id={CREEL_PLAN_HEADER.lot} />

          <div className="flex flex-col" style={{ gap: 7, paddingLeft: 6 }}>
            {PACKAGE_TRACE.map((p) => (
              <TraceRow key={p.pkgId} pkgId={p.pkgId} cones={p.cones} posRange={p.posRange} />
            ))}

            <span className="flex items-center" style={{ gap: 8 }}>
              <Branch />
              <span
                className="type-caption"
                style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}
              >
                … {PACKAGE_TRACE_ELIDED} more packages
              </span>
            </span>

            <TraceRow
              pkgId={PACKAGE_TRACE_LAST.pkgId}
              cones={PACKAGE_TRACE_LAST.cones}
              posRange={PACKAGE_TRACE_LAST.posRange}
              last
            />
          </div>
        </div>
      </Block>

      <Footnote>
        Every cone is traceable: lot → package → creel position → order. This is the chain a claim is
        traced back along months later, which is why what gets signed here is worth recording.
      </Footnote>
    </div>
  );
}

function TraceRow({
  pkgId,
  cones,
  posRange,
  last,
}: {
  pkgId: string;
  cones: number;
  posRange: string;
  last?: boolean;
}) {
  return (
    <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
      <Branch last={last} />
      <Text>{pkgId}</Text>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        ({cones} cones)
      </span>
      <span aria-hidden="true" style={{ color: "var(--ds-text-secondary)" }}>
        →
      </span>
      <Num tone="secondary">Pos {posRange}</Num>
    </span>
  );
}

/** The tree elbow. Drawn rather than typed so it lines up with the row height
 *  regardless of the font the browser resolves. */
function Branch({ last }: { last?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative block shrink-0"
      style={{ width: 14, height: 14 }}
    >
      <span
        className="absolute"
        style={{
          left: 0,
          top: 0,
          bottom: last ? "50%" : 0,
          width: 1,
          background: "var(--border-default)",
        }}
      />
      <span
        className="absolute"
        style={{ left: 0, top: "50%", width: 12, height: 1, background: "var(--border-default)" }}
      />
    </span>
  );
}

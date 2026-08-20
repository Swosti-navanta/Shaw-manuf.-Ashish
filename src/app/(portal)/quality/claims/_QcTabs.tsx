"use client";

import { useState } from "react";
import { AiStar, Button, Chip, TableShell, Tabs } from "@navanta-ai/design-system";
import { ArrowRight } from "@phosphor-icons/react";
import DrillLink from "@/components/ui/DrillLink";
import { TRACE_CHAIN } from "@/types/quality";
import { RuleBand } from "./_ClaimsInsight";

/* ── Data ───────────────────────────────────────────────────────────────────
 *
 * The four quality checks a lot passes through, plus the claims that got past
 * all of them. Illustrative — the point is the shape: every stage grades, and
 * the same split-lot cause runs through dye-lot QC into the claims.
 */

type Tone = "good" | "warn" | "bad";
type Filter = "all" | "watch" | "flag";

const TONE_INK: Record<Tone, string> = {
  good: "var(--text-success)",
  warn: "var(--text-warning, #B7791F)",
  bad: "var(--text-danger)",
};
const TONE_BG: Record<Tone, string> = {
  good: "var(--surface-success)",
  warn: "#FEF3E2",
  bad: "var(--surface-danger)",
};

interface Check {
  label: string;
  ok: boolean;
}

interface YarnRow {
  s: Filter;
  id: string;
  sub: string;
  checks: Check[];
  result: string;
  resultTone: Tone;
  serves: string;
  status: string;
  statusTone: Tone;
}
interface DyeRow {
  s: Filter;
  id: string;
  sub: string;
  dE: string;
  dETone: Tone;
  checks: Check[];
  result: string;
  resultTone: Tone;
  whole: string;
  wholeTone: Tone;
  status: string;
  statusTone: Tone;
}
interface OrderRow {
  s: Filter;
  id: string;
  sub: string;
  grade: string;
  gradeTone: Tone;
  defects: string;
  where: string;
  run: string;
  status: string;
  statusTone: Tone;
}
interface ClaimRow {
  id: string;
  sub: string;
  traced: string;
  tracedSub: string;
  cause: string;
  stage: string;
  cost: string;
}

const YARN: YarnRow[] = [
  { s: "all", id: "Y-30918", sub: "Cascade Twist · nylon 6,6", checks: c("Heat-set,Twist,Denier,Shade"), result: "Pass", resultTone: "good", serves: "ORD-882", status: "Clean", statusTone: "good" },
  { s: "watch", id: "Y-31004", sub: "Dune 240 · nylon 6,6", checks: c("Heat-set,Twist!,Denier,Shade"), result: "Hold · twist drift", resultTone: "warn", serves: "ORD-917", status: "Watched", statusTone: "warn" },
  { s: "all", id: "Y-30877", sub: "Highland Loop · PET", checks: c("Heat-set,Twist,Denier,Shade"), result: "Pass", resultTone: "good", serves: "ORD-841", status: "Clean", statusTone: "good" },
  { s: "watch", id: "Y-30952", sub: "Mist 110 · nylon 6", checks: c("Heat-set,Twist!,Denier,Shade"), result: "Hold · twist drift", resultTone: "warn", serves: "ORD-855", status: "Watched", statusTone: "warn" },
  { s: "all", id: "Y-30841", sub: "Cascade Twist · nylon 6,6", checks: c("Heat-set,Twist,Denier,Shade"), result: "Pass", resultTone: "good", serves: "ORD-830", status: "Clean", statusTone: "good" },
  { s: "all", id: "Y-30799", sub: "Dune 240 · nylon 6,6", checks: c("Heat-set,Twist,Denier,Shade"), result: "Pass", resultTone: "good", serves: "ORD-812", status: "Clean", statusTone: "good" },
];

const DYE: DyeRow[] = [
  { s: "flag", id: "DL-4102", sub: "Dune 240 · split 2 runs", dE: "ΔE 2.4", dETone: "bad", checks: c("Fastness,Level!"), result: "Off-shade", resultTone: "bad", whole: "Split", wholeTone: "bad", status: "In claim", statusTone: "bad" },
  { s: "flag", id: "DL-3980", sub: "Highland Loop · split 2 runs", dE: "ΔE 2.1", dETone: "bad", checks: c("Fastness,Level!"), result: "Off-shade", resultTone: "bad", whole: "Split", wholeTone: "bad", status: "In claim", statusTone: "bad" },
  { s: "flag", id: "DL-3854", sub: "Dune 240 · split 2 runs", dE: "ΔE 1.9", dETone: "bad", checks: c("Fastness,Level!"), result: "Off-shade", resultTone: "bad", whole: "Split", wholeTone: "bad", status: "In claim", statusTone: "bad" },
  { s: "all", id: "DL-4471", sub: "Cascade Twist · shade-critical", dE: "ΔE 0.8", dETone: "good", checks: c("Fastness,Level"), result: "Approved", resultTone: "good", whole: "Whole", wholeTone: "good", status: "Clean", statusTone: "good" },
  { s: "all", id: "DL-4455", sub: "Mist 110 · standard", dE: "ΔE 0.5", dETone: "good", checks: c("Fastness,Level"), result: "Approved", resultTone: "good", whole: "Whole", wholeTone: "good", status: "Clean", statusTone: "good" },
  { s: "all", id: "DL-4482", sub: "Dune 240 · standard", dE: "ΔE 0.7", dETone: "good", checks: c("Fastness,Level"), result: "Approved", resultTone: "good", whole: "Whole", wholeTone: "good", status: "Clean", statusTone: "good" },
];

const ORDER: OrderRow[] = [
  { s: "watch", id: "ORD-882", sub: "Kestrel Flooring · Dune 240", grade: "B", gradeTone: "warn", defects: "0.9", where: "Backing 2 · R edge", run: "R-1204", status: "In claim", statusTone: "bad" },
  { s: "watch", id: "ORD-771", sub: "Brightwater · Highland Loop", grade: "B", gradeTone: "warn", defects: "0.8", where: "Backing 2 · L edge", run: "R-1196", status: "In claim", statusTone: "bad" },
  { s: "watch", id: "ORD-708", sub: "Halloran · Dune 240", grade: "B", gradeTone: "warn", defects: "0.7", where: "Backing 2 · R edge", run: "R-1188", status: "In claim", statusTone: "bad" },
  { s: "all", id: "ORD-841", sub: "Nolan Interiors · Highland Loop", grade: "A", gradeTone: "good", defects: "0.1", where: "—", run: "R-1205", status: "Shipped", statusTone: "good" },
  { s: "all", id: "ORD-855", sub: "Ridgeway · Mist 110", grade: "A", gradeTone: "good", defects: "0.2", where: "—", run: "R-1207", status: "Shipped", statusTone: "good" },
  { s: "all", id: "ORD-830", sub: "Cascade Twist · Aiken", grade: "A", gradeTone: "good", defects: "0.1", where: "—", run: "R-1201", status: "Shipped", statusTone: "good" },
];

const CLAIMS: ClaimRow[] = [
  { id: "CLM-2291", sub: "Kestrel Flooring · Jun 2026", traced: "DL-4102", tracedSub: "B-88209 · R-1204", cause: "Split lot — two dye runs did not shade-match", stage: "Dye-lot QC", cost: "$18,400" },
  { id: "CLM-2205", sub: "Brightwater Interiors · May 2026", traced: "DL-3980", tracedSub: "B-88144 · R-1196", cause: "Split-lot shade mismatch", stage: "Dye-lot QC", cost: "$12,900" },
  { id: "CLM-2154", sub: "Halloran Contract · Apr 2026", traced: "DL-3854", tracedSub: "B-88061 · R-1188", cause: "Split-lot shade mismatch", stage: "Dye-lot QC", cost: "$9,900" },
];

/** Parse "Heat-set,Twist!,Denier" → checks, `!` marking a failed check. */
function c(spec: string): Check[] {
  return spec.split(",").map((s) => ({ label: s.replace("!", ""), ok: !s.endsWith("!") }));
}

type TabId = "yarn" | "dye" | "order" | "claims";

const READS: Record<TabId, string> = {
  yarn: "Every yarn lot is checked before it runs — heat-set, twist, denier and shade against spec. 40 passed clean this window; 2 are on watch for twist drift. The lot that fails here is far cheaper than the one that fails in the field.",
  dye: "Dye lots are approved against the shade standard — ΔE, colorfastness and levelness. Three came in off-shade this window. Where a lot is split across two dye runs and the shades don't match, that is the exact signature behind the open claims.",
  order: "Inspectors grade every finished order roll by roll — grade, defects per square yard, and where across the width they sit. Wren reads what they write and links each roll to its run. Three orders graded B for edge streak; all three trace to a split dye lot.",
  claims: "These are the orders that had to go through a claim — the production check couldn't save them because the cause was upstream. Three claims, four months, one cause: a shade-critical dye lot split across two runs that didn't match.",
};

const SUMS: Record<TabId, { k: string; v: string; tone?: Tone }[]> = {
  yarn: [
    { k: "Through QC", v: "42" },
    { k: "Passed clean", v: "40", tone: "good" },
    { k: "On watch", v: "2", tone: "warn" },
    { k: "Flagged", v: "0" },
  ],
  dye: [
    { k: "Through QC", v: "31" },
    { k: "Approved", v: "28", tone: "good" },
    { k: "Off-shade", v: "3", tone: "bad" },
    { k: "Held whole", v: "26" },
  ],
  order: [
    { k: "Through QC", v: "28" },
    { k: "Grade A", v: "24", tone: "good" },
    { k: "Grade B", v: "4", tone: "warn" },
    { k: "Shipped", v: "25" },
  ],
  claims: [
    { k: "Open claims", v: "3", tone: "bad" },
    { k: "Total exposure", v: "$41.2k", tone: "bad" },
    { k: "Shared cause", v: "Split lot" },
    { k: "Window", v: "4 months" },
  ],
};

const FILTERS: Record<Exclude<TabId, "claims">, { f: Filter; label: string; count: number }[]> = {
  yarn: [
    { f: "all", label: "All", count: 42 },
    { f: "watch", label: "Watched", count: 2 },
    { f: "flag", label: "Flagged", count: 0 },
  ],
  dye: [
    { f: "all", label: "All", count: 31 },
    { f: "flag", label: "Off-shade", count: 3 },
  ],
  order: [
    { f: "all", label: "All", count: 28 },
    { f: "watch", label: "Grade B", count: 4 },
  ],
};

/* ── Component ────────────────────────────────────────────────────────────── */

/** The full population each tab samples from — the demo carries 6 rows, but the
 *  count is the real inventory, so the table reads "6 of 42" and expands. */
/** How many rows show before the table is expanded. */
/* What each tab's numbers rest on. These used to sit in a per-table footer,
   which TableShell owns now — so they move up beside Wren's read, where the
   rest of the tab's framing already is. */
const NOTES: Record<Exclude<TabId, "claims">, string> = {
  yarn: "heat-set, twist, denier and shade checked on every lot",
  dye: "off-shade lots are split across two dye runs — the shared cause behind Claims",
  order: "graded at the roll, before it is cut and shipped",
};

export default function QcTabs() {
  const [tab, setTab] = useState<TabId>("yarn");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const chips = tab === "claims" ? null : FILTERS[tab];
  const activeFilter = chips?.some((ch) => ch.f === filter) ? filter : "all";

  const rows =
    tab === "yarn"
      ? YARN.filter((r) => activeFilter === "all" || r.s === activeFilter)
      : tab === "dye"
        ? DYE.filter((r) => activeFilter === "all" || r.s === activeFilter)
        : tab === "order"
          ? ORDER.filter((r) => activeFilter === "all" || r.s === activeFilter)
          : CLAIMS;

  const reset = () => {
    setPage(1);
  };

  return (
    <TableShell
      title="Quality checks"
      /* Nothing here is column-configurable: every tab is a different table
         with its own fixed shape. */
      customize={false}
      totalItems={rows.length}
      currentPage={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      isFiltered={activeFilter !== "all"}
      header={
        <>
          {/* The tab row lives in the header slot rather than in TableShell's
              own `tabs` prop, for one reason: TableShell renders its filter
              chips on a separate row ABOVE the tabs and hands `Tabs` no
              rightSlot, so watch/flag could not sit beside the tab labels.
              The DS `Tabs` component does take a rightSlot — so the shell
              keeps the chrome and the footer, and the tab row is composed
              here where the chips can ride on its right edge. */}
          <div style={{ padding: "0 16px", borderBottom: "1px solid var(--border-light)" }}>
            <Tabs
              variant="underline-pill"
              tabs={[
                { id: "yarn", label: "Yarn QC", badge: 42 },
                { id: "dye", label: "Dye-lot QC", badge: 3, tone: "critical" },
                { id: "order", label: "Final-order QC", badge: 28 },
                { id: "claims", label: "Claims", badge: 3, tone: "critical" },
              ]}
              activeTab={tab}
              onChange={(id) => {
                setTab(id as TabId);
                setFilter("all");
                reset();
              }}
              rightSlot={
                chips && chips.length ? (
                  <span className="inline-flex items-center" style={{ gap: 6 }}>
                    {chips.map((ch) => (
                      <Chip
                        key={ch.f}
                        selected={activeFilter === ch.f}
                        count={ch.count}
                        onClick={() => {
                          /* Clicking the active chip clears back to All rather
                             than being inert — a selected toggle that does
                             nothing reads as broken. */
                          setFilter(activeFilter === ch.f ? "all" : ch.f);
                          reset();
                        }}
                      >
                        {ch.label}
                      </Chip>
                    ))}
                  </span>
                ) : undefined
              }
            />
          </div>

        <div className="flex flex-col" style={{ gap: 14, padding: "14px 16px" }}>
          {/* On the Claims tab the rule leads — it's the decision the whole
              page builds to. Every other tab opens with Wren's read. */}
          {tab === "claims" ? (
            <RuleBand />
          ) : (
            <>
              <div
                className="flex items-start"
                style={{
                  gap: 9,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--color-iris-50)",
                  border: "1px solid var(--color-iris-200)",
                }}
              >
                <AiStar size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                <span
                  className="type-body"
                  style={{ color: "var(--ds-text-secondary)", lineHeight: 1.55 }}
                >
                  {READS[tab]}
                </span>
              </div>

              {/* Summary stats — the Claims tab carries its numbers in the
                  genealogy and claims table instead, so it skips this row. */}
              <div
                className="grid"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}
              >
                {SUMS[tab].map((sm) => (
                  <div
                    key={sm.k}
                    className="flex flex-col"
                    style={{
                      gap: 3,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                      {sm.k}
                    </span>
                    <span
                      className="type-body-medium"
                      style={{
                        fontSize: 18,
                        color: sm.tone ? TONE_INK[sm.tone] : "var(--ds-text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {sm.v}
                    </span>
                  </div>
                ))}
              </div>

              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {NOTES[tab]}
              </span>
            </>
          )}
        </div>
        </>
      }
    >
      <div style={{ padding: "0 16px" }}>
        {tab === "yarn" && <YarnTable rows={rows as YarnRow[]} />}
        {tab === "dye" && <DyeTable rows={rows as DyeRow[]} />}
        {tab === "order" && <OrderTable rows={rows as OrderRow[]} />}
        {tab === "claims" && <ClaimsTable />}
      </div>
    </TableShell>
  );
}

/* ── Table primitives ─────────────────────────────────────────────────────── */

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className="type-caption"
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        background: TONE_BG[tone],
        color: TONE_INK[tone],
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Res({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="type-body" style={{ color: TONE_INK[tone], fontWeight: 500 }}>
      {children}
    </span>
  );
}

function Checks({ checks }: { checks: Check[] }) {
  return (
    <span className="inline-flex flex-wrap" style={{ gap: 8 }}>
      {checks.map((ch) => (
        <span
          key={ch.label}
          className="type-caption"
          style={{ color: ch.ok ? "var(--ds-text-secondary)" : "var(--text-danger)" }}
        >
          {ch.label} {ch.ok ? "✓" : "⚠"}
        </span>
      ))}
    </span>
  );
}

function IdCell({ id, sub, link }: { id: string; sub: string; link?: boolean }) {
  return (
    <span className="flex flex-col" style={{ gap: 1 }}>
      {link ? (
        <DrillLink kind="dyelot" id={id}>
          {id}
        </DrillLink>
      ) : (
        <span className="type-body font-medium" style={{ color: "var(--ds-text-primary)" }}>
          {id}
        </span>
      )}
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        {sub}
      </span>
    </span>
  );
}

function Shell({
  head,
  children,
  foot,
}: {
  head: string[];
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th
                  key={h || i}
                  className="type-caption"
                  style={{
                    textAlign: i === head.length - 1 && h === "" ? "right" : "left",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ds-text-placeholder, var(--text-muted))",
                    fontWeight: 500,
                    padding: "0 12px 8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {foot}
    </div>
  );
}

function Row({ children, flag }: { children: React.ReactNode; flag?: boolean }) {
  return (
    <tr style={{ borderTop: "1px solid var(--border-light)", background: flag ? "var(--surface-danger)" : undefined }}>
      {children}
    </tr>
  );
}

const TD: React.CSSProperties = { padding: "11px 12px", verticalAlign: "middle" };

/* Rows only. Counting, paging and the "N of M" line belong to TableShell now. */
interface TableProps<T> {
  rows: T[];
}

function YarnTable({ rows }: TableProps<YarnRow>) {
  const shown = rows;
  return (
    <Shell
      head={["Yarn lot", "Checked", "Result", "Serves", "Status", ""]}
    >
      {shown.map((r) => (
        <Row key={r.id}>
          <td style={TD}><IdCell id={r.id} sub={r.sub} /></td>
          <td style={TD}><Checks checks={r.checks} /></td>
          <td style={TD}><Res tone={r.resultTone}>{r.result}</Res></td>
          <td style={TD}><span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>{r.serves}</span></td>
          <td style={TD}><Pill tone={r.statusTone}>{r.status}</Pill></td>
          <td style={{ ...TD, textAlign: "right" }}><Button variant="ghost" size="sm">View</Button></td>
        </Row>
      ))}
    </Shell>
  );
}

function DyeTable({ rows }: TableProps<DyeRow>) {
  const shown = rows;
  return (
    <Shell
      head={["Dye lot", "Shade ΔE", "Fastness / level", "Result", "Whole?", "Status", ""]}
    >
      {shown.map((r) => (
        <Row key={r.id} flag={r.s === "flag"}>
          <td style={TD}><IdCell id={r.id} sub={r.sub} link /></td>
          <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}><Res tone={r.dETone}>{r.dE}</Res></td>
          <td style={TD}><Checks checks={r.checks} /></td>
          <td style={TD}><Res tone={r.resultTone}>{r.result}</Res></td>
          <td style={TD}><Pill tone={r.wholeTone}>{r.whole}</Pill></td>
          <td style={TD}><Pill tone={r.statusTone}>{r.status}</Pill></td>
          <td style={{ ...TD, textAlign: "right" }}><Button variant="ghost" size="sm">Trace</Button></td>
        </Row>
      ))}
    </Shell>
  );
}

function OrderTable({ rows }: TableProps<OrderRow>) {
  const shown = rows;
  return (
    <Shell
      head={["Order", "Roll grade", "Defects / yd²", "Where", "Traced to run", "Status", ""]}
    >
      {shown.map((r) => (
        <Row key={r.id}>
          <td style={TD}><IdCell id={r.id} sub={r.sub} /></td>
          <td style={TD}><Res tone={r.gradeTone}>{r.grade}</Res></td>
          <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}><span className="type-body" style={{ color: "var(--ds-text-primary)" }}>{r.defects}</span></td>
          <td style={TD}><span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>{r.where}</span></td>
          <td style={TD}><span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>{r.run}</span></td>
          <td style={TD}><Pill tone={r.statusTone}>{r.status}</Pill></td>
          <td style={{ ...TD, textAlign: "right" }}><Button variant="ghost" size="sm">Trace</Button></td>
        </Row>
      ))}
    </Shell>
  );
}

function ClaimsTable() {
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <BatchGenealogy />

      {/* The claims themselves, in the same boxed-rows-plus-footer shape as the
          genealogy above — one bordered container, light row dividers, and the
          pattern summary as the closing row. */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span
          className="type-caption"
          style={{
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ds-text-placeholder, var(--text-muted))",
          }}
        >
          The claims behind it
        </span>
        <div
          style={{ borderRadius: 10, border: "1px solid var(--border-default)", overflow: "hidden" }}
        >
          {CLAIMS.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center"
              style={{
                gap: 12,
                padding: "10px 14px",
                borderBottom: i < CLAIMS.length - 1 ? "1px solid var(--border-light)" : undefined,
              }}
            >
              {/* Claim */}
              <span className="flex flex-col flex-1 min-w-0" style={{ gap: 1 }}>
                <DrillLink kind="claim" id={r.id}>
                  {r.id}
                </DrillLink>
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                  {r.sub}
                </span>
              </span>
              {/* Traced to */}
              <span className="flex flex-col shrink-0" style={{ gap: 1, width: 128 }}>
                <DrillLink kind="dyelot" id={r.traced}>
                  {r.traced}
                </DrillLink>
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                  {r.tracedSub}
                </span>
              </span>
              {/* Root cause */}
              <span
                className="type-body shrink-0"
                style={{ width: 240, color: "var(--ds-text-primary)" }}
              >
                {r.cause}
              </span>
              {/* Stage it slipped */}
              <span className="shrink-0" style={{ width: 96 }}>
                <Pill tone="bad">{r.stage}</Pill>
              </span>
              {/* Cost */}
              <span
                className="shrink-0"
                style={{ width: 72, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
              >
                <Res tone="bad">{r.cost}</Res>
              </span>
            </div>
          ))}

          {/* Pattern summary — the closing row. */}
          <div
            className="flex items-center justify-between"
            style={{ gap: 12, padding: "10px 14px", background: "var(--surface-raised)" }}
          >
            <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
              Same cause · 3 claims · 4 months — one rule would have prevented every one
            </span>
            <span
              className="type-body-medium"
              style={{ color: "var(--text-danger)", fontVariantNumeric: "tabular-nums" }}
            >
              $41,200
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Batch genealogy ──────────────────────────────────────────────────────
 *
 * The chain from a field claim back to the run that produced it, and the two
 * earlier claims that share its signature. Sits inside the Claims tab because
 * it is the *evidence* the rule above rests on — the pattern that makes a
 * one-off read as a process, without leaving the surface.
 */
function BatchGenealogy() {
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div className="flex flex-col" style={{ gap: 10 }}>
        <span
          className="type-caption"
          style={{
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ds-text-placeholder, var(--text-muted))",
          }}
        >
          One chain · claim → roll → batch → lot → run
        </span>
        <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
          {TRACE_CHAIN.map((node, i) => (
            <span key={node.label} className="inline-flex items-center" style={{ gap: 6 }}>
              <span
                className="flex flex-col"
                style={{
                  gap: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: node.flagged
                    ? "var(--surface-warning, #FEF0C7)"
                    : "var(--surface-raised)",
                  border: `1px solid ${
                    node.flagged ? "var(--text-warning, #F79009)" : "var(--border-default)"
                  }`,
                }}
              >
                <span
                  className="type-caption"
                  style={{
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ds-text-placeholder, var(--text-muted))",
                  }}
                >
                  {node.label}
                </span>
                <span
                  className="type-body"
                  style={{ color: "var(--ds-text-primary)", fontWeight: 500 }}
                >
                  {node.value}
                </span>
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                  {node.detail}
                </span>
              </span>
              {i < TRACE_CHAIN.length - 1 && (
                <ArrowRight size={12} weight="bold" color="var(--border-strong)" />
              )}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}

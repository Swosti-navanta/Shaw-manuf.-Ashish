"use client";

import { useState } from "react";
import { AiStar, Button, Chip, SegmentedControl } from "@navanta-ai/design-system";
import { ArrowRight, ArrowSquareOut } from "@phosphor-icons/react";
import {
  LABOR_BENCHMARK,
  LABOR_PROCESSES,
  LENSES,
  type LaborProcId,
  type LensId,
} from "@/data/labor-analysis";

/**
 * Labor · the analysis workbench. Pure analysis — no decision is taken here;
 * the only forward path is the pointer to Make.
 *
 * The layout separates what's constant from what redraws. Constant: the
 * process picker (the scope bar — its status dots are a triage before any
 * click) and the ERP exits. Everything between redraws off the picked
 * process, in the order Marcus asks questions: the verdict, the causal chain
 * that explains it, the same money sliced four ways, then whether it's
 * worsening and whether this process is the outlier.
 */
export default function LaborAnalysis({
  onOpenMake,
}: {
  /** Route to Make — with the queue row's id when the analysis has one. */
  onOpenMake: (actionId?: string) => void;
}) {
  const [procId, setProcId] = useState<LaborProcId>("warp");
  const [lens, setLens] = useState<LensId>("cause");
  const proc = LABOR_PROCESSES.find((p) => p.id === procId) ?? LABOR_PROCESSES[0];

  const verdictInk =
    proc.verdict.tone === "bad"
      ? "var(--text-danger)"
      : proc.verdict.tone === "warn"
        ? "var(--text-warning, #B7791F)"
        : "var(--text-success)";

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* The scope bar — pick a process step; the dots triage before any click. */}
      <div
        className="flex items-center flex-wrap"
        style={{
          gap: 8,
          padding: "10px 14px",
          borderRadius: 12,
          background: "var(--surface-base)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        }}
      >
        <span
          className="type-caption"
          style={{
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ds-text-placeholder, var(--text-muted))",
            marginRight: 4,
          }}
        >
          Process
        </span>
        {LABOR_PROCESSES.map((p) => (
          <Chip
            key={p.id}
            selected={p.id === procId}
            onClick={() => {
              setProcId(p.id);
              setLens("cause");
            }}
            icon={
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background:
                    p.status === "bad"
                      ? "var(--text-danger)"
                      : p.status === "warn"
                        ? "var(--text-warning, #F79009)"
                        : "var(--text-success)",
                }}
              />
            }
          >
            {p.name}
          </Chip>
        ))}
        <span className="type-caption" style={{ marginLeft: "auto", color: "var(--ds-text-secondary)" }}>
          analysis only — decisions are taken on Make
        </span>
      </div>

      {/* The verdict — answer first, then the chain that proves it. */}
      <div
        style={{
          padding: "13px 16px",
          borderRadius: "0 12px 12px 0",
          background: "var(--surface-base)",
          border: "1px solid var(--border-default)",
          borderLeft: `3px solid ${verdictInk}`,
          boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ds-text-primary)" }}>
          {proc.name} overtime is{" "}
          <span style={{ color: verdictInk, fontVariantNumeric: "tabular-nums" }}>{proc.verdict.amount}</span>
          {" · "}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {proc.verdict.actual} vs {proc.verdict.budget}
          </span>
        </span>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", marginTop: 5, lineHeight: 1.5 }}>
          <strong style={{ color: "var(--ds-text-primary)" }}>{proc.verdict.lead}</strong> {proc.verdict.rest}
        </p>
      </div>

      {/* The causal chain — the join a spreadsheet can't make. */}
      <Section title="The causal chain · how the money actually moved" scope="machine → labor → cost">
        <div className="flex items-stretch" style={{ gap: 8, overflowX: "auto" }}>
          {proc.chain.map((node, i) => (
            <div key={node.src} className="flex items-center" style={{ gap: 8, flex: "1 1 0", minWidth: 132 }}>
              <div
                className="flex flex-col"
                style={{
                  flex: 1,
                  gap: 3,
                  padding: "11px 12px",
                  borderRadius: 10,
                  background: node.tone === "hot" ? "var(--surface-danger)" : "#FEFBF3",
                  border: `1px solid ${node.tone === "hot" ? "var(--border-danger, #FDA29B)" : "var(--text-warning, #F79009)"}`,
                }}
              >
                <span
                  className="type-caption"
                  style={{
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    fontSize: 9.5,
                    color: "var(--ds-text-placeholder, var(--text-muted))",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {node.src}
                </span>
                <span
                  style={{
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    fontVariantNumeric: "tabular-nums",
                    color: node.tone === "hot" ? "var(--text-danger)" : "var(--text-warning, #B7791F)",
                  }}
                >
                  {node.value}
                </span>
                <span className="type-caption" style={{ color: "var(--ds-text-secondary)", lineHeight: 1.35 }}>
                  {node.label}
                </span>
              </div>
              {i < proc.chain.length - 1 && (
                <ArrowRight size={14} weight="bold" color="var(--border-strong)" style={{ flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
        <p
          className="type-caption"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--surface-raised)",
            color: "var(--ds-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--ds-text-primary)" }}>Read it left to right:</strong> {proc.chainFoot}
        </p>
      </Section>

      {/* Decomposition — the same money, four slices, one panel. */}
      <Section
        title={`Break the ${proc.verdict.tone === "good" ? "cost" : proc.verdict.amount.split(" ")[0]} down`}
        action={
          <SegmentedControl
            size="sm"
            value={lens}
            onValueChange={(v) => setLens(v as LensId)}
            aria-label="Decomposition lens"
            options={LENSES.map((l) => ({ value: l.id, label: l.label }))}
          />
        }
      >
        <div className="flex flex-col" style={{ gap: 10 }}>
          {proc.lenses[lens].map((r) => (
            <div key={r.label} className="flex items-center" style={{ gap: 12 }}>
              <span className="flex flex-col shrink-0" style={{ gap: 0, width: 148 }}>
                <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>{r.label}</span>
                {r.sub && (
                  <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{r.sub}</span>
                )}
              </span>
              <span aria-hidden="true" className="flex-1" style={{ height: 14, borderRadius: 5, background: "var(--surface-sunken)", overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${r.pct}%`,
                    borderRadius: 5,
                    background:
                      r.tone === "hot"
                        ? "var(--text-danger)"
                        : r.tone === "warn"
                          ? "var(--text-warning, #F79009)"
                          : r.tone === "ok"
                            ? "var(--text-success)"
                            : "var(--border-strong)",
                  }}
                />
              </span>
              <span className="shrink-0 inline-flex items-baseline justify-end" style={{ width: 76, gap: 4 }}>
                <span className="type-body-medium" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>
                  {r.value}
                </span>
                {r.rising && (
                  <span className="type-caption" style={{ color: "var(--text-danger)" }}>▲</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Context pair — structural or a blip · outlier or not. */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "stretch" }}>
        <Section title="Is it worsening?" scope="OT$/SY · 12 periods">
          <TrendSpark series={proc.trend.series} band={proc.trend.band} tone={proc.trend.tone} />
          <p className="type-caption" style={{ marginTop: 8, color: "var(--ds-text-secondary)", lineHeight: 1.45 }}>
            <strong
              style={{
                color:
                  proc.trend.tone === "bad"
                    ? "var(--text-danger)"
                    : proc.trend.tone === "warn"
                      ? "var(--text-warning, #B7791F)"
                      : "var(--ds-text-primary)",
              }}
            >
              {proc.trend.lead}
            </strong>{" "}
            {proc.trend.rest}
          </p>
        </Section>

        <Section title="Is this the outlier?" scope="OT$/SY · by process, this plant">
          <div className="flex flex-col" style={{ gap: 7 }}>
            {LABOR_BENCHMARK.map((b) => {
              const you = b.id === procId;
              return (
                <div key={b.id} className="flex items-center" style={{ gap: 10 }}>
                  <span
                    className="type-caption shrink-0"
                    style={{ width: 62, color: you ? "var(--ds-text-primary)" : "var(--ds-text-secondary)", fontWeight: you ? 600 : 400 }}
                  >
                    {b.name}
                  </span>
                  <span aria-hidden="true" className="flex-1" style={{ height: 11, borderRadius: 4, background: "var(--surface-sunken)", overflow: "hidden" }}>
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${b.pct}%`,
                        borderRadius: 4,
                        background: you ? "var(--text-danger)" : "var(--border-strong)",
                      }}
                    />
                  </span>
                  <span className="type-caption shrink-0" style={{ width: 48, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ds-text-primary)" }}>
                    {b.value}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="type-caption" style={{ marginTop: 9, color: "var(--ds-text-secondary)", lineHeight: 1.45 }}>
            <strong style={{ color: "var(--ds-text-primary)" }}>{proc.benchmarkRead.lead}</strong>{" "}
            {proc.benchmarkRead.rest}
          </p>
        </Section>
      </div>

      {/* The one forward path: Make. A healthy process says so honestly. */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{
          gap: 12,
          padding: "12px 14px",
          borderRadius: 12,
          background: proc.surfaced > 0 ? "var(--color-iris-50)" : "var(--surface-raised)",
          border: `1px solid ${proc.surfaced > 0 ? "var(--color-iris-200)" : "var(--border-default)"}`,
        }}
      >
        <span className="type-body inline-flex items-start" style={{ gap: 8, color: "var(--ds-text-secondary)", lineHeight: 1.5 }}>
          <AiStar size={15} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            {proc.surfaced > 0 ? (
              <>
                <strong style={{ color: "var(--ds-text-primary)" }}>
                  This analysis surfaced {proc.surfaced} thing{proc.surfaced === 1 ? "" : "s"} that may need a call.
                </strong>{" "}
                Decisions aren&apos;t taken here — they&apos;re raised on Make, where the whole plant&apos;s calls sit in one queue.
              </>
            ) : (
              <>
                <strong style={{ color: "var(--ds-text-primary)" }}>Nothing to raise.</strong> A healthy
                process surfaces nothing — this page says so and stops.
              </>
            )}
          </span>
        </span>
        {proc.surfaced > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenMake(proc.makeActionId)}
            iconRight={<ArrowRight size={14} weight="bold" />}
          >
            See {proc.surfaced} on Make
          </Button>
        )}
      </div>

      {/* The portal interprets; the ERP itemizes. */}
      <div className="flex items-center justify-end flex-wrap" style={{ gap: 16 }}>
        {["Cost-center + employee detail → P13 tracker", "Budget lines → TM1", "Downtime → Ignition"].map((x) => (
          <span key={x} className="type-caption inline-flex items-center" style={{ gap: 4, color: "var(--color-iris-700)" }}>
            {x} <ArrowSquareOut size={11} />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function Section({
  title,
  scope,
  action,
  children,
}: {
  title: string;
  scope?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border-default)" }}
      >
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>{title}</span>
        {action ?? (scope && <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>{scope}</span>)}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </section>
  );
}

/** 12-period OT$/SY line with the alert band as a dashed rule. */
function TrendSpark({ series, band, tone }: { series: ReadonlyArray<number>; band: number; tone: "bad" | "warn" | "good" }) {
  const W = 320;
  const H = 84;
  const max = Math.max(...series, band) * 1.08;
  const min = Math.min(...series, band) * 0.92;
  const span = max - min || 1;
  const x = (i: number) => (i / (series.length - 1)) * (W - 8) + 4;
  const y = (v: number) => H - 8 - ((v - min) / span) * (H - 16);
  const stroke = tone === "bad" ? "var(--text-danger)" : tone === "warn" ? "var(--text-warning, #F79009)" : "var(--text-success)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Overtime per square yard, 12 periods" style={{ width: "100%", height: H }}>
      <line x1={4} x2={W - 4} y1={y(band)} y2={y(band)} stroke="var(--text-warning, #F79009)" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
      <text x={W - 6} y={y(band) - 4} textAnchor="end" fontSize={9} fill="var(--ds-text-placeholder, #9F9FA9)">
        band ${band}
      </text>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={series.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
      />
    </svg>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AiStar, Button, LineChart } from "@navanta-ai/design-system";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { useDetailDrawer } from "@/context/DetailDrawerContext";
import type { AgentTask, FlowArtifact, FlowTile } from "@/types/agent-task";

const TILE_INK: Record<NonNullable<FlowTile["tone"]>, string> = {
  good: "var(--text-success)",
  behind: "var(--text-danger)",
  quiet: "var(--ds-text-secondary)",
};

/**
 * One agent run in the transcript: the narration steps reveal in sequence, then
 * the outcome card lands. The card is the deliverable — tiles, one artifact,
 * a Continue link into the record. Follow-up prompts do NOT live here; the
 * panel docks them above the composer.
 */
export default function TaskRun({ task }: { task: AgentTask }) {
  // Reveal steps one at a time, then the outcome. Re-runs when the task changes.
  // Mounted fresh per task (the panel keys this on task.id), so state starts at
  // 0 without a synchronous reset. The timers reveal each step in turn.
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= task.steps.length;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= task.steps.length; i++) {
      timers.push(setTimeout(() => setRevealed(i), i * 620));
    }
    return () => timers.forEach(clearTimeout);
  }, [task.steps.length]);

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {/* Agent header. */}
      <span className="inline-flex items-center" style={{ gap: 7 }}>
        <AiStar size={15} />
        <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
          {task.agent}
        </span>
        <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
          · {task.subject}
        </span>
      </span>

      {/* Narration. */}
      <div className="flex flex-col" style={{ gap: 6 }}>
        {task.steps.map((s, i) => {
          const shown = i < revealed;
          return (
            <span
              key={s}
              className="inline-flex items-center type-body"
              style={{
                gap: 8,
                color: shown ? "var(--ds-text-primary)" : "var(--ds-text-placeholder, var(--text-muted))",
                opacity: shown ? 1 : 0.5,
                transition: "opacity .2s, color .2s",
              }}
            >
              <span
                className="inline-flex items-center justify-center shrink-0"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: shown ? "var(--surface-success)" : "var(--surface-sunken)",
                  color: "var(--text-success)",
                }}
              >
                {shown ? <Check size={10} weight="bold" /> : null}
              </span>
              {s}
            </span>
          );
        })}
      </div>

      {done && <OutcomeCard task={task} />}
    </div>
  );
}

function OutcomeCard({ task }: { task: AgentTask }) {
  const { open } = useDetailDrawer();
  const o = task.outcome;

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 14,
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--color-iris-200)",
        background: "var(--color-iris-50)",
      }}
    >
      <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
        {o.summary}
      </span>

      {/* Figure tiles. */}
      {o.tiles.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {o.tiles.map((t) => (
            <span
              key={t.label}
              className="flex flex-col"
              style={{
                gap: 2,
                padding: "8px 12px",
                minWidth: 96,
                flex: "1 1 0",
                borderRadius: 10,
                background: "var(--surface-base)",
                border: "1px solid var(--border-default)",
              }}
            >
              <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                {t.label}
              </span>
              <span
                className="type-body-medium"
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: t.tone ? TILE_INK[t.tone] : "var(--ds-text-primary)",
                }}
              >
                {t.value}
              </span>
            </span>
          ))}
        </div>
      )}

      <Artifact artifact={o.artifact} />

      <div className="flex items-center justify-between flex-wrap" style={{ gap: 10 }}>
        {o.continueLink ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => open(o.continueLink!.kind, o.continueLink!.id)}
            iconRight={<ArrowRight size={13} weight="bold" />}
          >
            {o.continueLink.label}
          </Button>
        ) : (
          <span />
        )}
        {o.action && (
          <Button variant="christy" size="sm" iconLeft={<Check size={13} weight="bold" />}>
            {o.action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── artifact renderers — one per FlowArtifact kind ──────────────────────── */

function Artifact({ artifact }: { artifact: FlowArtifact }) {
  return (
    <div
      style={{ borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--surface-base)", overflow: "hidden" }}
    >
      <div
        className="type-caption"
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-light)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ds-text-placeholder, var(--text-muted))",
        }}
      >
        {artifact.title}
      </div>
      <div style={{ padding: 12 }}>
        {artifact.kind === "doc" && (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {artifact.lines.map((l, i) => (
              <span key={i} className="type-body" style={{ color: "var(--ds-text-primary)", lineHeight: 1.5 }}>
                {l}
              </span>
            ))}
          </div>
        )}

        {artifact.kind === "compare" && (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {artifact.rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between" style={{ gap: 12 }}>
                <span className="type-body" style={{ color: "var(--ds-text-secondary)" }}>
                  {r.label}
                </span>
                <span className="inline-flex items-center" style={{ gap: 6, fontVariantNumeric: "tabular-nums" }}>
                  <span className="type-body" style={{ color: "var(--ds-text-placeholder, var(--text-muted))" }}>
                    {r.before}
                  </span>
                  <ArrowRight size={11} weight="bold" color="var(--border-strong)" />
                  <span
                    className="type-body-medium"
                    style={{ color: r.good ? "var(--text-success)" : "var(--ds-text-primary)" }}
                  >
                    {r.after}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {artifact.kind === "ranked" && (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {artifact.items.map((it) => (
              <div key={it.label} className="flex items-center justify-between" style={{ gap: 12 }}>
                <span className="flex flex-col" style={{ gap: 1 }}>
                  <span className="type-body" style={{ color: "var(--ds-text-primary)" }}>
                    {it.label}
                  </span>
                  {it.sub && (
                    <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
                      {it.sub}
                    </span>
                  )}
                </span>
                <span
                  className="type-body-medium"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: it.hot ? "var(--text-danger)" : "var(--ds-text-primary)",
                  }}
                >
                  {it.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {artifact.kind === "mini-chart" && (
          <LineChart
            data={artifact.series.map((p) => ({ label: p.label, value: p.value }))}
            height={110}
            smooth
            showArea
            showXAxisLabels
            lineColor="var(--color-iris-600, #6941C6)"
            formatValue={(v) => `${v}${artifact.unit ? ` ${artifact.unit}` : ""}`}
          />
        )}
      </div>
    </div>
  );
}

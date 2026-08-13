"use client";

import Link from "next/link";
import { Button } from "@navanta-ai/design-system";
import { ArrowLeft } from "@phosphor-icons/react";
import { useSchedule } from "@/context/ScheduleContext";
import { useScope } from "@/context/ScopeContext";
import { plantLabel } from "@/types/division";
import SurfaceCard from "@/components/ui/SurfaceCard";
import ConstraintModel from "./_ConstraintModel";

export default function ConstraintModelPage() {
  const { plant } = useScope();
  const { rules, verdict } = useSchedule();

  const hard = rules.filter((r) => r.strength === "hard").length;
  const fromQuality = rules.filter((r) => r.fromQuality).length;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <header className="flex flex-col" style={{ gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
            color: "var(--ds-text-placeholder, var(--text-muted))",
          }}
        >
          Scheduling · Sawyer · {plantLabel(plant)}
        </span>
        <div className="flex items-end justify-between flex-wrap" style={{ gap: 16 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--ds-text-primary)",
            }}
          >
            Constraint model
          </h1>
          <Link href="/scheduling">
            <Button variant="outline" size="sm" iconLeft={<ArrowLeft size={13} weight="bold" />}>
              Back to the board
            </Button>
          </Link>
        </div>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
          The rules every released sequence has to respect. Sawyer checks these on each nudge —
          they are what turns the board from a drawing into a commitment.
        </p>
      </header>

      <div
        className="grid"
        style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
      >
        <Stat label="Rules in force" value={String(rules.length)} sub="checked on every move" />
        <Stat label="Hard" value={String(hard)} sub="cannot be broken" tone="bad" />
        <Stat
          label="Learned from claims"
          value={String(fromQuality)}
          sub={fromQuality > 0 ? "written by Wren" : "nothing yet from Wren"}
          tone={fromQuality > 0 ? "agent" : undefined}
        />
        <Stat
          label="Current sequence"
          value={verdict.level === "good" ? "Holds" : "Breaks"}
          sub={`changeover $${verdict.changeover.toLocaleString()}`}
          tone={verdict.level === "good" ? "good" : "bad"}
        />
      </div>

      <SurfaceCard title="The rules" caption="hard rules first, newest at the top" bodyPadding="0">
        <ConstraintModel />
      </SurfaceCard>

      <p
        className="type-caption"
        style={{
          color: "var(--ds-text-secondary)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 10,
          padding: "11px 14px",
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: "var(--ds-text-primary)", fontWeight: 600 }}>
          Rules arrive two ways.
        </strong>{" "}
        Most are configured once and rarely change. The highlighted ones are different — Wren
        traces a field claim back to the run that caused it, finds the pattern across batches, and
        sends the cause up as a rule. That loop is the product: a grade problem becomes a
        sequencing rule without anyone writing a policy document.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "bad" | "good" | "agent";
}) {
  const color =
    tone === "bad"
      ? "var(--text-danger)"
      : tone === "good"
        ? "var(--text-success)"
        : tone === "agent"
          ? "var(--lane-auto-ink)"
          : "var(--ds-text-primary)";

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 2,
        padding: "13px 14px",
        borderRadius: 12,
        background: "var(--surface-base)",
        border: "1px solid var(--border-default)",
        boxShadow: "0 1px 2px rgba(24, 24, 27, 0.07)",
      }}
    >
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color,
        }}
      >
        {value}
      </span>
      <span className="type-caption" style={{ color: "var(--ds-text-secondary)" }}>
        {sub}
      </span>
    </div>
  );
}

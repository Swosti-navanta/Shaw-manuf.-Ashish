"use client";

import { useRouter } from "next/navigation";
import { useScope } from "@/context/ScopeContext";
import { useSchedule } from "@/context/ScheduleContext";
import { useRun } from "@/context/RunContext";
import { plantLabel } from "@/types/division";
import { BACKLOG } from "@/data/schedule-data";
import AgentBrief, { type AgentBriefItem } from "@/components/iris/AgentBrief";
import { Button } from "@navanta-ai/design-system";
import SurfaceCard from "@/components/ui/SurfaceCard";
import ScheduleBoard from "./_components/ScheduleBoard";
import BoardControls from "./_components/BoardControls";
import BacklogList from "./_components/BacklogList";

export default function SchedulingPage() {
  const { plant } = useScope();
  const { verdict, released, reRelease, scheduled, rules } = useSchedule();
  const { decision } = useRun();
  const router = useRouter();

  const unplaced = BACKLOG.filter((b) => !scheduled.has(b.id));
  const today = unplaced.filter((b) => b.horizon === "today");
  const fixedAtRisk = unplaced.filter((b) => b.fixed).length;
  const qualityRules = rules.filter((r) => r.fromQuality).length;

  // The brief lists only what is still outstanding. A row that reads "00 ·
  // nothing new" is a row the Scheduler has to read to learn there's nothing
  // to do — so a settled item drops out of the list entirely, and an empty
  // list says so in one line.
  const briefItems: AgentBriefItem[] = [];

  if (today.length > 0) {
    briefItems.push({
      count: String(today.length).padStart(2, "0"),
      countColor: "var(--text-danger)",
      label: "Need a slot today",
      sublabel:
        fixedAtRisk > 0
          ? `${fixedAtRisk} against a fixed install`
          : "Placeable before the shift ends",
    });
  }

  const laterThisWeek = unplaced.length - today.length;
  if (laterThisWeek > 0) {
    briefItems.push({
      count: String(laterThisWeek).padStart(2, "0"),
      label: "Still to place this week",
      sublabel: "Promised dates have slack",
    });
  }

  // A holding sequence needs nothing from anyone; only a broken one is news.
  if (verdict.level === "bad") {
    briefItems.push({
      count: "!!",
      countColor: "var(--text-danger)",
      label: "Sequence breaks a rule",
      sublabel: verdict.message,
    });
  }

  if (!released) {
    briefItems.push({
      count: "01",
      countColor: "var(--lane-limit-ink)",
      label: "Draft not released",
      sublabel: "The floor is still running the old sequence",
    });
  }

  if (qualityRules > 0) {
    briefItems.push({
      count: String(qualityRules).padStart(2, "0"),
      label: "New rules from Quality",
      sublabel: "Written by Wren from a claim pattern",
      external: true,
      onClick: () => router.push("/scheduling/rules"),
    });
  }

  // Make's decision only matters here while its effect is still unreviewed.
  if (decision) {
    briefItems.push({
      count: "01",
      label: "Rebuilt from Rowan's call",
      sublabel: "Backing 2 re-sequenced — check it holds",
    });
  }

  if (briefItems.length === 0) {
    briefItems.push({
      count: "00",
      countColor: "var(--text-success)",
      label: "Nothing waiting on you",
      sublabel: "Every run is placed and the sequence is released",
    });
  }

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
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--ds-text-primary)",
          }}
        >
          The visual schedule
        </h1>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 760 }}>
          Move a run and Sawyer recomputes the changeover, guarding the dye-lot and promised-date
          rules as you go.
        </p>
      </header>

      {/* Board left, Sawyer's brief right — the same split the IRIS planning
          page uses, so the agent's read always sits beside its own surface. */}
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 325px", gap: 16, alignItems: "stretch" }}
      >
        {/* The header carries the sequence's state and the action that changes
            it. Nothing else: the board has one scale now, so there is no switch
            to house. */}
        <SurfaceCard
          title="The belt plan"
          caption={
            released ? undefined : (
              <span className="inline-flex items-center" style={{ gap: 10 }}>
                <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: 5,
                      background: "var(--lane-limit-bg)",
                      color: "var(--lane-limit-ink)",
                    }}
                  >
                  Draft
                </span>
                <Button variant="primary" size="sm" onClick={reRelease}>
                  Re-release
                </Button>
              </span>
            )
          }
        >
          <ScheduleBoard />
          <BoardControls />
        </SurfaceCard>

        <AgentBrief
          heading="Sawyer Summary"
          subheading="Rebuilt 3 belts overnight · 12 Aug 2026"
          items={briefItems}
        />
      </div>

      <BacklogList />
    </div>
  );
}

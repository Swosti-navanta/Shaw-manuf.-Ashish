"use client";

import type { ReactNode } from "react";
import { usePersona } from "@/context/PersonaContext";
import { useScope } from "@/context/ScopeContext";
import { plantLabel } from "@/types/division";

interface SurfaceScaffoldProps {
  /** The agent whose queue this surface is — "Rowan", "Sawyer", … */
  agent: string;
  title: string;
  subtitle: string;
  /** What this surface will hold once the workflow is built. Renders as the
   *  placeholder body, so the shell is legible before the flows exist. */
  contains: ReadonlyArray<string>;
  /** True when the surface reads across plants rather than one plant — the
   *  eyebrow then names the division filter instead of a single plant. */
  networkWide?: boolean;
  children?: ReactNode;
}

/**
 * The standard page frame for every agent surface: an eyebrow that states
 * the active scope, the title, and a placeholder body listing what the
 * surface will contain. Replaced piece by piece as each workflow lands.
 */
export default function SurfaceScaffold({
  agent,
  title,
  subtitle,
  contains,
  networkWide = false,
  children,
}: SurfaceScaffoldProps) {
  const { profile } = usePersona();
  const { plant, divisionInfo, visiblePlants } = useScope();

  const scopeLabel = networkWide
    ? `${visiblePlants.length} plants · ${divisionInfo?.name ?? "All divisions"}`
    : plantLabel(plant);

  return (
    <section className="flex flex-col" style={{ gap: 16 }}>
      <header className="flex flex-col" style={{ gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
            color: "var(--ds-text-placeholder, var(--text-muted))",
          }}
        >
          {agent} · {scopeLabel}
        </span>
        <h1
          className="type-heading"
          style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ds-text-primary)" }}
        >
          {title}
        </h1>
        <p className="type-body" style={{ color: "var(--ds-text-secondary)", maxWidth: 720 }}>
          {subtitle}
        </p>
      </header>

      {/* Who is looking, and what the scope filters resolve to right now.
          This is the persona layer proving itself — it goes away once the
          real surfaces land. */}
      <div
        className="flex flex-wrap items-center"
        style={{
          gap: 10,
          padding: "10px 14px",
          background: "var(--surface-base)",
          border: "1px solid var(--border-default)",
          borderRadius: 12,
        }}
      >
        <Fact label="Persona" value={`${profile.name} · ${profile.role}`} />
        <Divider />
        <Fact label="Owns" value={profile.agents.join(" · ")} />
        <Divider />
        <Fact label="Division" value={divisionInfo?.name ?? "All divisions"} />
        <Divider />
        {/* A network-wide surface reads across every plant the division
            admits, so naming a single one here would contradict the
            (disabled) plant Select in the TopBar. */}
        <Fact
          label="Plant"
          value={
            networkWide
              ? `All ${visiblePlants.length} in scope`
              : plantLabel(plant)
          }
        />
      </div>

      {children ?? (
        <div
          style={{
            background: "var(--surface-base)",
            border: "1px solid var(--border-default)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.11em",
              textTransform: "uppercase",
              color: "var(--ds-text-placeholder, var(--text-muted))",
            }}
          >
            To build
          </span>
          <ul className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
            {contains.map((item) => (
              <li
                key={item}
                className="type-body"
                style={{ color: "var(--ds-text-secondary)", paddingLeft: 16, position: "relative" }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    color: "var(--color-iris-400)",
                  }}
                >
                  –
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline" style={{ gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ds-text-placeholder, var(--text-muted))",
        }}
      >
        {label}
      </span>
      <span className="type-body-medium" style={{ color: "var(--ds-text-primary)" }}>
        {value}
      </span>
    </span>
  );
}

function Divider() {
  return (
    <span
      aria-hidden="true"
      style={{ width: 1, height: 14, background: "var(--border-default)" }}
    />
  );
}

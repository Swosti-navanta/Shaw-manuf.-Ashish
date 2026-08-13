"use client";

import type { ReactNode } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { AiStar } from "@navanta-ai/design-system";

export interface AgentBriefItem {
  /** Large figure on the left of the row. Zero-pad two-digit counts so the
   *  column stays optically aligned. */
  count: number | string;
  /** Colour override — destructive when the row is the one that needs a person. */
  countColor?: string;
  label: ReactNode;
  sublabel?: ReactNode;
  /** Shows a link-out glyph — the row navigates away. */
  external?: boolean;
  onClick?: () => void;
}

interface AgentBriefProps {
  /** "Sawyer Summary", "Rowan Summary" — the agent whose desk this is. */
  heading?: string;
  /** What the agent did before you got here, e.g. "Rebuilt 3 belts overnight". */
  subheading?: ReactNode;
  items: AgentBriefItem[];
}

const numberStyle: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans)",
  fontWeight: 600,
  fontSize: 14,
  lineHeight: "22px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans)",
  fontWeight: 400,
  fontSize: 14,
  lineHeight: "22px",
  color: "var(--ds-text-primary)",
};

const subStyle: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans)",
  fontWeight: 400,
  fontSize: 12,
  lineHeight: "18px",
  color: "var(--ds-text-secondary)",
};

/**
 * The agent's brief — what it did overnight and what it left for you, as a
 * short list of counts. Mirrors the IRIS morning brief so the two products
 * read as one system; every agent surface gets one in the top-right slot.
 */
export default function AgentBrief({
  heading = "Sawyer Summary",
  subheading,
  items,
}: AgentBriefProps) {
  return (
    <aside
      className="flex flex-col w-full h-full"
      style={{
        borderRadius: 12,
        gap: 8,
        background: "linear-gradient(150.438deg, #F5F0FF 4.74%, #FFFFFF 39.12%)",
        boxShadow: "0 0 1px 0 rgba(0,0,0,0.25), 0 1px 4px 0 rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
      aria-label={heading}
    >
      <div
        className="flex items-center w-full shrink-0"
        style={{ padding: "12px 16px 0", gap: 8 }}
      >
        <AiStar size={18} />
        <div className="flex flex-col">
          <h3 className="type-body-medium" style={{ color: "var(--ds-text-primary)", whiteSpace: "nowrap" }}>
            {heading}
          </h3>
          {subheading && <span style={subStyle}>{subheading}</span>}
        </div>
      </div>

      <ul className="flex flex-col w-full">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const rowStyle: React.CSSProperties = {
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "12px 16px",
            width: "100%",
            borderBottom: isLast ? undefined : "1px solid var(--border-light)",
            textAlign: "left",
          };
          const content = (
            <>
              <span style={{ ...numberStyle, color: item.countColor ?? "var(--ds-text-primary)", flexShrink: 0 }}>
                {item.count}
              </span>
              <span className="flex flex-col" style={{ flex: "1 0 0", minWidth: 0 }}>
                <span className="flex items-center" style={{ gap: 4 }}>
                  <span style={labelStyle}>{item.label}</span>
                  {item.external && (
                    <ArrowSquareOut
                      size={14}
                      weight="regular"
                      color="var(--color-iris-600)"
                      className="shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </span>
                {item.sublabel && <span style={subStyle}>{item.sublabel}</span>}
              </span>
            </>
          );
          return (
            <li key={i}>
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="transition-colors hover:bg-[var(--surface-hover)]"
                  style={rowStyle}
                >
                  {content}
                </button>
              ) : (
                <div style={rowStyle}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

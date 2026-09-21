/**
 * The audit's status vocabulary, as a chip. Never colour alone: every chip
 * carries its text, so a Major finding reads as one with the colour off.
 *
 *   major    — danger      a confirmed or proposed Major finding, a rule below floor
 *   minor    — warning     a Minor finding
 *   success  — success     cleared, completed, a rule that's earning its keep
 *   ai       — lavender    proposed by the agent, not yet confirmed by a person
 *   waiting  — attention   parked with a cardholder or a manager
 *   neutral  — muted       closed, informational
 */
export type ChipTone = "major" | "minor" | "success" | "ai" | "waiting" | "neutral";

const TONE: Record<ChipTone, { bg: string; fg: string; border?: string }> = {
  major: { bg: "var(--surface-danger)", fg: "var(--text-danger)" },
  minor: { bg: "var(--surface-warning, #FEF6E7)", fg: "var(--text-warning, #B7791F)" },
  success: { bg: "var(--surface-success)", fg: "var(--text-success)" },
  // Outlined, per the spec: a proposal is an open question until confirmed.
  ai: { bg: "var(--color-iris-50)", fg: "var(--color-iris-700)", border: "var(--color-iris-200)" },
  waiting: { bg: "var(--surface-warning, #FEF6E7)", fg: "var(--text-warning, #8A5A00)" },
  neutral: { bg: "var(--surface-sunken, #F1F3F5)", fg: "var(--ds-text-secondary)" },
};

export default function StatusChip({
  tone,
  children,
}: {
  tone: ChipTone;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <span
      className="type-caption inline-flex items-center"
      style={{
        padding: "2px 9px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        border: t.border ? `1px solid ${t.border}` : "1px solid transparent",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/**
 * The Shaw mark.
 *
 * Drawn from two tokens rather than fixed colours, because it has to sit on
 * both grounds this app uses: teal-on-white in the top bar, and white-on-teal
 * inside the navigation panel, which is itself teal. A single hard-coded fill
 * would disappear into one of the two.
 */
export default function ShawMark({ title, size = 26 }: { title?: string; size?: number }) {
  return (
    <span
      title={title}
      aria-hidden="true"
      className="inline-grid place-items-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.31),
        background: "var(--mark-bg, var(--nav-teal))",
        color: "var(--mark-ink, #FFFFFF)",
        fontWeight: 600,
        fontSize: Math.round(size * 0.5),
      }}
    >
      S
    </span>
  );
}

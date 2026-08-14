"use client";

import { useState } from "react";
import type { LotSwatch } from "@/types/yarn";

const SIZE = 30;

/** A wound cone drawn in any tone. Used for the yarn photo's fallback and,
 *  tinted to the dye shade, for a dye lot — same silhouette, so a row reads as
 *  "a cone of this yarn / in this colour" either way. */
function DrawnCone({ colour, edge, wind }: { colour: string; edge: string; wind: string }) {
  return (
    <svg aria-hidden="true" className="shrink-0" width={SIZE} height={SIZE} viewBox="0 0 18 18">
      <path d="M7 3 H11 L14.5 14 H3.5 Z" fill={colour} stroke={edge} strokeWidth={1} strokeLinejoin="round" />
      <path d="M6.4 6 H11.6" stroke={wind} strokeWidth={0.8} />
      <path d="M5.6 9 H12.4" stroke={wind} strokeWidth={0.8} />
      <path d="M4.9 12 H13.1" stroke={wind} strokeWidth={0.8} />
      <path d="M8.4 2.4 H9.6 V3 H8.4 Z" fill={edge} />
      <ellipse cx={9} cy={14} rx={5.5} ry={1} fill={colour} stroke={edge} strokeWidth={1} />
    </svg>
  );
}

/** A tone one step darker than `hex`, for the cone's edge and wind lines. */
function darken(hex: string, amount = 0.42): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `rgb(${r},${g},${b})`;
}

/**
 * The chip in front of a lot id.
 *
 * A **yarn** lot is a photo of the cone on the creel (greige tones), falling
 * back to a drawn cone if the photo is missing.
 *
 * A **dye** lot is the *same cone silhouette*, drawn in the shade the lot
 * produces — so the physical lot and its colour are one mark. The exact shade
 * also appears as a hard-edged square in the Shade column, where the ΔE is
 * judged; the cone says "the lot", the square says "the colour".
 */
export default function LotSwatchChip({ swatch }: { swatch: LotSwatch }) {
  const initial = swatch.image ?? null;
  const [src, setSrc] = useState<string | null>(initial);

  const onImgError = () => {
    if (src && src.endsWith(".png")) setSrc(src.replace(/\.png$/, ".svg"));
    else setSrc(null);
  };

  // A photo when one is mapped and loads — greige cone for yarn, dyed cone for
  // a dye lot; the drawn cone (tinted for dye) otherwise.
  if (src) {
    return (
      <span className="inline-flex shrink-0 overflow-hidden" style={{ width: SIZE, height: SIZE }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          width={SIZE}
          height={SIZE}
          onError={onImgError}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </span>
    );
  }

  if (swatch.type === "yarn") {
    return <DrawnCone colour={swatch.colour} edge="rgba(120,110,90,.55)" wind="rgba(120,110,90,.42)" />;
  }

  // Dye fallback: the cone drawn in its dye shade.
  return (
    <DrawnCone colour={swatch.colour} edge={darken(swatch.colour, 0.35)} wind={darken(swatch.colour, 0.18)} />
  );
}

/** Shift a shade away from itself by an amount set by ΔE — the stand-in for
 *  "the standard", against the produced colour. A small ΔE barely moves it; a
 *  large one lifts and warms it into a visible mismatch, so the chip *shows*
 *  the number in the column beside it. */
function shadeStandard(hex: string, delta: number): string {
  const amt = Math.min(0.5, Math.max(0, delta) * 0.14);
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number, toward: number, k: number) => Math.round(c + (toward - c) * amt * k);
  return `rgb(${mix(r, 255, 1)},${mix(g, 245, 0.7)},${mix(b, 235, 0.4)})`;
}

/**
 * The shade being judged, as a lab-dip comparison chip.
 *
 * Not one colour but two: the standard (top-left) against the colour the lot
 * actually produced (bottom-right), split on the diagonal the way a physical
 * dip is read. The gap between the halves is the ΔE — near-invisible when the
 * lot is on standard, an obvious step when it is over tolerance — so the square
 * carries the same verdict as the number next to it, before the number is read.
 */
export function DyeShadeSquare({ colour, delta = 0 }: { colour: string; delta?: number }) {
  const standard = shadeStandard(colour, delta);
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0"
      title={`standard vs produced · ΔE ${delta.toFixed(1)}`}
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        background: `linear-gradient(135deg, ${standard} 0 47%, var(--surface-base) 47% 53%, ${colour} 53% 100%)`,
        boxShadow: "inset 0 0 0 1px rgba(24,24,27,.22)",
      }}
    />
  );
}

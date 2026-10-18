import { mapToGamut, oklchToHexMapped } from './gamut.js';
import { hexToOklch } from './oklab.js';

// 05_ENGINES.md §2.8.
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const LIGHTNESS = [0.97, 0.94, 0.88, 0.8, 0.71, 0.62, 0.53, 0.44, 0.35, 0.26, 0.19] as const;

export interface ScaleStep {
  readonly step: (typeof STEPS)[number];
  /** OKLCH before 8-bit rounding: hue constancy is checked on these values (§2.8). */
  readonly L: number;
  readonly C: number;
  readonly h: number;
  readonly hex: string;
}

/** Chroma weight: 1 on [0.35, 0.75], linear down to 0.25 at L = 0.97 and to 0.50 at L = 0.19. */
function chromaWeight(L: number): number {
  if (L > 0.75) return 1 - ((L - 0.75) / (0.97 - 0.75)) * 0.75;
  if (L < 0.35) return 1 - ((0.35 - L) / (0.35 - 0.19)) * 0.5;
  return 1;
}

export function buildScale(hex: string): ScaleStep[] {
  const base = hexToOklch(hex);
  // An achromatic token has no hue (ADR-021); its chroma is ~0, so any hue gives the same grey.
  const h = base.h ?? 0;
  return STEPS.map((step, index) => {
    const L = LIGHTNESS[index] ?? 0;
    const mapped = mapToGamut(L, base.C * chromaWeight(L), h);
    return { step, L, C: mapped.C, h, hex: oklchToHexMapped(mapped.L, mapped.C, mapped.h) };
  });
}

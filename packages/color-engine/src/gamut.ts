import { oklabToHex, oklabToLinearRgb } from './oklab.js';
import type { Oklab } from './types.js';

// 05_ENGINES.md §2.7: in gamut when the three linear channels lie in [−1e-6, 1 + 1e-6]; chroma reduced by
// bisection at constant L and h, 24 iterations, keeping the largest in-gamut chroma.
const GAMUT_EPSILON = 1e-6;
const BISECTION_STEPS = 24;

export interface MappedOklch {
  readonly L: number;
  readonly C: number;
  readonly h: number;
}

export function oklchToOklab(L: number, C: number, h: number): Oklab {
  const radians = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(radians), b: C * Math.sin(radians) };
}

export function isInGamut(L: number, C: number, h: number): boolean {
  const linear = oklabToLinearRgb(oklchToOklab(L, C, h));
  return [linear.r, linear.g, linear.b].every(
    (channel) => channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON,
  );
}

export function mapToGamut(L: number, C: number, h: number): MappedOklch {
  if (isInGamut(L, C, h)) return { L, C, h };
  let inside = 0;
  let outside = C;
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (inside + outside) / 2;
    if (isInGamut(L, middle, h)) inside = middle;
    else outside = middle;
  }
  return { L, C: inside, h };
}

export function oklchToHexMapped(L: number, C: number, h: number): string {
  const mapped = mapToGamut(L, C, h);
  return oklabToHex(oklchToOklab(mapped.L, mapped.C, mapped.h));
}

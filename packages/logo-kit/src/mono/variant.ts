import type { RasterError, Rasterizer } from '@app/contracts';
import { ok, type Result } from '@app/kernel';
import { exteriorLoss, structureScore } from './fidelity.js';
import {
  monochromeSvg,
  type MonoError,
  type MonoOptions,
  type MonoTarget,
  type MonoVariant,
} from './mono.js';

// Below this share of inner colour boundaries kept, a monochrome variant no longer reads as the logo.
export const STRUCTURE_THRESHOLD = 0.9;
// Gap of the separated drawing: 1.5 % of the logo's larger side (about 4 px at 256 px, a fine print line).
export const SEPARATION = 0.015;
// Knockout drawing: surfaces from this luminance on are light (lettering on a badge), instead of 0.9.
export const KNOCKOUT_LUMINANCE = 0.6;
// A drawing that removes ink may not open more than this share of the original onto the outside.
const MAX_EXTERIOR_LOSS = 0.01;

export interface MonoChoice extends MonoVariant {
  /** Which drawing was kept: the plain §5.2 one, light-ish surfaces knocked out, or separated by gaps. */
  readonly drawing: 'plain' | 'knockout' | 'separated';
  /** True when the separated drawing was kept (kept for callers of the first version). */
  readonly separated: boolean;
  /** Structure score of the returned drawing; null on the raster path (scored after vectorisation). */
  readonly structure: number | null;
}

// Tried after the plain drawing, in this order.
const ALTERNATIVES: readonly { drawing: MonoChoice['drawing']; options: MonoOptions }[] = [
  { drawing: 'knockout', options: { lightThreshold: KNOCKOUT_LUMINANCE } },
  { drawing: 'separated', options: { separation: SEPARATION } },
];

/**
 * The monochrome variant to show. Drawings are tried in order — plain §5.2, light-ish surfaces knocked out
 * (lettering on a badge), separated by gaps — and the first that keeps the logo's inner boundaries
 * (structure ≥ 0.9) wins; a drawing that removes ink must not open it onto the outside (a vanished element).
 * When none reaches the threshold, the best one is kept with MONO_STRUCTURE_LOST.
 */
export async function monochromeVariant(
  svg: string,
  target: MonoTarget,
  rasterizer: Rasterizer,
): Promise<Result<MonoChoice, MonoError | RasterError>> {
  const plain = monochromeSvg(svg, target);
  if (!plain.ok) return plain;
  if (plain.value.path !== 'structural') {
    return ok({ ...plain.value, drawing: 'plain', separated: false, structure: null });
  }
  const plainScore = await structureScore(svg, plain.value.svg, rasterizer);
  if (!plainScore.ok) return plainScore;
  let best: MonoChoice = {
    ...plain.value,
    drawing: 'plain',
    separated: false,
    structure: plainScore.value,
  };
  if (plainScore.value >= STRUCTURE_THRESHOLD) return ok(best);

  for (const candidate of ALTERNATIVES) {
    const variant = monochromeSvg(svg, target, candidate.options);
    if (!variant.ok) return variant;
    // Too many segments for this drawing, or nothing changed: the next one may still do.
    if (variant.value.path !== 'structural' || variant.value.svg === plain.value.svg) continue;
    // Knockouts remove whole surfaces: refuse them when a removed surface opens onto the outside. Separation
    // gaps reach the edge by design and only remove a line.
    if (candidate.drawing === 'knockout') {
      const loss = await exteriorLoss(svg, variant.value.svg, rasterizer);
      if (!loss.ok) return loss;
      if (loss.value > MAX_EXTERIOR_LOSS) continue;
    }
    const score = await structureScore(svg, variant.value.svg, rasterizer);
    if (!score.ok) return score;
    const choice: MonoChoice = {
      ...variant.value,
      drawing: candidate.drawing,
      separated: candidate.drawing === 'separated',
      structure: score.value,
    };
    if (score.value >= STRUCTURE_THRESHOLD) return ok(choice);
    if (score.value > (best.structure ?? 0)) best = choice;
  }
  return ok({ ...best, warnings: [...best.warnings, 'MONO_STRUCTURE_LOST'] });
}

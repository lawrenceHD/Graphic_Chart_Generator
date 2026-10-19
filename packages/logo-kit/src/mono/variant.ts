import type { RasterError, Rasterizer } from '@app/contracts';
import { ok, type Result } from '@app/kernel';
import { structureScore } from './fidelity.js';
import { monochromeSvg, type MonoError, type MonoTarget, type MonoVariant } from './mono.js';

// Below this share of inner colour boundaries kept, a monochrome variant no longer reads as the logo.
export const STRUCTURE_THRESHOLD = 0.9;
// Gap of the separated drawing: 1.5 % of the logo's larger side (about 4 px at 256 px, a fine print line).
export const SEPARATION = 0.015;

export interface MonoChoice extends MonoVariant {
  /** True when the plain drawing lost the structure and the separated one was kept instead. */
  readonly separated: boolean;
  /** Structure score of the returned drawing; null on the raster path (scored after vectorisation). */
  readonly structure: number | null;
}

/**
 * The monochrome variant to show: the plain §5.2 drawing when it keeps the logo's inner boundaries, otherwise
 * the separated drawing; MONO_STRUCTURE_LOST when even that falls short (the interface asks for a check).
 */
export async function monochromeVariant(
  svg: string,
  target: MonoTarget,
  rasterizer: Rasterizer,
): Promise<Result<MonoChoice, MonoError | RasterError>> {
  const plain = monochromeSvg(svg, target);
  if (!plain.ok) return plain;
  if (plain.value.path !== 'structural')
    return ok({ ...plain.value, separated: false, structure: null });
  const plainScore = await structureScore(svg, plain.value.svg, rasterizer);
  if (!plainScore.ok) return plainScore;
  if (plainScore.value >= STRUCTURE_THRESHOLD) {
    return ok({ ...plain.value, separated: false, structure: plainScore.value });
  }
  const separated = monochromeSvg(svg, target, { separation: SEPARATION });
  if (!separated.ok) return separated;
  if (separated.value.path !== 'structural') {
    return ok({
      ...plain.value,
      separated: false,
      structure: plainScore.value,
      warnings: [...plain.value.warnings, 'MONO_STRUCTURE_LOST'],
    });
  }
  const separatedScore = await structureScore(svg, separated.value.svg, rasterizer);
  if (!separatedScore.ok) return separatedScore;
  const best = separatedScore.value > plainScore.value;
  const chosen = best ? separated.value : plain.value;
  const score = best ? separatedScore.value : plainScore.value;
  return ok({
    ...chosen,
    separated: best,
    structure: score,
    warnings:
      score < STRUCTURE_THRESHOLD ? [...chosen.warnings, 'MONO_STRUCTURE_LOST'] : chosen.warnings,
  });
}

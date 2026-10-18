import { srgbToLinear } from '@app/color-engine';
import type { RasterError, Rasterizer } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { LIGHT_LUMINANCE } from './paint.js';

export interface RgbaRaster {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

const MIN_ALPHA = 128; // 0.5 coverage (05_ENGINES.md §5.2 raster path threshold)
const FIDELITY_WIDTH = 1024; // §5.3
const LINEAR = Array.from({ length: 256 }, (_, value) => srgbToLinear(value / 255));

function maskOf(raster: RgbaRaster, accept: (offset: number) => boolean): Uint8Array {
  const mask = new Uint8Array(raster.width * raster.height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) mask[pixel] = accept(pixel * 4) ? 1 : 0;
  return mask;
}

/** §5.3 ink mask: covered pixels (alpha ≥ 0.5) whose relative luminance is below 0.9. */
export function inkMask(raster: RgbaRaster): Uint8Array {
  const { rgba } = raster;
  return maskOf(raster, (offset) => {
    if ((rgba[offset + 3] ?? 0) < MIN_ALPHA) return false;
    const luminance =
      0.2126 * (LINEAR[rgba[offset] ?? 0] ?? 0) +
      0.7152 * (LINEAR[rgba[offset + 1] ?? 0] ?? 0) +
      0.0722 * (LINEAR[rgba[offset + 2] ?? 0] ?? 0);
    return luminance < LIGHT_LUMINANCE;
  });
}

/** Covered pixels whatever their colour: the whole of a single-colour variant. */
export function coverageMask(raster: RgbaRaster): Uint8Array {
  return maskOf(raster, (offset) => (raster.rgba[offset + 3] ?? 0) >= MIN_ALPHA);
}

/** |A ∩ B| / |A ∪ B|; two empty masks are identical (1). */
export function iou(first: Uint8Array, second: Uint8Array): number {
  if (first.length !== second.length) throw new RangeError('Masks must have the same size.');
  let intersection = 0;
  let union = 0;
  for (let index = 0; index < first.length; index += 1) {
    const a = first[index] === 1;
    const b = second[index] === 1;
    if (a && b) intersection += 1;
    if (a || b) union += 1;
  }
  return union === 0 ? 1 : intersection / union;
}

/**
 * §5.3: IoU between the original's ink and the monochrome variant's coverage, both rendered at 1024 px by
 * the injected Rasterizer. A white-only original has no ink: its coverage is compared instead.
 */
export async function fidelityScore(
  originalSvg: string,
  variantSvg: string,
  rasterizer: Rasterizer,
): Promise<Result<number, RasterError>> {
  const [original, variant] = await Promise.all([
    rasterizer.rasterize(originalSvg, FIDELITY_WIDTH),
    rasterizer.rasterize(variantSvg, FIDELITY_WIDTH),
  ]);
  if (!original.ok) return original;
  if (!variant.ok) return variant;
  if (original.value.height !== variant.value.height) {
    return err({ code: 'RASTER_FAILED', reason: 'original and variant sizes differ' });
  }
  const ink = inkMask(original.value);
  const reference = ink.includes(1) ? ink : coverageMask(original.value);
  return ok(iou(reference, coverageMask(variant.value)));
}

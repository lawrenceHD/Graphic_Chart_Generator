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

const STRUCTURE_WIDTH = 512;
// Two neighbouring solid pixels belong to different colour regions above this RGB distance (anti-aliasing
// never reaches it between solid pixels).
const REGION_DISTANCE = 48;
// A boundary survives in the variant if, within this radius, the variant shows a gap (uncovered pixel) or two
// clearly different shades.
const SEARCH_RADIUS = 2;
const SHADE_DISTANCE = 24;

const distance = (rgba: Uint8Array, a: number, b: number): number =>
  Math.abs((rgba[a] ?? 0) - (rgba[b] ?? 0)) +
  Math.abs((rgba[a + 1] ?? 0) - (rgba[b + 1] ?? 0)) +
  Math.abs((rgba[a + 2] ?? 0) - (rgba[b + 2] ?? 0));

/** Inner colour boundaries of the original: solid ink pixels whose right or lower solid neighbour differs. */
function innerBoundaries(raster: RgbaRaster, ink: Uint8Array): number[] {
  const { width, height, rgba } = raster;
  const solid = (pixel: number): boolean => ink[pixel] === 1 && (rgba[pixel * 4 + 3] ?? 0) === 255;
  const found: number[] = [];
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const pixel = y * width + x;
      if (!solid(pixel)) continue;
      for (const next of [pixel + 1, pixel + width]) {
        if (solid(next) && distance(rgba, pixel * 4, next * 4) > REGION_DISTANCE) {
          found.push(pixel);
          break;
        }
      }
    }
  }
  return found;
}

function visibleIn(raster: RgbaRaster, pixel: number): boolean {
  const { width, height, rgba } = raster;
  const x0 = pixel % width;
  const y0 = Math.floor(pixel / width);
  let reference = -1;
  for (let dy = -SEARCH_RADIUS; dy <= SEARCH_RADIUS; dy += 1) {
    for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx += 1) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const offset = (y * width + x) * 4;
      if ((rgba[offset + 3] ?? 0) < MIN_ALPHA) return true; // a gap
      if (reference < 0) reference = offset;
      else if (distance(rgba, reference, offset) > SHADE_DISTANCE) return true; // a change of shade
    }
  }
  return false;
}

/**
 * Share of the original's inner colour boundaries still visible in the variant, as a gap or a change of
 * shade (1 when the original has none). The IoU of §5.3 compares silhouettes only: a multi-colour logo whose
 * touching pieces are painted in one colour keeps its silhouette and loses its drawing; this score sees it.
 */
export async function structureScore(
  originalSvg: string,
  variantSvg: string,
  rasterizer: Rasterizer,
): Promise<Result<number, RasterError>> {
  const [original, variant] = await Promise.all([
    rasterizer.rasterize(originalSvg, STRUCTURE_WIDTH),
    rasterizer.rasterize(variantSvg, STRUCTURE_WIDTH),
  ]);
  if (!original.ok) return original;
  if (!variant.ok) return variant;
  if (original.value.height !== variant.value.height) {
    return err({ code: 'RASTER_FAILED', reason: 'original and variant sizes differ' });
  }
  const boundaries = innerBoundaries(original.value, inkMask(original.value));
  if (boundaries.length === 0) return ok(1);
  const kept = boundaries.filter((pixel) => visibleIn(variant.value, pixel)).length;
  return ok(kept / boundaries.length);
}

/**
 * Share of the original's covered pixels that a variant leaves uncovered *and open to the outside* (reached
 * from the image border through uncovered pixels). Holes cut inside the logo (lettering knocked out of a
 * badge) do not count; an element that simply vanished does. Guards the knockout candidate.
 */
export async function exteriorLoss(
  originalSvg: string,
  variantSvg: string,
  rasterizer: Rasterizer,
): Promise<Result<number, RasterError>> {
  const [original, variant] = await Promise.all([
    rasterizer.rasterize(originalSvg, STRUCTURE_WIDTH),
    rasterizer.rasterize(variantSvg, STRUCTURE_WIDTH),
  ]);
  if (!original.ok) return original;
  if (!variant.ok) return variant;
  const { width, height } = variant.value;
  if (original.value.height !== height) {
    return err({ code: 'RASTER_FAILED', reason: 'original and variant sizes differ' });
  }
  const covered = coverageMask(original.value);
  const open = coverageMask(variant.value).map((value) => 1 - value);
  // Flood the variant's uncovered pixels from the border (4-connected).
  const outside = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let x = 0; x < width; x += 1) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y += 1) stack.push(y * width, y * width + width - 1);
  while (stack.length > 0) {
    const pixel = stack.pop() ?? 0;
    if (outside[pixel] === 1 || open[pixel] !== 1) continue;
    outside[pixel] = 1;
    const x = pixel % width;
    if (x > 0) stack.push(pixel - 1);
    if (x < width - 1) stack.push(pixel + 1);
    if (pixel >= width) stack.push(pixel - width);
    if (pixel < width * (height - 1)) stack.push(pixel + width);
  }
  let total = 0;
  let lost = 0;
  for (let pixel = 0; pixel < covered.length; pixel += 1) {
    if (covered[pixel] !== 1) continue;
    total += 1;
    if (outside[pixel] === 1) lost += 1;
  }
  return ok(total === 0 ? 0 : lost / total);
}

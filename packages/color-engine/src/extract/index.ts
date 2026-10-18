import { err, ok, type Result } from '@app/kernel';
import { clusterColors, histogramOf } from './cluster.js';
import { hexOfKey, LabCache } from './lab-cache.js';
import { selectPixels } from './pixels.js';
import { hexToOklch } from '../oklab.js';
import { reduceClusters } from './reduce.js';
import type { DecodedImage, ExtractedPalette, ExtractOptions } from './types.js';

export { assignRoles, DEFAULT_ROLE_OPTIONS } from './roles.js';
export { brandClusters, VIVID_BACKGROUND_CHROMA } from './brand.js';
export type * from './types.js';

export const DEFAULT_EXTRACT_OPTIONS: ExtractOptions = {
  mergeThreshold: 0.04,
  minShare: 0.005,
  maxClusters: 8,
};

/** Deterministic palette extraction, 05_ENGINES.md §2.4 (no randomness, stable tie-breaking by hex). */
export function extractPalette(
  image: DecodedImage,
  options: Partial<ExtractOptions> = {},
): Result<ExtractedPalette, 'EMPTY_IMAGE'> {
  if (image.data.length !== image.width * image.height * 4) {
    throw new RangeError('Image data length must equal width × height × 4.');
  }
  const { mergeThreshold, minShare, maxClusters } = { ...DEFAULT_EXTRACT_OPTIONS, ...options };
  const labs = new LabCache();
  const { pixels, background } = selectPixels(image, labs);
  if (pixels.length === 0) return err('EMPTY_IMAGE');
  const raw = clusterColors(histogramOf(image, pixels, labs), mergeThreshold);
  return ok({
    clusters: reduceClusters(raw, minShare, maxClusters),
    background: background && {
      hex: hexOfKey(background.key),
      share: background.share,
      oklab: labs.lab(background.key),
      oklch: hexToOklch(hexOfKey(background.key)),
    },
  });
}

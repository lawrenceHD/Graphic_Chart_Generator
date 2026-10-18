import type { RasterError, Rasterizer } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import type { SanitizedSvg } from './index.js';
import { sanitizeSvg } from './index.js';

const round = (value: number): string => String(Math.round(value * 1000) / 1000);

/**
 * 05_ENGINES.md §3.6: completes the mandatory viewBox from the content's bounding box when sanitizeSvg
 * reported VIEWBOX_NEEDS_BBOX. Pure: the bounding box comes from the injected Rasterizer (ADR-016).
 */
export async function ensureViewBox(
  sanitized: SanitizedSvg,
  rasterizer: Rasterizer,
): Promise<Result<string, RasterError>> {
  if (!sanitized.warnings.some((warning) => warning.code === 'VIEWBOX_NEEDS_BBOX')) {
    return ok(sanitized.svg);
  }
  const box = await rasterizer.bbox(sanitized.svg);
  if (!box.ok) return box;
  const { x, y, width, height } = box.value;
  if (!(width > 0 && height > 0))
    return err({ code: 'RASTER_FAILED', reason: 'empty bounding box' });
  const viewBox = [x, y, width, height].map(round).join(' ');
  const withViewBox = sanitized.svg.replace(/^<svg /, `<svg viewBox="${viewBox}" `);
  // Sanitizing again restores the canonical attribute order, so the result stays a sanitizeSvg output.
  const canonical = sanitizeSvg(new TextEncoder().encode(withViewBox));
  return canonical.ok
    ? ok(canonical.value.svg)
    : err({ code: 'RASTER_FAILED', reason: canonical.error.reason });
}

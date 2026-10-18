// `@app/svg-engine/raster`: the only impure part of svg-engine (ADR-016). Imported by apps/worker and
// integration tests only; pure code receives a Rasterizer instead.
import type { RasterError, RasterImage, Rect } from '@app/contracts';
import type { Result } from '@app/kernel';
import { createNodeRasterizer } from './node-rasterizer.js';

export { createNodeRasterizer, type NodeRasterizerOptions } from './node-rasterizer.js';
export { normalizeRaster } from './normalize.js';

/** T-008 §2 with the default limits (5 s, 512 MB). */
export function rasterizeSvg(
  svg: string,
  width: number,
): Promise<Result<RasterImage, RasterError>> {
  return createNodeRasterizer().rasterize(svg, width);
}

/** T-008 §3: bounding box of the visible content, through the isolated child. */
export function svgBBox(svg: string): Promise<Result<Rect, RasterError>> {
  return createNodeRasterizer().bbox(svg);
}

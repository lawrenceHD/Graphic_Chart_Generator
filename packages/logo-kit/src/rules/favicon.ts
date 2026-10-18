import type { Rect } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { artworkOf, document, svgElement, type ComposeError } from './compose.js';

// 05_ENGINES.md §5.4.
const LOGO_SHARE = 0.8;
const CORNER_RADIUS = 0.18;
const EXTREME_ASPECT = 2;

export type FaviconWarning = 'FAVICON_EXTREME_ASPECT';
export interface Favicon {
  readonly svg: string;
  /** Side S of the square, in the logo's user units. */
  readonly size: number;
  readonly warnings: readonly FaviconWarning[];
}
export interface FaviconOptions {
  /** Plain background with rounded corners; transparent when absent. */
  readonly background?: string;
}

/**
 * Square favicon: S = max(W, H) / 0.8, logo centred. `bbox` is the visible content box computed by the
 * injected Rasterizer (ADR-016), so empty margins of the source never shrink the logo.
 */
export function faviconSvg(
  svg: string,
  bbox: Rect,
  options: FaviconOptions = {},
): Result<Favicon, ComposeError | 'EMPTY_BBOX'> {
  if (!(bbox.width > 0 && bbox.height > 0)) return err('EMPTY_BBOX');
  const artwork = artworkOf(svg);
  if (!artwork.ok) return artwork;
  const size = Math.max(bbox.width, bbox.height) / LOGO_SHARE;
  const dx = (size - bbox.width) / 2 - bbox.x;
  const dy = (size - bbox.height) / 2 - bbox.y;
  const children = [
    svgElement('g', { transform: `translate(${String(dx)} ${String(dy)})` }, artwork.value),
  ];
  if (options.background !== undefined) {
    const side = String(size);
    children.unshift(
      svgElement('rect', {
        width: side,
        height: side,
        rx: String(size * CORNER_RADIUS),
        fill: options.background,
      }),
    );
  }
  const aspect = bbox.width / bbox.height;
  const warnings: FaviconWarning[] =
    aspect > EXTREME_ASPECT || aspect < 1 / EXTREME_ASPECT ? ['FAVICON_EXTREME_ASPECT'] : [];
  const result = document(size, children);
  return result.ok ? ok({ svg: result.value, size, warnings }) : result;
}

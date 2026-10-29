import type { Rasterizer, Rect } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { sanitizeSvgTree } from '@app/svg-engine';
import { coverageMask } from '../mono/index.js';

// R6 and R7 of 16_GUIDELINE_RULES.md; 05_ENGINES.md §5.5.
const RESOLUTION = 1024;
/** An element may define x when its height is within this share of the logo height. */
const MIN_SHARE = 0.1;
const MAX_SHARE = 0.5;
/** Pieces smaller than this share of the ink (dots, specks) never define x nor the minimum size. */
const MIN_AREA = 0.004;
const CONVENTION_RATIO = 0.25;
/** The smallest element must keep this size at the minimum: legibility on screen and in print. */
const DETAIL_PX = 6;
const DETAIL_MM = 1.5;
/** Floors of 05_ENGINES.md §5.5, lowered for print: a wordmark is legible at 5 mm high. */
const FLOOR_PX = 24;
const FLOOR_MM = 5;

export type MeasureError = 'INVALID_SVG' | 'RENDER_FAILED' | 'EMPTY_LOGO';
export interface ClearSpaceMeasure {
  /** The unit x, in the logo's user units. */
  readonly x: number;
  /** `element`: x is the height of a real element of the logo; `convention`: 0.25 × H, said so. */
  readonly source: 'element' | 'convention';
  /** Box of the element that defines x, in user units. */
  readonly element?: Rect;
}
export interface MinimumSize {
  readonly heightPx: number;
  readonly widthPx: number;
  readonly heightMm: number;
  readonly widthMm: number;
}
export interface LogoMeasure {
  readonly bbox: Rect;
  /** Box of the symbol of a lockup (R5 E: favicon, avatar, below the minimum size); none for a mark alone. */
  readonly symbol?: Rect;
  readonly clearSpace: ClearSpaceMeasure;
  readonly minimum: MinimumSize;
}

interface Component {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly area: number;
}

// 8-connected pieces of the coverage mask, in reading order of their first pixel.
function components(mask: Uint8Array, width: number, height: number): Component[] {
  const seen = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  const found: Component[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1 || seen[start] === 1) continue;
    let size = 0;
    stack[size++] = start;
    seen[start] = 1;
    let [left, top, right, bottom, area] = [width, height, 0, 0, 0];
    while (size > 0) {
      const index = stack[--size] ?? 0;
      const x = index % width;
      const y = (index - x) / width;
      area += 1;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (mask[next] === 1 && seen[next] !== 1) {
            seen[next] = 1;
            stack[size++] = next;
          }
        }
      }
    }
    found.push({ left, top, right, bottom, area });
  }
  return found;
}

/** A gap separates a symbol from its name when it is at least this share of the logo height. */
const MIN_GAP = 0.04;
/** The name has at least this many pieces, the symbol at most half as many. */
const MIN_NAME_PIECES = 3;

// Splits the pieces at the widest empty band across one axis; the symbol is the side with few pieces
// facing a name of several letters. A mark of equal pieces or a single piece has no separable symbol.
function symbolOf(pieces: readonly Component[], pixelsHigh: number): Component[] | undefined {
  let best: { gap: number; sides: [Component[], Component[]] } | undefined;
  for (const [start, end] of [
    ['left', 'right'],
    ['top', 'bottom'],
  ] as const) {
    const sorted = [...pieces].sort((a, b) => a[start] - b[start]);
    let reach = -Infinity;
    sorted.forEach((piece, index) => {
      const gap = piece[start] - reach;
      if (index > 0 && gap >= pixelsHigh * MIN_GAP && gap > (best?.gap ?? 0))
        best = { gap, sides: [sorted.slice(0, index), sorted.slice(index)] };
      reach = Math.max(reach, piece[end]);
    });
  }
  if (best === undefined) return undefined;
  const [first, second] = best.sides;
  const [symbol, name] = first.length <= second.length ? [first, second] : [second, first];
  return name.length >= MIN_NAME_PIECES && symbol.length * 2 <= name.length ? symbol : undefined;
}

const halfUp = (value: number): number => Math.ceil(value * 2) / 2;

/**
 * Measures the logo as a designer does for the clear space and minimum size pages: x is the height of the
 * first letter-sized element in reading order (R6), the minimum keeps its smallest element legible (R7).
 */
export async function measureLogo(
  svg: string,
  rasterizer: Rasterizer,
): Promise<Result<LogoMeasure, MeasureError>> {
  const tree = sanitizeSvgTree(new TextEncoder().encode(svg));
  if (!tree.ok) return err('INVALID_SVG');
  const box = (tree.value.root.attributes.get('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const [vx = 0, vy = 0, vw = 0, vh = 0] = box;
  if (box.length !== 4 || !box.every(Number.isFinite) || !(vw > 0 && vh > 0))
    return err('INVALID_SVG');
  const raster = await rasterizer.rasterize(svg, RESOLUTION);
  if (!raster.ok) return err('RENDER_FAILED');
  const { width, height } = raster.value;
  const pieces = components(coverageMask(raster.value), width, height);
  const ink = pieces.reduce((sum, piece) => sum + piece.area, 0);
  if (ink === 0) return err('EMPTY_LOGO');

  const sx = vw / width;
  const sy = vh / height;
  const rect = (piece: Component): Rect => ({
    x: vx + piece.left * sx,
    y: vy + piece.top * sy,
    width: (piece.right - piece.left) * sx,
    height: (piece.bottom - piece.top) * sy,
  });
  const top = Math.min(...pieces.map((piece) => piece.top));
  const bottom = Math.max(...pieces.map((piece) => piece.bottom));
  const left = Math.min(...pieces.map((piece) => piece.left));
  const right = Math.max(...pieces.map((piece) => piece.right));
  const bbox = rect({ left, top, right, bottom, area: ink });
  const span = (group: readonly Component[]): Rect =>
    rect({
      left: Math.min(...group.map((piece) => piece.left)),
      top: Math.min(...group.map((piece) => piece.top)),
      right: Math.max(...group.map((piece) => piece.right)),
      bottom: Math.max(...group.map((piece) => piece.bottom)),
      area: 0,
    });
  const pixelsHigh = bottom - top;

  const significant = pieces.filter((piece) => piece.area >= ink * MIN_AREA);
  const sized = significant.filter((piece) => {
    const share = (piece.bottom - piece.top) / pixelsHigh;
    return share >= MIN_SHARE && share <= MAX_SHARE;
  });
  const reference = [...sized].sort((a, b) => a.left - b.left || a.top - b.top)[0];
  const clearSpace: ClearSpaceMeasure =
    reference === undefined
      ? { x: CONVENTION_RATIO * bbox.height, source: 'convention' }
      : { x: rect(reference).height, source: 'element', element: rect(reference) };

  // The typical element (lower median of the letter-sized pieces), so that a dot or a leaf does not
  // inflate the minimum: what must stay legible is a letter of the name.
  const heights = significant
    .map((piece) => piece.bottom - piece.top)
    .filter((pixels) => pixels >= pixelsHigh * MIN_SHARE)
    .sort((a, b) => a - b);
  const detail = heights[Math.floor((heights.length - 1) / 2)] ?? pixelsHigh;
  const ratio = pixelsHigh / detail;
  const heightPx = Math.max(FLOOR_PX, Math.ceil(DETAIL_PX * ratio));
  const heightMm = Math.max(FLOOR_MM, halfUp(DETAIL_MM * ratio));
  const aspect = bbox.width / bbox.height;
  const symbol = symbolOf(significant, pixelsHigh);
  return ok({
    bbox,
    ...(symbol === undefined ? {} : { symbol: span(symbol) }),
    clearSpace,
    minimum: {
      heightPx,
      widthPx: Math.ceil(heightPx * aspect),
      heightMm,
      widthMm: halfUp(heightMm * aspect),
    },
  });
}

import { hexToOklch, relativeLuminance, VIVID_BACKGROUND_CHROMA } from '@app/color-engine';
import type { RasterError, Rasterizer } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import {
  isSvgElement,
  sanitizeSvg,
  sanitizeSvgTree,
  serializeSvg,
  type SvgElement,
  type SvgNode,
} from '@app/svg-engine';
import type { MonoError } from './mono.js';
import { paintKey } from './paint.js';

// Share of the canvas a shape must cover, alone and opaque, to be a backdrop: a rounded app tile (≈ 96 %)
// stays the logo.
const FULL_BLEED = 0.99;
// Leading shapes examined: a PDF export puts at most the page and a panel or two under the logo.
const MAX_LEADING = 4;
const PROBE_WIDTH = 64;
// A page or panel is light: the luminance from which the knockout drawing treats a surface as light.
const LIGHT_PAGE = 0.6;
// Content that is never painted where it stands.
const UNPAINTED = new Set([
  'defs',
  'clipPath',
  'mask',
  'symbol',
  'pattern',
  'linearGradient',
  'radialGradient',
  'marker',
  'filter',
]);
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'use']);

interface Painted {
  readonly shape: SvgElement;
  readonly fill: string;
  readonly stroke: string;
}

function painted(node: SvgElement, fill: string, stroke: string): Painted[] {
  return node.children.filter(isSvgElement).flatMap((child) => {
    if (UNPAINTED.has(child.name)) return [];
    const ownFill = child.attributes.get('fill') ?? fill;
    const ownStroke = child.attributes.get('stroke') ?? stroke;
    return SHAPES.has(child.name)
      ? [{ shape: child, fill: ownFill, stroke: ownStroke }]
      : painted(child, ownFill, ownStroke);
  });
}

// Copy of the tree without the painted shapes `drop` selects; unpainted content (defs, clips) stays.
function filtered(node: SvgElement, drop: (shape: SvgElement) => boolean): SvgElement {
  const children = node.children.flatMap((child): SvgNode[] => {
    if (!isSvgElement(child)) return [child];
    if (UNPAINTED.has(child.name)) return [child];
    if (SHAPES.has(child.name)) return drop(child) ? [] : [child];
    return [filtered(child, drop)];
  });
  return { ...node, children };
}

function canonical(root: SvgElement): Result<string, MonoError> {
  const result = sanitizeSvg(new TextEncoder().encode(serializeSvg(root)));
  return result.ok ? ok(result.value.svg) : err({ code: 'INVALID_SVG', reason: result.error.code });
}

// A light plain colour that is not vivid, without outline: white page, light grey or pastel panel. A vivid
// flat is the brand colour the logo is shown on (decision B), a dark square is a badge: both stay.
function isPagePaint({ fill, stroke }: Painted): boolean {
  const key = paintKey(fill);
  if (paintKey(stroke) !== undefined || key === undefined || !/^#[0-9a-f]{6}$/.test(key))
    return false;
  const hex = key.toUpperCase();
  return hexToOklch(hex).C < VIVID_BACKGROUND_CHROMA && relativeLuminance(hex) >= LIGHT_PAGE;
}

async function fillsCanvas(
  root: SvgElement,
  shape: SvgElement,
  rasterizer: Rasterizer,
): Promise<Result<boolean, MonoError | RasterError>> {
  const alone = filtered(root, (other) => other !== shape);
  const svg = canonical({
    ...alone,
    children: alone.children.map((child) => (isSvgElement(child) ? opaque(child, shape) : child)),
  });
  if (!svg.ok) return svg;
  const image = await rasterizer.rasterize(svg.value, PROBE_WIDTH);
  if (!image.ok) return image;
  const { rgba } = image.value;
  let covered = 0;
  for (let offset = 3; offset < rgba.length; offset += 4)
    if ((rgba[offset] ?? 0) >= 250) covered += 1;
  return ok(covered / (rgba.length / 4) >= FULL_BLEED);
}

// The probed shape painted opaque black wherever it sits, so a light fill still counts as coverage.
function opaque(node: SvgElement, shape: SvgElement): SvgElement {
  if (node === shape) {
    const attributes = new Map(node.attributes);
    attributes.set('fill', '#000000');
    return { ...node, attributes };
  }
  return {
    ...node,
    children: node.children.map((child) => (isSvgElement(child) ? opaque(child, shape) : child)),
  };
}

/**
 * The logo without the presentation backdrop it was extracted with (PDF charters): the leading shapes,
 * painted before anything else, in a neutral plain colour and filling the whole canvas. A rounded tile, a
 * vivid flat, a later light surface (a knockout) and a logo made only of such shapes are kept.
 */
export async function withoutBackdrop(
  svg: string,
  rasterizer: Rasterizer,
): Promise<Result<string, MonoError | RasterError>> {
  const tree = sanitizeSvgTree(new TextEncoder().encode(svg));
  if (!tree.ok) return err({ code: 'INVALID_SVG', reason: tree.error.code });
  const root = tree.value.root;
  const shapes = painted(
    root,
    root.attributes.get('fill') ?? 'black',
    root.attributes.get('stroke') ?? 'none',
  );
  const backdrop = new Set<SvgElement>();
  for (const entry of shapes.slice(0, MAX_LEADING)) {
    const { shape } = entry;
    if (shape.name === 'use' || !isPagePaint(entry)) break;
    const covers = await fillsCanvas(root, shape, rasterizer);
    if (!covers.ok) return covers;
    if (!covers.value) break;
    backdrop.add(shape);
  }
  if (backdrop.size === 0 || backdrop.size === shapes.length) return ok(svg);
  return canonical(filtered(root, (shape) => backdrop.has(shape)));
}

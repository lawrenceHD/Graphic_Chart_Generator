import { err, ok, type Result } from '@app/kernel';
import {
  isSvgElement,
  sanitizeSvg,
  sanitizeSvgTree,
  serializeSvg,
  type SvgElement,
  type SvgNode,
} from '@app/svg-engine';
import { LIGHT_LUMINANCE, readPaint, stopLuminance, type Paint } from './paint.js';

export type MonoTarget = '#000000' | '#FFFFFF';
export type MonoWarning = 'LIGHT_SURFACES_KNOCKED_OUT';
export interface MonoVariant {
  readonly svg: string;
  readonly path: 'structural' | 'raster-fallback-needed';
  readonly warnings: readonly MonoWarning[];
}
export interface MonoError {
  readonly code: 'INVALID_SVG';
  readonly reason: string;
}

const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const PAINT_SERVERS = new Set(['linearGradient', 'radialGradient', 'pattern']);
const RASTER_ONLY = new Set(['mask', 'filter']);
// Large enough for any logo coordinates: the knockout mask must never clip the artwork.
const MASK_EXTENT = { x: '-100000', y: '-100000', width: '200000', height: '200000' };

interface Context {
  readonly fill: string;
  readonly stroke: string;
  readonly transform: string;
}
const ROOT: Context = { fill: 'black', stroke: 'none', transform: '' };

function* walk(element: SvgElement): Generator<SvgElement> {
  yield element;
  for (const child of element.children) if (isSvgElement(child)) yield* walk(child);
}
const element = (
  name: string,
  attributes: Map<string, string>,
  children: SvgNode[] = [],
): SvgElement => ({
  name,
  attributes,
  styled: new Set(),
  children,
});

function childContext(node: SvgElement, context: Context): Context {
  const own = node.attributes.get('transform');
  return {
    fill: node.attributes.get('fill') ?? context.fill,
    stroke: node.attributes.get('stroke') ?? context.stroke,
    transform: own === undefined ? context.transform : `${context.transform} ${own}`.trim(),
  };
}

export function monochromeSvg(svg: string, target: MonoTarget): Result<MonoVariant, MonoError> {
  const tree = sanitizeSvgTree(new TextEncoder().encode(svg));
  if (!tree.ok) return err({ code: 'INVALID_SVG', reason: tree.error.code });
  const root = tree.value.root;
  if ([...walk(root)].some((node) => RASTER_ONLY.has(node.name))) {
    return ok({ svg: serializeSvg(root), path: 'raster-fallback-needed', warnings: [] });
  }

  // A gradient or pattern counts as one surface whose luminance is the mean of its stops.
  const servers = new Map<string, number>();
  for (const node of walk(root)) {
    const id = node.attributes.get('id');
    if (id === undefined || !PAINT_SERVERS.has(node.name)) continue;
    const stops = node.children.filter(isSvgElement).filter((child) => child.name === 'stop');
    const luminances = stops.map((stop) => stopLuminance(stop.attributes.get('stop-color')));
    servers.set(
      id,
      luminances.length === 0 ? 0 : luminances.reduce((a, b) => a + b, 0) / luminances.length,
    );
  }
  const luminance = (paint: Paint): number | undefined =>
    paint.kind === 'none'
      ? undefined
      : paint.kind === 'color'
        ? paint.luminance
        : (servers.get(paint.id) ?? 0);
  const surfaces = (context: Context): number[] =>
    [readPaint(context.fill), readPaint(context.stroke)].flatMap((paint) => luminance(paint) ?? []);
  const isLight = (context: Context): boolean => {
    const parts = surfaces(context);
    return parts.length > 0 && parts.every((value) => value >= LIGHT_LUMINANCE);
  };

  // §5.1: light surfaces become holes only when the logo has some ink; a white-only logo keeps them.
  let hasInk = false;
  const visit = (node: SvgElement, context: Context): void => {
    if (node.name === 'clipPath' || PAINT_SERVERS.has(node.name)) return;
    const inner = childContext(node, context);
    if (SHAPES.has(node.name) && surfaces(inner).some((value) => value < LIGHT_LUMINANCE))
      hasInk = true;
    for (const child of node.children) if (isSvgElement(child)) visit(child, inner);
  };
  visit(root, ROOT);

  const knockouts: SvgElement[] = [];
  const paint = (node: SvgElement, context: Context, colour: string): Map<string, string> => {
    const attributes = new Map(node.attributes);
    attributes.delete('fill');
    attributes.delete('stroke');
    attributes.set('fill', readPaint(context.fill).kind === 'none' ? 'none' : colour);
    if (readPaint(context.stroke).kind !== 'none') attributes.set('stroke', colour);
    return attributes;
  };
  const rebuild = (node: SvgElement, context: Context): SvgNode | null => {
    if (PAINT_SERVERS.has(node.name)) return null; // every fill and stroke now uses the target colour
    if (node.name === 'clipPath') return node; // geometry only, never painted
    const inner = childContext(node, context);
    if (SHAPES.has(node.name)) {
      if (hasInk && isLight(inner)) {
        const hole = paint(node, inner, '#000000');
        if (inner.transform !== '') hole.set('transform', inner.transform);
        knockouts.push(element(node.name, hole));
        return null;
      }
      return element(node.name, paint(node, inner, target));
    }
    const attributes = new Map(node.attributes);
    attributes.delete('fill');
    attributes.delete('stroke');
    const children = node.children.flatMap((child) => {
      if (!isSvgElement(child)) return [child];
      const rebuilt = rebuild(child, inner);
      return rebuilt === null ? [] : [rebuilt];
    });
    return element(node.name, attributes, children);
  };
  const rebuilt = rebuild(root, ROOT);
  if (rebuilt === null || !isSvgElement(rebuilt))
    return err({ code: 'INVALID_SVG', reason: 'empty root' });

  let output = rebuilt;
  const warnings: MonoWarning[] = [];
  if (knockouts.length > 0) {
    output = withKnockout(
      rebuilt,
      knockouts,
      new Set([...walk(root)].flatMap((node) => node.attributes.get('id') ?? [])),
    );
    warnings.push('LIGHT_SURFACES_KNOCKED_OUT');
  }
  const canonical = sanitizeSvg(new TextEncoder().encode(serializeSvg(output)));
  if (!canonical.ok) return err({ code: 'INVALID_SVG', reason: canonical.error.code });
  return ok({ svg: canonical.value.svg, path: 'structural', warnings });
}

// Wraps the artwork in a mask that is white everywhere except under the light shapes (black = hole).
function withKnockout(
  root: SvgElement,
  holes: readonly SvgElement[],
  ids: ReadonlySet<string>,
): SvgElement {
  let id = 'logo-kit-knockout';
  for (let suffix = 2; ids.has(id); suffix += 1) id = `logo-kit-knockout-${String(suffix)}`;
  const extent = new Map(Object.entries(MASK_EXTENT));
  const mask = element('mask', new Map([['id', id], ['maskUnits', 'userSpaceOnUse'], ...extent]), [
    element('rect', new Map([...extent, ['fill', '#FFFFFF']])),
    ...holes,
  ]);
  const kept = root.children.filter(
    (child) => isSvgElement(child) && (child.name === 'title' || child.name === 'desc'),
  );
  const artwork = root.children.filter((child) => !kept.includes(child));
  return element(root.name, new Map(root.attributes), [
    ...kept,
    element('defs', new Map(), [mask]),
    element('g', new Map([['mask', `url(#${id})`]]), artwork),
  ]);
}

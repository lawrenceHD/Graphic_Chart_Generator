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
// Beyond this many segments the nested masks get too deep to render cheaply: raster path instead.
const MAX_SEGMENTS = 64;
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

/** §5.2 black or white variant. */
export function monochromeSvg(svg: string, target: MonoTarget): Result<MonoVariant, MonoError> {
  return recolorSvg(svg, target);
}

/** Same structural recolouring in any #RRGGBB colour (Do & Don't recolour panel, §5.6). */
export function recolorSvg(svg: string, target: string): Result<MonoVariant, MonoError> {
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

  const paint = (node: SvgElement, context: Context, colour: string): Map<string, string> => {
    const attributes = new Map(node.attributes);
    attributes.delete('fill');
    attributes.delete('stroke');
    attributes.set('fill', readPaint(context.fill).kind === 'none' ? 'none' : colour);
    if (readPaint(context.stroke).kind !== 'none') attributes.set('stroke', colour);
    return attributes;
  };
  // Paint order matters: a light shape is a hole only in the ink painted before it, never in the ink
  // drawn on top of it (a light badge under a dark mark). Light shapes after some ink form a boundary
  // (consecutive ones share it; those before any ink knock out nothing). Segment k is the ink between
  // boundaries k-1 and k; one rebuild per segment keeps its ink with the group structure around it.
  interface Pass {
    boundary: number; // segment of the ink being visited
    inked: boolean; // some ink already painted
    open: boolean; // light shapes met since the last ink: the next ink starts a new segment
  }
  const boundaries: SvgElement[][] = [];
  const spans = new Map<SvgElement, number>(); // number of segments each group is copied into
  const rebuild = (
    node: SvgElement,
    context: Context,
    segment: number,
    pass: Pass,
  ): SvgNode | null => {
    if (PAINT_SERVERS.has(node.name)) return null; // every fill and stroke now uses the target colour
    if (node.name === 'clipPath') return segment === 0 ? node : null; // geometry only, defined once
    const inner = childContext(node, context);
    if (SHAPES.has(node.name)) {
      if (hasInk && isLight(inner)) {
        if (!pass.inked) return null;
        pass.open = true;
        if (segment === 0) {
          const hole = paint(node, inner, '#000000');
          if (inner.transform !== '') hole.set('transform', inner.transform);
          (boundaries[pass.boundary] ??= []).push(element(node.name, hole));
        }
        return null;
      }
      if (pass.open) pass.boundary += 1;
      pass.open = false;
      pass.inked = true;
      return pass.boundary === segment ? element(node.name, paint(node, inner, target)) : null;
    }
    const attributes = new Map(node.attributes);
    attributes.delete('fill');
    attributes.delete('stroke');
    const elements = node.children.filter(isSvgElement);
    if (elements.length === 0 && node !== root) {
      // Other painted leaves (`use`, `text`): target colour inherited from the variant, own colour dropped.
      return pass.boundary === segment ? element(node.name, attributes, [...node.children]) : null;
    }
    if (segment > 0) attributes.delete('id'); // ids stay unique: later copies of a group are anonymous
    const children = node.children.flatMap((child) => {
      if (!isSvgElement(child)) return [child];
      const rebuilt = rebuild(child, inner, segment, pass);
      return rebuilt === null ? [] : [rebuilt];
    });
    if (node !== root && elements.length > 0 && !children.some(isSvgElement)) return null;
    spans.set(node, (spans.get(node) ?? 0) + 1);
    return element(node.name, attributes, children);
  };
  const fresh = (): Pass => ({ boundary: 0, inked: false, open: false });
  const first = rebuild(root, ROOT, 0, fresh());
  if (first === null || !isSvgElement(first))
    return err({ code: 'INVALID_SVG', reason: 'empty root' });

  let output = first;
  const warnings: MonoWarning[] = [];
  if (boundaries.length > 0) {
    // A split the structural path cannot render faithfully goes to the raster path (§5.2): too many
    // segments, a `use` whose target may be copied, a group whose opacity would be applied per segment.
    const fallback: Result<MonoVariant, MonoError> = ok({
      svg: serializeSvg(root),
      path: 'raster-fallback-needed',
      warnings: [],
    });
    if (boundaries.length > MAX_SEGMENTS || [...walk(root)].some((node) => node.name === 'use')) {
      return fallback;
    }
    const segments = [first];
    for (let segment = 1; segment < boundaries.length + 1; segment += 1) {
      const copy = rebuild(root, ROOT, segment, fresh());
      segments.push(copy !== null && isSvgElement(copy) ? copy : element(root.name, new Map()));
    }
    const splitsCompositing = [...spans].some(
      ([node, count]) => count > 1 && node !== root && node.attributes.has('opacity'),
    );
    if (splitsCompositing) return fallback;
    output = withKnockouts(
      first,
      segments,
      boundaries,
      new Set([...walk(root)].flatMap((node) => node.attributes.get('id') ?? [])),
    );
    warnings.push('LIGHT_SURFACES_KNOCKED_OUT');
  }
  const canonical = sanitizeSvg(new TextEncoder().encode(serializeSvg(output)));
  if (!canonical.ok) return err({ code: 'INVALID_SVG', reason: canonical.error.code });
  return ok({ svg: canonical.value.svg, path: 'structural', warnings });
}

// Masks nest: segment 0 is wrapped in mask 0 (the holes of boundary 0), then together with segment 1 in
// mask 1, and so on, so each segment is masked by every boundary painted after it while each hole is
// written once (output linear in the number of light shapes). The last segment is not masked.
function withKnockouts(
  root: SvgElement,
  segments: readonly SvgElement[],
  boundaries: readonly (readonly SvgElement[])[],
  ids: ReadonlySet<string>,
): SvgElement {
  const free = (wanted: string): string => {
    let id = wanted;
    for (let suffix = 2; ids.has(id); suffix += 1) id = `${wanted}-${String(suffix)}`;
    return id;
  };
  const extent = new Map(Object.entries(MASK_EXTENT));
  const isMeta = (child: SvgNode): boolean =>
    isSvgElement(child) && (child.name === 'title' || child.name === 'desc');
  const artwork = (segment: SvgElement | undefined): SvgNode[] =>
    (segment?.children ?? []).filter((child) => !isMeta(child));
  const masks: SvgElement[] = [];
  let painted = artwork(segments[0]);
  boundaries.forEach((holes, index) => {
    const id = free(`logo-kit-knockout-${String(index + 1)}`);
    masks.push(
      element('mask', new Map([['id', id], ['maskUnits', 'userSpaceOnUse'], ...extent]), [
        element('rect', new Map([...extent, ['fill', '#FFFFFF']])),
        ...holes,
      ]),
    );
    const masked = painted.some(isSvgElement)
      ? [element('g', new Map([['mask', `url(#${id})`]]), painted)]
      : [];
    painted = [...masked, ...artwork(segments[index + 1])];
  });
  return element(root.name, new Map(root.attributes), [
    ...segments.flatMap((segment) => segment.children.filter(isMeta)),
    element('defs', new Map(), masks),
    ...painted,
  ]);
}

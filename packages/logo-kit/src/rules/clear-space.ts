import type { Rect } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { artworkOf, finish, svgElement, type ComposeError } from './compose.js';

// 05_ENGINES.md §5.5: X is a presentation convention, ratio × logo height, ratio in [0.10, 0.50].
const MIN_RATIO = 0.1;
const MAX_RATIO = 0.5;

export interface ClearSpace {
  readonly x: number;
  readonly zone: Rect;
}

export function clearSpace(bbox: Rect, ratio: number): Result<ClearSpace, 'VALUE_OUT_OF_RANGE'> {
  if (!(ratio >= MIN_RATIO && ratio <= MAX_RATIO)) return err('VALUE_OUT_OF_RANGE');
  const x = ratio * bbox.height;
  return ok({
    x,
    zone: { x: bbox.x - x, y: bbox.y - x, width: bbox.width + 2 * x, height: bbox.height + 2 * x },
  });
}

/** Logo, dashed exclusion zone and four X × X squares in the corners of the zone. */
export function clearSpaceDiagramSvg(
  svg: string,
  bbox: Rect,
  ratio: number,
  ink = '#000000',
): Result<string, ComposeError | 'VALUE_OUT_OF_RANGE'> {
  const space = clearSpace(bbox, ratio);
  if (!space.ok) return space;
  const artwork = artworkOf(svg);
  if (!artwork.ok) return artwork;
  const { x, zone } = space.value;
  const side = String(x);
  const corners = [
    [zone.x, zone.y],
    [zone.x + zone.width - x, zone.y],
    [zone.x, zone.y + zone.height - x],
    [zone.x + zone.width - x, zone.y + zone.height - x],
  ].map(([left, top]) =>
    svgElement('rect', {
      x: String(left),
      y: String(top),
      width: side,
      height: side,
      fill: ink,
      'fill-opacity': '0.25',
    }),
  );
  const outline = svgElement('rect', {
    x: String(zone.x),
    y: String(zone.y),
    width: String(zone.width),
    height: String(zone.height),
    fill: 'none',
    stroke: ink,
    'stroke-width': String(x / 20),
    'stroke-dasharray': `${String(x / 5)} ${String(x / 10)}`,
  });
  const margin = x / 2;
  const viewBox = [
    zone.x - margin,
    zone.y - margin,
    zone.width + 2 * margin,
    zone.height + 2 * margin,
  ];
  return finish(
    svgElement('svg', { viewBox: viewBox.map(String).join(' ') }, [
      ...artwork.value,
      outline,
      ...corners,
    ]),
  );
}

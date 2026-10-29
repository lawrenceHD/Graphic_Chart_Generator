import type { Rect } from '@app/contracts';
import { ok, type Result } from '@app/kernel';
import type { SvgNode } from '@app/svg-engine';
import { artworkOf, finish, svgElement, type ComposeError } from './compose.js';
import type { LogoMeasure } from './measure.js';

// R6 of 16_GUIDELINE_RULES.md: the clear space plate of the real charters (Instacart p15, BlaBlaCar p10).
const GHOST_OPACITY = '0.18';
const ELEMENT_CLIP = 'charta-x-element';

export interface PlateLabel {
  readonly text: 'x';
  /** Centre of the label, in the plate's user units: the page sets it in its own typeface. */
  readonly x: number;
  readonly y: number;
}
export interface ClearSpacePlate {
  readonly svg: string;
  readonly zone: Rect;
  readonly viewBox: readonly [number, number, number, number];
  /** Sanitized SVGs carry no text (05_ENGINES.md §3.2): the labels are positioned for the page. */
  readonly labels: readonly PlateLabel[];
}

const n = (value: number): string => String(Math.round(value * 1000) / 1000);
const line = (x1: number, y1: number, x2: number, y2: number, attributes: Record<string, string>) =>
  svgElement('line', { x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2), ...attributes });

/** Logo, its zone, the element that defines x set as a ghost on each side, and two dimension lines. */
export function clearSpacePlateSvg(
  svg: string,
  measure: LogoMeasure,
  ink = '#000000',
): Result<ClearSpacePlate, ComposeError> {
  const artwork = artworkOf(svg);
  if (!artwork.ok) return artwork;
  const { bbox, clearSpace } = measure;
  const { x } = clearSpace;
  const zone = {
    x: bbox.x - x,
    y: bbox.y - x,
    width: bbox.width + 2 * x,
    height: bbox.height + 2 * x,
  };
  const hair = n(x / 40);
  const nodes: SvgNode[] = [...artwork.value];
  nodes.push(
    svgElement('rect', {
      x: n(zone.x),
      y: n(zone.y),
      width: n(zone.width),
      height: n(zone.height),
      fill: 'none',
      stroke: ink,
      'stroke-opacity': '0.55',
      'stroke-width': hair,
      'stroke-dasharray': `${n(x / 8)} ${n(x / 12)}`,
    }),
  );

  const element = clearSpace.element;
  if (element === undefined) {
    // Convention: four x × x squares in the corners of the zone, as 05_ENGINES.md §5.5 drew it.
    for (const [left, top] of [
      [zone.x, zone.y],
      [zone.x + zone.width - x, zone.y],
      [zone.x, zone.y + zone.height - x],
      [zone.x + zone.width - x, zone.y + zone.height - x],
    ] as const) {
      nodes.push(
        svgElement('rect', {
          x: n(left),
          y: n(top),
          width: n(x),
          height: n(x),
          fill: ink,
          'fill-opacity': '0.2',
        }),
      );
    }
  } else {
    nodes.unshift(
      svgElement('defs', {}, [
        svgElement('clipPath', { id: ELEMENT_CLIP }, [
          svgElement('rect', {
            x: n(element.x),
            y: n(element.y),
            width: n(element.width),
            height: n(element.height),
          }),
        ]),
      ]),
    );
    const ex = element.x + element.width / 2;
    const ey = element.y + element.height / 2;
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const ghosts: [number, number, number][] = [
      [cx, bbox.y - x / 2, 0],
      [cx, bbox.y + bbox.height + x / 2, 0],
      [bbox.x - x / 2, cy, -90],
      [bbox.x + bbox.width + x / 2, cy, 90],
    ];
    for (const [tx, ty, angle] of ghosts) {
      const turn = angle === 0 ? '' : ` rotate(${String(angle)})`;
      nodes.push(
        svgElement(
          'g',
          {
            opacity: GHOST_OPACITY,
            transform: `translate(${n(tx)} ${n(ty)})${turn} translate(${n(-ex)} ${n(-ey)})`,
          },
          [svgElement('g', { 'clip-path': `url(#${ELEMENT_CLIP})` }, artwork.value)],
        ),
      );
    }
  }

  // Dimension lines outside the zone: one across the top margin, one across the left margin.
  const tick = x / 6;
  const cote = { stroke: ink, 'stroke-width': hair };
  const vx = zone.x + zone.width + x * 0.4;
  const hy = zone.y + zone.height + x * 0.4;
  nodes.push(
    line(vx, zone.y, vx, bbox.y, cote),
    line(vx - tick, zone.y, vx + tick, zone.y, cote),
    line(vx - tick, bbox.y, vx + tick, bbox.y, cote),
    line(zone.x, hy, bbox.x, hy, cote),
    line(zone.x, hy - tick, zone.x, hy + tick, cote),
    line(bbox.x, hy - tick, bbox.x, hy + tick, cote),
  );
  const labels: PlateLabel[] = [
    { text: 'x', x: vx + x * 0.3, y: (zone.y + bbox.y) / 2 },
    { text: 'x', x: (zone.x + bbox.x) / 2, y: hy + x * 0.3 },
  ];

  const viewBox = [
    zone.x - x * 0.3,
    zone.y - x * 0.3,
    zone.width + x * 1.2,
    zone.height + x * 1.2,
  ] as const;
  const built = finish(svgElement('svg', { viewBox: viewBox.map(n).join(' ') }, nodes));
  return built.ok ? ok({ svg: built.value, zone, viewBox, labels }) : built;
}

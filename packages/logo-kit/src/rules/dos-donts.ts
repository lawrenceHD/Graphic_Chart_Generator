import { contrastRatio, hexToOklch, oklchToHexMapped } from '@app/color-engine';
import type { Rect } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { isSvgElement, type SvgElement, type SvgNode } from '@app/svg-engine';
import { recolorSvg } from '../mono/index.js';
import { paintKey, readPaint } from '../mono/paint.js';
import { artworkOf, document, svgElement, type ComposeError } from './compose.js';

// 05_ENGINES.md §5.6, ADR-021 and R8 of 16_GUIDELINE_RULES.md.
const DISTORT_SCALE = 1.4;
const SQUASH_SCALE = 0.65;
const ROTATION_DEG = -15;
const PANEL_SCALE = 1.6;
const MIN_HUE_GAP = 60;
const CHROMATIC = 0.04;
const RECOLOR_L = 0.6;
const RECOLOR_C = 0.15;
const MAX_BAD_CONTRAST = 3;
const OUTLINE_WIDTH = 0.003;
const TRANSPARENCY = 0.3;
const CROP_SHIFT = 0.32;
/** Red of the diagonal strike every misuse thumbnail carries (R8), whatever the palette. */
export const STRIKE_RED = '#E0322B';
const STRIKE_HALO = '#FFFFFF';
/** Grey of the stand-in text lines of the crowd panel. */
const TEXT_GREY = '#9AA0A6';

export interface PaletteHexes {
  readonly primary: string;
  readonly accent: string;
  readonly neutralLight: string;
  readonly neutralDark: string;
  readonly extra: readonly string[];
}
/** R8 cases, by priority: the order of the grid. */
export const DONT_KINDS = [
  'distort',
  'squash',
  'rotate',
  'recolor',
  'partial-recolor',
  'outline',
  'shadow',
  'transparency',
  'bad-background',
  'busy-background',
  'crop',
  'crowd',
] as const;
export type DontKind = (typeof DONT_KINDS)[number];
export interface DontPanel {
  readonly kind: DontKind;
  readonly svg: string;
  /** i18n key of the visible caption: sanitized SVGs carry no <text> (05_ENGINES.md §3.2). */
  readonly labelKey: `logo.dont.${DontKind}`;
  /** Background of the tile: the light neutral, or the faulty one of bad-background. */
  readonly background: string;
}

const gap = (a: number, b: number): number => {
  const raw = Math.abs(a - b) % 360;
  return Math.min(raw, 360 - raw);
};

/** First hue (hp + 90 + 30k) at ≥ 60° from every chromatic palette hue, else the one maximising the minimum. */
export function offPaletteHue(palette: PaletteHexes, fallbackHue = 265): number {
  const tokens = [
    palette.primary,
    palette.accent,
    palette.neutralLight,
    palette.neutralDark,
    ...palette.extra,
  ];
  const hues = tokens.flatMap((hex) => {
    const { C, h } = hexToOklch(hex);
    return C >= CHROMATIC && h !== null ? [h] : [];
  });
  const primary = hexToOklch(palette.primary);
  const hp = primary.C >= CHROMATIC && primary.h !== null ? primary.h : fallbackHue;
  const minimalGap = (hue: number): number =>
    Math.min(360, ...hues.map((other) => gap(hue, other)));
  let best = { hue: (hp + 90) % 360, gap: -1 };
  for (let k = 0; k < 12; k += 1) {
    const hue = (hp + 90 + 30 * k) % 360;
    const candidate = minimalGap(hue);
    if (candidate >= MIN_HUE_GAP) return hue;
    if (candidate > best.gap) best = { hue, gap: candidate };
  }
  return best.hue;
}

// Lowest-contrast palette colour other than the logo's; a grey of the same lightness if none is below 3.
function badBackground(palette: PaletteHexes): string {
  const candidates = [
    palette.accent,
    palette.neutralLight,
    palette.neutralDark,
    ...palette.extra,
  ].filter((hex) => hex !== palette.primary);
  const ranked = candidates
    .map((hex) => ({ hex, ratio: contrastRatio(hex, palette.primary) }))
    .sort((a, b) => a.ratio - b.ratio);
  const first = ranked[0];
  if (first && first.ratio < MAX_BAD_CONTRAST) return first.hex;
  const { L } = hexToOklch(palette.primary);
  for (const delta of [0.12, -0.12, 0.2, -0.2]) {
    const grey = oklchToHexMapped(Math.min(1, Math.max(0, L + delta)), 0, 0);
    if (grey !== palette.primary && contrastRatio(grey, palette.primary) < MAX_BAD_CONTRAST)
      return grey;
  }
  return oklchToHexMapped(L, 0, 0);
}

// R8: one red diagonal across the thumbnail, over a white halo so that it reads on any background.
function strike(size: number): SvgNode[] {
  const inset = size * 0.08;
  const ends = {
    x1: String(inset),
    y1: String(size - inset),
    x2: String(size - inset),
    y2: String(inset),
    'stroke-linecap': 'round',
  };
  return [
    svgElement('line', { ...ends, stroke: STRIKE_HALO, 'stroke-width': String(size * 0.022) }),
    svgElement('line', { ...ends, stroke: STRIKE_RED, 'stroke-width': String(size * 0.012) }),
  ];
}

const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
// Definitions whose content is not painted as is: masks and clips work by luminance or geometry.
const NOT_ARTWORK = new Set([
  'defs',
  'clipPath',
  'mask',
  'pattern',
  'filter',
  'linearGradient',
  'radialGradient',
]);

function mapArtwork(
  nodes: readonly SvgNode[],
  change: (node: SvgElement, fill: string) => Map<string, string>,
  inherited = 'black',
): SvgNode[] {
  return nodes.map((node) => {
    if (!isSvgElement(node) || NOT_ARTWORK.has(node.name)) return node;
    const fill = node.attributes.get('fill') ?? inherited;
    return {
      ...node,
      attributes: change(node, fill),
      children: mapArtwork(node.children, change, fill),
    };
  });
}

// Effective fill colours of the drawn shapes, in paint order (gradients and none excluded).
function shapeColours(nodes: readonly SvgNode[], inherited = 'black'): string[] {
  return nodes.flatMap((node) => {
    if (!isSvgElement(node) || NOT_ARTWORK.has(node.name)) return [];
    const fill = node.attributes.get('fill') ?? inherited;
    const key = paintKey(fill);
    const own = SHAPES.has(node.name) && key !== undefined && !key.startsWith('url(') ? [key] : [];
    return [...own, ...shapeColours(node.children, fill)];
  });
}

/**
 * Line drawing of the logo: every surface filled with the tile colour and stroked in `ink`. Filled rather
 * than emptied, so that geometry the artwork hides under later shapes stays hidden, as on the original.
 */
function outlined(nodes: readonly SvgNode[], ink: string, width: number, tile: string): SvgNode[] {
  return mapArtwork(nodes, (node, fill) => {
    const attributes = new Map(node.attributes);
    attributes.set('fill', readPaint(fill).kind === 'none' ? 'none' : tile);
    if (SHAPES.has(node.name) && readPaint(fill).kind !== 'none') {
      attributes.set('stroke', ink);
      attributes.set('stroke-width', String(width));
      attributes.set('stroke-linejoin', 'round');
    }
    return attributes;
  });
}

/** The logo's last colour replaced by `colour`, the others kept; undefined for a one-colour logo. */
function partlyRecoloured(nodes: readonly SvgNode[], colour: string): SvgNode[] | undefined {
  const colours = [...new Set(shapeColours(nodes))];
  const target = colours.at(-1);
  if (colours.length < 2 || target === undefined) return undefined;
  return mapArtwork(nodes, (node) => {
    const attributes = new Map(node.attributes);
    for (const name of ['fill', 'stroke']) {
      const value = attributes.get(name);
      if (value !== undefined && paintKey(value) === target) attributes.set(name, colour);
    }
    return attributes;
  });
}

/** The R8 misuse grid (6 to 12 panels, priority order), each built from the real logo. */
export function dosAndDontsSvg(
  svg: string,
  bbox: Rect,
  palette: PaletteHexes,
  fallbackHue = 265,
): Result<DontPanel[], ComposeError> {
  const artwork = artworkOf(svg);
  if (!artwork.ok) return artwork;
  const offPalette = oklchToHexMapped(RECOLOR_L, RECOLOR_C, offPaletteHue(palette, fallbackHue));
  const recoloured = recolorSvg(svg, offPalette);
  if (!recoloured.ok) return err('INVALID_SVG');
  const recolouredArtwork = artworkOf(recoloured.value.svg);
  if (!recolouredArtwork.ok) return recolouredArtwork;

  const size = Math.max(bbox.width, bbox.height) * PANEL_SCALE;
  const unit = String(size);
  const centre = `translate(${String(size / 2)} ${String(size / 2)})`;
  const back = `translate(${String(-(bbox.x + bbox.width / 2))} ${String(-(bbox.y + bbox.height / 2))})`;
  const placed = (
    transform: string,
    nodes: SvgNode[],
    extra: Readonly<Record<string, string>> = {},
  ): SvgNode =>
    svgElement(
      'g',
      { ...extra, transform: `${centre} ${transform} ${back}`.replace(/\s+/g, ' ') },
      nodes,
    );
  const plain = (fill: string): SvgNode => svgElement('rect', { width: unit, height: unit, fill });

  const background = badBackground(palette);
  const partial = partlyRecoloured(artwork.value, offPalette);
  const shift = String(size * CROP_SHIFT);
  const crop = bbox.width >= bbox.height ? `translate(${shift} 0)` : `translate(0 ${shift})`;
  // Busy background: diagonal stripes of the palette itself, the logo lost in them.
  const stripe = size / 16;
  const stripes = [palette.accent, palette.neutralLight, palette.primary, palette.neutralDark];
  const pattern = svgElement(
    'pattern',
    {
      id: 'charta-dont-busy',
      patternUnits: 'userSpaceOnUse',
      width: String(stripe * stripes.length),
      height: unit,
      patternTransform: 'rotate(35)',
    },
    stripes.map((fill, index) =>
      svgElement('rect', { x: String(stripe * index), width: String(stripe), height: unit, fill }),
    ),
  );
  const shadow = svgElement(
    'filter',
    { id: 'charta-dont-shadow', x: '-50%', y: '-50%', width: '200%', height: '200%' },
    [
      svgElement('feDropShadow', {
        dx: String(size * 0.025),
        dy: String(size * 0.025),
        stdDeviation: String(size * 0.02),
        'flood-color': '#000000',
        'flood-opacity': '0.6',
      }),
    ],
  );
  // Crowd: lines of stand-in text set inside the clear space, right under the logo (R6 broken).
  const top = size / 2 + bbox.height / 2;
  const left = size / 2 - bbox.width / 2;
  const textLine = (offset: number, share: number): SvgNode =>
    svgElement('rect', {
      x: String(left),
      y: String(top + bbox.height * offset),
      width: String(bbox.width * share),
      height: String(bbox.height * 0.07),
      fill: TEXT_GREY,
    });

  const specs: { kind: DontKind; nodes: SvgNode[]; background?: string }[] = [
    { kind: 'distort', nodes: [placed(`scale(${String(DISTORT_SCALE)} 1)`, artwork.value)] },
    { kind: 'squash', nodes: [placed(`scale(1 ${String(SQUASH_SCALE)})`, artwork.value)] },
    { kind: 'rotate', nodes: [placed(`rotate(${String(ROTATION_DEG)})`, artwork.value)] },
    { kind: 'recolor', nodes: [placed('', recolouredArtwork.value)] },
    ...(partial === undefined
      ? []
      : [{ kind: 'partial-recolor' as const, nodes: [placed('', partial)] }]),
    {
      kind: 'outline',
      nodes: [
        placed(
          '',
          outlined(artwork.value, palette.primary, size * OUTLINE_WIDTH, palette.neutralLight),
        ),
      ],
    },
    {
      kind: 'shadow',
      nodes: [shadow, placed('', artwork.value, { filter: 'url(#charta-dont-shadow)' })],
    },
    {
      kind: 'transparency',
      nodes: [placed('', artwork.value, { opacity: String(TRANSPARENCY) })],
    },
    { kind: 'bad-background', background, nodes: [placed('', artwork.value)] },
    {
      kind: 'busy-background',
      nodes: [pattern, plain('url(#charta-dont-busy)'), placed('', artwork.value)],
    },
    { kind: 'crop', nodes: [placed(crop, artwork.value)] },
    {
      kind: 'crowd',
      nodes: [placed('', artwork.value), textLine(0.06, 1), textLine(0.18, 0.7)],
    },
  ];
  const panels: DontPanel[] = [];
  for (const spec of specs) {
    // Every tile has the same plain background, as in a printed grid; only bad-background changes it.
    const tile = spec.background ?? palette.neutralLight;
    const built = document(size, [plain(tile), ...spec.nodes, ...strike(size)]);
    if (!built.ok) return built;
    panels.push({
      kind: spec.kind,
      svg: built.value,
      labelKey: `logo.dont.${spec.kind}`,
      background: tile,
    });
  }
  return ok(panels);
}

import { contrastRatio, hexToOklch, oklchToHexMapped } from '@app/color-engine';
import type { Rect } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import type { SvgNode } from '@app/svg-engine';
import { recolorSvg } from '../mono/index.js';
import { artworkOf, document, svgElement, type ComposeError } from './compose.js';

// 05_ENGINES.md §5.6 and ADR-021.
const DISTORT_SCALE = 1.4;
const ROTATION_DEG = -15;
const PANEL_SCALE = 1.6;
const MIN_HUE_GAP = 60;
const CHROMATIC = 0.04;
const RECOLOR_L = 0.6;
const RECOLOR_C = 0.15;
const MAX_BAD_CONTRAST = 3;

export interface PaletteHexes {
  readonly primary: string;
  readonly accent: string;
  readonly neutralLight: string;
  readonly neutralDark: string;
  readonly extra: readonly string[];
}
export type DontKind = 'distort' | 'rotate' | 'recolor' | 'bad-background';
export interface DontPanel {
  readonly kind: DontKind;
  readonly svg: string;
  /** i18n key of the visible label: sanitized SVGs carry no <text> (05_ENGINES.md §3.2). */
  readonly labelKey: `logo.dont.${DontKind}`;
  /** Background of the bad-background panel. */
  readonly background?: string;
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

function cross(size: number, palette: PaletteHexes): SvgNode {
  const r = size * 0.07;
  const cx = size - r * 1.6;
  const cy = r * 1.6;
  const arm = r * 0.5;
  const d = `M${String(cx - arm)} ${String(cy - arm)}L${String(cx + arm)} ${String(cy + arm)}M${String(cx + arm)} ${String(cy - arm)}L${String(cx - arm)} ${String(cy + arm)}`;
  return svgElement('g', {}, [
    svgElement('circle', {
      cx: String(cx),
      cy: String(cy),
      r: String(r),
      fill: palette.neutralDark,
    }),
    svgElement('path', {
      d,
      fill: 'none',
      stroke: palette.neutralLight,
      'stroke-width': String(r * 0.3),
    }),
  ]);
}

/** The four misuse panels of §5.6, built from the real logo. */
export function dosAndDontsSvg(
  svg: string,
  bbox: Rect,
  palette: PaletteHexes,
  fallbackHue = 265,
): Result<DontPanel[], ComposeError> {
  const artwork = artworkOf(svg);
  if (!artwork.ok) return artwork;
  const recoloured = recolorSvg(
    svg,
    oklchToHexMapped(RECOLOR_L, RECOLOR_C, offPaletteHue(palette, fallbackHue)),
  );
  if (!recoloured.ok) return err('INVALID_SVG');
  const recolouredArtwork = artworkOf(recoloured.value.svg);
  if (!recolouredArtwork.ok) return recolouredArtwork;

  const size = Math.max(bbox.width, bbox.height) * PANEL_SCALE;
  const centre = `translate(${String(size / 2)} ${String(size / 2)})`;
  const back = `translate(${String(-(bbox.x + bbox.width / 2))} ${String(-(bbox.y + bbox.height / 2))})`;
  const placed = (transform: string, nodes: SvgNode[]): SvgNode =>
    svgElement('g', { transform: `${centre} ${transform} ${back}`.replace(/\s+/g, ' ') }, nodes);
  const background = badBackground(palette);
  const specs: { kind: DontKind; nodes: SvgNode[]; background?: string }[] = [
    { kind: 'distort', nodes: [placed(`scale(${String(DISTORT_SCALE)} 1)`, artwork.value)] },
    { kind: 'rotate', nodes: [placed(`rotate(${String(ROTATION_DEG)})`, artwork.value)] },
    { kind: 'recolor', nodes: [placed('', recolouredArtwork.value)] },
    {
      kind: 'bad-background',
      background,
      nodes: [
        svgElement('rect', { width: String(size), height: String(size), fill: background }),
        placed('', artwork.value),
      ],
    },
  ];
  const panels: DontPanel[] = [];
  for (const spec of specs) {
    const built = document(size, [...spec.nodes, cross(size, palette)]);
    if (!built.ok) return built;
    const panel = {
      kind: spec.kind,
      svg: built.value,
      labelKey: `logo.dont.${spec.kind}` as const,
    };
    panels.push(spec.background === undefined ? panel : { ...panel, background: spec.background });
  }
  return ok(panels);
}

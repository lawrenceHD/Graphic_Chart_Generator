import type { MockupFinish, SceneDefinition, SurfacePaint } from '@app/contracts';

// Art direction of a mockup (06_MOCKUP_ENGINE.md §4.3, v2): which brand colour each object is printed on,
// which finish it gets and which version of the logo reads on it. Pure, so the studio and its tests agree.
// The objects of one scene share the palette out (a set of place cards: one per colour), as on the
// boards of the reference corpus.

export interface BrandPalette {
  readonly primary: string;
  readonly accent: string;
  readonly neutralLight: string;
  readonly neutralDark: string;
}
export type LogoVersion = 'color' | 'black' | 'white';
export type FoilTone = 'gold' | 'silver';

export interface SurfaceDirection {
  readonly surfaceId: string;
  /** Colour the object is printed on, or null to keep the photograph's own. */
  readonly paint: string | null;
  /** What the logo sits on: the paint, or the photographed surface's tint. */
  readonly background: string;
  readonly finish: MockupFinish;
  readonly logo: LogoVersion;
  readonly foil?: FoilTone;
}

/** What the person decided for one object; every field left out stays automatic. */
export interface SurfaceChoice {
  /** A palette role, or 'none' for the photograph's own stock. */
  readonly paint?: SurfacePaint;
  readonly finish?: MockupFinish;
  readonly logo?: LogoVersion;
}
export type SurfaceChoices = Readonly<Record<string, SurfaceChoice>>;

const channel = (hex: string, offset: number): number => {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
/** WCAG relative luminance of #RRGGBB. */
export const luminance = (hex: string): number =>
  0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const max = Math.max(r ?? 0, g ?? 0, b ?? 0);
  const min = Math.min(r ?? 0, g ?? 0, b ?? 0);
  if (max === min) return 0;
  const d = max - min;
  const h =
    max === r
      ? ((g ?? 0) - (b ?? 0)) / d
      : max === g
        ? 2 + ((b ?? 0) - (r ?? 0)) / d
        : 4 + ((r ?? 0) - (g ?? 0)) / d;
  return (h * 60 + 360) % 360;
}

const toHex = (unit: readonly number[]): string =>
  `#${unit
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;

// A near-white stock is where the colour logo was designed to sit (its primary version, R5).
const PAPER_LUMINANCE = 0.75;
// Elsewhere the colour logo is kept only if every ink reads on the stock.
const INK_CONTRAST = 3;
const SHAPE_ONLY: ReadonlySet<MockupFinish> = new Set(['foil', 'emboss', 'deboss', 'engrave']);
const FOIL_MAX_LUMINANCE = 0.45;
const RELIEF_MIN_LUMINANCE = 0.5;

const ALL_LOGOS: readonly LogoVersion[] = ['color', 'black', 'white'];

/**
 * The version of the logo that reads on a background, among the versions the brand has (a missing one would
 * silently fall back to the colour file). Colour on a near-white stock or when every ink reads (3:1); else
 * the one-colour version with the best contrast; when none reaches 3:1, the best there is.
 */
function logoOn(
  background: string,
  inks: readonly string[],
  available: readonly LogoVersion[],
): LogoVersion {
  const has = (version: LogoVersion): boolean => available.includes(version);
  const bright = luminance(background) >= PAPER_LUMINANCE;
  const inkReading =
    inks.length === 0 ? 0 : Math.min(...inks.map((ink) => contrast(ink, background)));
  const colourReads = bright || inkReading >= INK_CONTRAST;
  if (colourReads && has('color')) return 'color';
  const score: Record<LogoVersion, number> = {
    color: bright ? INK_CONTRAST : inkReading,
    black: contrast('#000000', background),
    white: contrast('#FFFFFF', background),
  };
  const ranked = ALL_LOGOS.filter(has).sort((x, y) => score[y] - score[x]);
  return ranked[0] ?? 'color';
}

function finishOn(finishes: readonly MockupFinish[], background: string): MockupFinish {
  const level = luminance(background);
  const fits = (finish: MockupFinish): boolean => {
    if (finish === 'foil') return level < FOIL_MAX_LUMINANCE;
    if (finish === 'emboss' || finish === 'deboss') return level >= RELIEF_MIN_LUMINANCE;
    return true;
  };
  return finishes.find(fits) ?? finishes[finishes.length - 1] ?? 'print';
}

export function directScene(
  scene: SceneDefinition,
  palette: BrandPalette,
  inks: readonly string[],
  decided: SurfaceChoices = {},
  logos: readonly LogoVersion[] = ALL_LOGOS,
): SurfaceDirection[] {
  const seen = new Map<string, number>();
  const cool = hue(palette.primary) >= 170 && hue(palette.primary) <= 300;
  return scene.surfaces.map((surface) => {
    const choices: readonly SurfacePaint[] = surface.paint ?? ['none'];
    const picked = decided[surface.id] ?? {};
    const repaintable = choices.some((entry) => entry !== 'none');
    // Surfaces offering the same choices take them in turn.
    const key = choices.join();
    const turn = seen.get(key) ?? 0;
    seen.set(key, turn + 1);
    const own = choices[turn % choices.length] ?? 'none';
    // A colour is taken only where the scene lets the object be repainted (or keep its stock).
    const wanted = picked.paint;
    const role =
      wanted !== undefined && (wanted === 'none' ? choices.includes('none') : repaintable)
        ? wanted
        : own;
    const paint = role === 'none' ? null : palette[role];
    const background = paint ?? toHex(surface.baseTint);
    // A logo the person chose is meant to be seen: unless they pick the finish, shape-only ones are skipped.
    const readable =
      picked.logo !== undefined ? surface.finishes.filter((entry) => !SHAPE_ONLY.has(entry)) : [];
    const finish =
      picked.finish !== undefined && surface.finishes.includes(picked.finish)
        ? picked.finish
        : finishOn(readable.length > 0 ? readable : surface.finishes, background);
    return {
      surfaceId: surface.id,
      paint,
      background,
      finish,
      logo: picked.logo ?? logoOn(background, inks, logos),
      ...(finish === 'foil' ? { foil: cool ? ('silver' as const) : ('gold' as const) } : {}),
    };
  });
}

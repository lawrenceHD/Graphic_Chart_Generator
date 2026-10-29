import {
  buildScale,
  contrastRatio,
  hexToOklch,
  oklchToHexMapped,
  wcagLevel,
  type WcagLevel,
} from '@app/color-engine';

// Colour maths shown in the studio: every value comes from color-engine, the same code as the worker, so a
// contrast read on a page is the contrast the document is checked against.
export { buildScale, contrastRatio, hexToOklch };

const NEAR_BLACK = '#111111';
const WHITE = '#FFFFFF';

/** Text colour for a swatch: whichever of white and near-black contrasts best. */
export function inkOn(hex: string): string {
  return contrastRatio(WHITE, hex) >= contrastRatio(NEAR_BLACK, hex) ? WHITE : NEAR_BLACK;
}

/** True when the background is dark enough to need the white version of the logo. */
export function isDark(hex: string): boolean {
  return inkOn(hex) === WHITE;
}

export function formatOklch(hex: string): string {
  const { L, C, h } = hexToOklch(hex);
  return `${(L * 100).toFixed(0)}% ${C.toFixed(3)} ${(h ?? 0).toFixed(0)}°`;
}

export function rgbOf(hex: string): readonly [number, number, number] {
  const channel = (index: number): number => Number.parseInt(hex.slice(index, index + 2), 16);
  return [channel(1), channel(3), channel(5)];
}

/** Indicative CMYK only (naive conversion); the calibrated FOGRA39 profile is T-010. */
export function cmykOf(hex: string): readonly [number, number, number, number] {
  const [r, g, b] = rgbOf(hex).map((value) => value / 255);
  const red = r ?? 0;
  const green = g ?? 0;
  const blue = b ?? 0;
  const k = 1 - Math.max(red, green, blue);
  if (k >= 1) return [0, 0, 0, 100];
  const part = (value: number): number => Math.round(((1 - value - k) / (1 - k)) * 100);
  return [part(red), part(green), part(blue), Math.round(k * 100)];
}

/** Same lightness and chroma, another hue: what the inspector's hue slider produces. */
export function withHue(hex: string, hue: number): string {
  const { L, C } = hexToOklch(hex);
  return oklchToHexMapped(L, C, ((hue % 360) + 360) % 360).toUpperCase();
}

/** Same hue and chroma, another lightness (0..1). */
export function withLightness(hex: string, lightness: number): string {
  const { C, h } = hexToOklch(hex);
  return oklchToHexMapped(Math.min(1, Math.max(0, lightness)), C, h ?? 0).toUpperCase();
}

export type ContrastTone = 'ok' | 'mid' | 'bad';

/** WCAG verdict of a ratio as a tone plus the level, so the page shows an icon and a word, never colour alone. */
export function contrastVerdict(ratio: number): {
  readonly level: WcagLevel;
  readonly tone: ContrastTone;
} {
  const level = wcagLevel(ratio);
  return { level, tone: level === 'fail' ? 'bad' : level === 'large-ui' ? 'mid' : 'ok' };
}

const HEX = /^#[0-9A-F]{6}$/u;

/** Normalises what a person types into a hex field ("e24329", "#e24329 ") or returns null. */
export function parseHexInput(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#[0-9A-F]{3}$/u.test(withHash)) {
    const [, r = '', g = '', b = ''] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return HEX.test(withHash) ? withHash : null;
}

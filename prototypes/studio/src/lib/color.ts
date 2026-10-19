// The real color-engine (packages/color-engine, built): live recolouring in the inspector uses the same
// maths as the product, not an approximation.
import {
  buildScale,
  contrastRatio,
  hexToOklch,
  oklchToHexMapped,
  wcagLevel,
} from '../../../../packages/color-engine/dist/index.js';

export { buildScale, contrastRatio, hexToOklch, oklchToHexMapped, wcagLevel };

export type Level = 'AAA' | 'AA' | 'AA Large' | 'Fail' | string;

/** Label, short code and tone of a WCAG level (01_PRODUCT_MVP.md AC-05.4: icon + text + colour). */
export function levelInfo(ratio: number): { label: string; tone: 'ok' | 'mid' | 'bad' } {
  if (ratio >= 7) return { label: 'AAA', tone: 'ok' };
  if (ratio >= 4.5) return { label: 'AA', tone: 'ok' };
  if (ratio >= 3) return { label: 'Grand texte', tone: 'mid' };
  return { label: 'Échec', tone: 'bad' };
}

/** Text colour for a swatch: whichever of near-black and white contrasts best. */
export function inkOn(hex: string): string {
  return contrastRatio('#FFFFFF', hex) >= contrastRatio('#111111', hex) ? '#FFFFFF' : '#111111';
}

export const formatOklch = (hex: string): string => {
  const { L, C, h } = hexToOklch(hex);
  return `${(L * 100).toFixed(0)}% ${C.toFixed(3)} ${(h ?? 0).toFixed(0)}°`;
};

export function rgbOf(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Indicative CMYK only: the calibrated FOGRA39 conversion is T-010. */
export function cmykOf(hex: string): number[] {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255) as [number, number, number];
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  return [r, g, b]
    .map((v) => Math.round(((1 - v - k) / (1 - k)) * 100))
    .concat(Math.round(k * 100));
}

/** Same lightness and chroma, another hue: what the inspector's hue slider produces. */
export function withHue(hex: string, hue: number): string {
  const { L, C } = hexToOklch(hex);
  return oklchToHexMapped(L, C, ((hue % 360) + 360) % 360);
}

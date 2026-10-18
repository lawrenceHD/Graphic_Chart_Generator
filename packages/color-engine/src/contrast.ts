import { rgbFromValidatedHex } from './hex.js';
import { srgbToLinear } from './srgb.js';

const TRUNCATION_EPSILON = 1e-9;

export type WcagLevel = 'fail' | 'large-ui' | 'aa' | 'aaa';

export function relativeLuminance(hex: string): number {
  const rgb = rgbFromValidatedHex(hex);
  const red = srgbToLinear(rgb.r / 255);
  const green = srgbToLinear(rgb.g / 255);
  const blue = srgbToLinear(rgb.b / 255);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio < 3) return 'fail';
  if (ratio < 4.5) return 'large-ui';
  if (ratio < 7) return 'aa';
  return 'aaa';
}

export function formatRatio(ratio: number): string {
  // ratio * 100 is not exact in binary (1.15 * 100 = 114.999…): absorb that error before truncating.
  const truncated = Math.floor(ratio * 100 + TRUNCATION_EPSILON) / 100;
  return truncated.toFixed(2);
}

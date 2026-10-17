import { rgbFromValidatedHex, toHex } from './hex.js';
import { linearToSrgb, srgbToLinear } from './srgb.js';
import type { Oklab, Oklch } from './types.js';

interface LinearRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export function hexToOklab(hex: string): Oklab {
  const rgb = rgbFromValidatedHex(hex);
  const red = srgbToLinear(rgb.r / 255);
  const green = srgbToLinear(rgb.g / 255);
  const blue = srgbToLinear(rgb.b / 255);

  return linearRgbToOklab(red, green, blue);
}

export function oklabToHex(lab: Oklab): string {
  const linear = oklabToLinearRgb(lab);
  const rgb = {
    r: Math.round(linearToSrgb(linear.r) * 255),
    g: Math.round(linearToSrgb(linear.g) * 255),
    b: Math.round(linearToSrgb(linear.b) * 255),
  };

  return toHex(rgb);
}

export function hexToOklch(hex: string): Oklch {
  const lab = hexToOklab(hex);
  const chroma = Math.hypot(lab.a, lab.b);
  const hue = chroma < 0.0004 ? null : normalizedHue(lab.a, lab.b);

  return { L: lab.L, C: chroma, h: hue };
}

export function deltaEOk(firstHex: string, secondHex: string): number {
  const first = hexToOklab(firstHex);
  const second = hexToOklab(secondHex);

  return Math.hypot(first.L - second.L, first.a - second.a, first.b - second.b);
}

function linearRgbToOklab(red: number, green: number, blue: number): Oklab {
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToLinearRgb(lab: Oklab): LinearRgb {
  const l = (lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b) ** 3;
  const m = (lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b) ** 3;
  const s = (lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b) ** 3;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function normalizedHue(a: number, b: number): number {
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

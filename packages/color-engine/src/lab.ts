import { rgbFromValidatedHex } from './hex.js';
import { srgbToLinear } from './srgb.js';
import type { Lab } from './types.js';

const WHITE_X = 0.95047;
const WHITE_Y = 1;
const WHITE_Z = 1.08883;
const LAB_EPSILON = 216 / 24389;
const LAB_KAPPA = 841 / 108;

export function hexToLab(hex: string): Lab {
  const rgb = rgbFromValidatedHex(hex);
  const red = srgbToLinear(rgb.r / 255);
  const green = srgbToLinear(rgb.g / 255);
  const blue = srgbToLinear(rgb.b / 255);
  const x = (0.4124564 * red + 0.3575761 * green + 0.1804375 * blue) / WHITE_X;
  const y = (0.2126729 * red + 0.7151522 * green + 0.072175 * blue) / WHITE_Y;
  const z = (0.0193339 * red + 0.119192 * green + 0.9503041 * blue) / WHITE_Z;
  const fx = labCurve(x);
  const fy = labCurve(y);
  const fz = labCurve(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function labCurve(value: number): number {
  return value > LAB_EPSILON ? Math.cbrt(value) : LAB_KAPPA * value + 4 / 29;
}

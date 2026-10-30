import type { MockupFinish, SurfaceMaterial } from '@app/contracts';
import { applyHomography, invertHomography, type Homography } from '../homography.js';
import type { LogoRect } from '../placement.js';
import type { FoilTone } from '../direct.js';

// What the SURFACE shader receives for one surface, computed without WebGL so it can be tested.
export type Vec3 = readonly [number, number, number];

export interface SurfaceUniforms {
  /** Column-major 3 × 3 matrix: scene pixel → unit square. */
  readonly inverse: readonly number[];
  readonly rect: readonly [number, number, number, number];
  readonly paint: Vec3 | null;
  readonly tint: Vec3;
  readonly finish: number;
  readonly displace: number;
  readonly weave: number;
  readonly logoLod: number;
  readonly light: Vec3;
  readonly foilDark: Vec3;
  readonly foilLight: Vec3;
}

export const FINISH_CODES: Readonly<Record<MockupFinish, number>> = {
  flat: 0,
  print: 0,
  emboss: 1,
  deboss: 2,
  foil: 3,
  embroidery: 4,
  engrave: 5,
  screen: 6,
};

// 06 §4.3 foil ramps, in linear light.
const FOILS: Readonly<Record<FoilTone, readonly [Vec3, Vec3]>> = {
  gold: [
    [0.17, 0.09, 0.02],
    [1.0, 0.71, 0.21],
  ],
  silver: [
    [0.26, 0.28, 0.31],
    [0.89, 0.91, 0.95],
  ],
};

// Fabric folds move the print (pixels per unit of luminance slope); paper and card stay flat.
const DISPLACE: Partial<Record<SurfaceMaterial, number>> = { fabric: 22 };
const WEAVE: Partial<Record<SurfaceMaterial, number>> = {
  fabric: 1,
  paper: 0.25,
  card: 0.15,
  stone: 0.6,
  wood: 0.5,
};

const linear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

/** #RRGGBB → linear RGB. */
export function linearHex(hex: string): Vec3 {
  const at = (offset: number) => linear(Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return [at(1), at(3), at(5)];
}

export interface UniformInput {
  readonly homography: Homography;
  readonly rect: LogoRect;
  readonly paint: string | null;
  readonly tint: Vec3;
  readonly finish: MockupFinish;
  readonly material: SurfaceMaterial;
  readonly light: Vec3;
  readonly foil: FoilTone;
  /** Width of the logo texture, in texels. */
  readonly logoWidth: number;
}

/** Width in scene pixels of the logo box once projected (top edge), for the relief blur level. */
function projectedWidth(h: Homography, rect: LogoRect): number {
  const a = applyHomography(h, [rect.u0, rect.v0]);
  const b = applyHomography(h, [rect.u1, rect.v0]);
  if (!a.ok || !b.ok) return 1;
  return Math.max(1, Math.hypot(b.value[0] - a.value[0], b.value[1] - a.value[1]));
}

export function surfaceUniforms(input: UniformInput): SurfaceUniforms | null {
  const inverse = invertHomography(input.homography);
  if (!inverse.ok) return null;
  const [a, b, c, d, e, f, g, h, i] = inverse.value;
  const texelsPerPixel = input.logoWidth / projectedWidth(input.homography, input.rect);
  const [foilDark, foilLight] = FOILS[input.foil];
  return {
    // Row-major h11..h33 → column-major for uniformMatrix3fv.
    inverse: [a, d, g, b, e, h, c, f, i],
    rect: [input.rect.u0, input.rect.v0, input.rect.u1, input.rect.v1],
    paint: input.paint === null ? null : linearHex(input.paint),
    tint: [linear(input.tint[0]), linear(input.tint[1]), linear(input.tint[2])],
    finish: FINISH_CODES[input.finish],
    displace: DISPLACE[input.material] ?? 0,
    weave: WEAVE[input.material] ?? 0,
    // A relief ~2.5 scene pixels wide.
    logoLod: Math.max(0, Math.log2(texelsPerPixel * 2.5)),
    light: input.light,
    foilDark,
    foilLight,
  };
}

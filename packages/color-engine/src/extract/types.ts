import type { Oklab, Oklch } from '../types.js';

/** RGBA pixels, already reduced by the caller to 512 px max with a nearest-neighbour kernel (§2.4). */
export interface DecodedImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface ExtractOptions {
  readonly mergeThreshold: number;
  readonly minShare: number;
  readonly maxClusters: number;
}

export interface PaletteCluster {
  readonly hex: string;
  readonly share: number;
  readonly oklab: Oklab;
  readonly oklch: Oklch;
}

export interface ExtractedPalette {
  readonly clusters: readonly PaletteCluster[];
}

export interface RoleOptions {
  readonly chromaticThreshold: number;
  readonly fallbackHue: number;
}

export interface RoleToken {
  readonly hex: string;
  readonly source: 'extracted' | 'derived';
}

export interface PaletteRoles {
  readonly primary: RoleToken;
  readonly accent: RoleToken;
  readonly neutralDark: RoleToken;
  readonly neutralLight: RoleToken;
  readonly extra: readonly RoleToken[];
}

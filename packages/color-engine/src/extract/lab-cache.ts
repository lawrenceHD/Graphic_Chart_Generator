import { toHex } from '../hex.js';
import { hexToOklab } from '../oklab.js';
import type { Oklab } from '../types.js';

/** 24-bit RGB key of a pixel; equal colours share one key. */
export function colorKeyAt(data: Uint8ClampedArray, pixel: number): number {
  const offset = pixel * 4;
  return ((data[offset] ?? 0) << 16) | ((data[offset + 1] ?? 0) << 8) | (data[offset + 2] ?? 0);
}

export function hexOfKey(key: number): string {
  return toHex({ r: (key >> 16) & 0xff, g: (key >> 8) & 0xff, b: key & 0xff });
}

export function distanceOk(first: Oklab, second: Oklab): number {
  return Math.hypot(first.L - second.L, first.a - second.a, first.b - second.b);
}

// A 512 px image has up to 262 144 pixels but usually few distinct colours: convert each colour once.
export class LabCache {
  private readonly labs = new Map<number, Oklab>();

  lab(key: number): Oklab {
    let lab = this.labs.get(key);
    if (lab === undefined) {
      lab = hexToOklab(hexOfKey(key));
      this.labs.set(key, lab);
    }
    return lab;
  }
}

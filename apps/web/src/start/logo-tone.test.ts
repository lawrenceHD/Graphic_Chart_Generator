import { describe, expect, it } from 'vitest';
import { isLightLogo } from './logo-tone';

const pixels = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());
const TRANSPARENT = [0, 0, 0, 0];

describe('isLightLogo', () => {
  it('recognises a white logo on a transparent background', () => {
    expect(
      isLightLogo(pixels([255, 255, 255, 255], TRANSPARENT, TRANSPARENT, [250, 250, 250, 200])),
    ).toBe(true);
  });

  it('keeps a coloured logo on a light background', () => {
    // La Mèza: terracotta, sage, sand and ink.
    const meza = pixels(
      [216, 143, 122, 255],
      [166, 180, 155, 255],
      [227, 200, 132, 255],
      [29, 29, 27, 255],
    );
    expect(isLightLogo(meza)).toBe(false);
  });

  it('ignores nearly transparent pixels and treats an empty image as dark-on-light', () => {
    expect(isLightLogo(pixels([255, 255, 255, 40], [0, 0, 0, 255]))).toBe(false);
    expect(isLightLogo(pixels(TRANSPARENT))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import vectors from '../../../docs/golden/color.golden.json' with { type: 'json' };
import { parseHex } from './hex.js';
import { isInGamut, mapToGamut, oklchToHexMapped } from './gamut.js';

function channels(hex: string): readonly number[] {
  const rgb = parseHex(hex);
  if (!rgb.ok) throw new Error(hex);
  return [rgb.value.r, rgb.value.g, rgb.value.b];
}

describe('mapToGamut (05_ENGINES.md §2.7, golden gamutMapping)', () => {
  it.each(vectors.gamutMapping)('maps $input', (vector) => {
    const [L, C, h] = vector.input;
    if (L === undefined || C === undefined || h === undefined) throw new Error('bad vector');

    const mapped = mapToGamut(L, C, h);
    expect(isInGamut(L, C, h)).toBe(vector.inGamutBefore);
    expect(Math.abs(mapped.C - vector.mappedC)).toBeLessThanOrEqual(
      vectors._meta.tolerances.gamutChroma,
    );
    expect(mapped.L).toBe(L);
    expect(mapped.h).toBe(h);
    const actual = channels(oklchToHexMapped(L, C, h));
    channels(vector.hex).forEach((expected, index) => {
      expect(Math.abs((actual[index] ?? Number.NaN) - expected)).toBeLessThanOrEqual(
        vectors._meta.tolerances.gamutHexPerChannel,
      );
    });
  });

  it('returns the largest in-gamut chroma (+0.005 leaves the gamut)', () => {
    const mapped = mapToGamut(0.7, 0.4, 150);
    expect(isInGamut(mapped.L, mapped.C, mapped.h)).toBe(true);
    expect(isInGamut(mapped.L, mapped.C + 0.005, mapped.h)).toBe(false);
  });
});

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import vectors from '../../../docs/golden/color.golden.json' with { type: 'json' };
import { contrastRatio, wcagLevel } from './contrast.js';
import { bestTextFor, buildContrastMatrix } from './contrast-matrix.js';
import { isInGamut, mapToGamut } from './gamut.js';
import { parseHex, toHex } from './hex.js';
import { hexToOklch } from './oklab.js';
import { buildScale } from './scale.js';

const hexArbitrary = fc
  .record({ r: fc.nat(255), g: fc.nat(255), b: fc.nat(255) })
  .map((rgb) => toHex(rgb));

function hueGap(first: number, second: number): number {
  const gap = Math.abs(first - second) % 360;
  return Math.min(gap, 360 - gap);
}

describe('mapToGamut on out-of-gamut colours (T-006 test 1)', () => {
  it('stays in gamut, keeps L and h, and returns the maximal chroma', () => {
    const outOfGamut = fc
      .tuple(
        fc.double({ min: 0.05, max: 0.95, noNaN: true }),
        fc.double({ min: 0.3, max: 0.4, noNaN: true }),
        fc.double({ min: 0, max: 359.9, noNaN: true }),
      )
      .filter(([L, C, h]) => !isInGamut(L, C, h));
    fc.assert(
      fc.property(outOfGamut, ([L, C, h]) => {
        const mapped = mapToGamut(L, C, h);
        expect([mapped.L, mapped.h]).toEqual([L, h]);
        expect(isInGamut(mapped.L, mapped.C, mapped.h)).toBe(true);
        expect(isInGamut(mapped.L, mapped.C + 0.005, mapped.h)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});

describe('buildScale (05_ENGINES.md §2.8)', () => {
  const edgeCases = ['#000000', '#FFFFFF', '#808080', '#FF0000', '#00FF00', '#0000FF'];

  function checkScale(hex: string): void {
    const scale = buildScale(hex);
    expect(scale.map((step) => step.step)).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ]);
    scale.slice(1).forEach((step, index) => {
      expect(step.L).toBeLessThan(scale[index]?.L ?? Number.NaN);
    });
    for (const step of scale) {
      expect(isInGamut(step.L, step.C, step.h)).toBe(true);
      expect(parseHex(step.hex).ok).toBe(true);
    }
    const base = hexToOklch(hex);
    if (base.h !== null) {
      for (const step of scale) expect(hueGap(step.h, base.h)).toBeLessThanOrEqual(1);
    }
  }

  it.each(edgeCases)('builds 11 decreasing, in-gamut steps for %s', checkScale);

  it('holds for 50 random colours', () => {
    fc.assert(fc.property(hexArbitrary, checkScale), { numRuns: 50 });
  });

  it.each(vectors.scales)('reproduces the golden scale of $base (±1 per channel)', (vector) => {
    const scale = buildScale(vector.base);
    vector.steps.forEach((expected, index) => {
      const actual = parseHex(scale[index]?.hex ?? '');
      const reference = parseHex(expected.hex);
      if (!actual.ok || !reference.ok) throw new Error('invalid hex');
      const tolerance = vectors._meta.tolerances.scaleHexPerChannel;
      expect(Math.abs(actual.value.r - reference.value.r)).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(actual.value.g - reference.value.g)).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(actual.value.b - reference.value.b)).toBeLessThanOrEqual(tolerance);
    });
  });
});

describe('contrast matrix (05_ENGINES.md §2.9)', () => {
  const palette = ['#1F4BFF', '#FFD60A', '#F2F5FC', '#12161F', '#B3261E'];

  it('has n·(n−1) cells matching contrastRatio and wcagLevel', () => {
    const matrix = buildContrastMatrix(palette);

    expect(matrix.cells).toHaveLength(palette.length * (palette.length - 1));
    for (const cell of matrix.cells) {
      expect(cell.text).not.toBe(cell.background);
      expect(cell.ratio).toBe(contrastRatio(cell.text, cell.background));
      expect(cell.level).toBe(wcagLevel(cell.ratio));
    }
    expect(matrix.bestText.map((entry) => entry.background)).toEqual(palette);
  });

  it('picks the best text among the palette and black or white for each background', () => {
    const matrix = buildContrastMatrix(palette);
    for (const entry of matrix.bestText) {
      const candidates = [
        ...palette.filter((hex) => hex !== entry.background),
        '#000000',
        '#FFFFFF',
      ];
      const best = Math.max(...candidates.map((hex) => contrastRatio(hex, entry.background)));
      expect(entry.ratio).toBe(best);
    }
  });

  it('bestTextFor keeps the first candidate on ties', () => {
    expect(bestTextFor('#1F4BFF', ['#FFFFFF', '#000000']).text).toBe('#FFFFFF');
    expect(bestTextFor('#808080', ['#FFFFFF', '#FFFFFF']).text).toBe('#FFFFFF');
    expect(bestTextFor('#FFFFFF', ['#777777', '#000000', '#000000']).text).toBe('#000000');
  });
});

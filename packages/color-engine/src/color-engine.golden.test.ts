import { describe, expect, it } from 'vitest';
import vectors from '../../../docs/golden/color.golden.json' with { type: 'json' };
import {
  contrastRatio,
  deltaE2000,
  deltaEOk,
  formatRatio,
  hexToLab,
  hexToOklab,
  hexToOklch,
  linearToSrgb,
  oklabToHex,
  srgbToLinear,
  wcagLevel,
} from './index.js';

const within = (actual: number, expected: number, tolerance: number): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

const labFrom = (values: readonly (number | null)[]) => ({
  L: numericAt(values, 0),
  a: numericAt(values, 1),
  b: numericAt(values, 2),
});

describe('golden color vectors v2', () => {
  it('matches contrast ratios, WCAG levels, and truncated display values', () => {
    for (const vector of vectors.contrast) {
      const ratio = contrastRatio(vector.fg, vector.bg);

      within(ratio, vector.ratio, vectors._meta.tolerances.contrastRatio);
      expect(wcagLevel(ratio)).toBe(vector.level);
      expect(formatRatio(ratio)).toBe(vector.displayTruncated);
    }
  });

  it('matches every formatRatio vector', () => {
    for (const vector of vectors.formatRatio) {
      expect(formatRatio(vector.input)).toBe(vector.expected);
    }
  });

  it('matches every sRGB linearization vector', () => {
    for (const vector of vectors.srgbToLinear) {
      const encoded = vector.c8 / 255;
      within(srgbToLinear(encoded), vector.linear, vectors._meta.tolerances.linear);
      within(linearToSrgb(vector.linear), encoded, vectors._meta.tolerances.linear);
    }
  });

  it('uses the specified sRGB transfer threshold at non-byte inputs', () => {
    const belowThreshold = 0.0402;

    expect(srgbToLinear(belowThreshold)).toBeCloseTo(belowThreshold / 12.92, 12);
  });

  it('matches OKLab and OKLCH vectors and round trips', () => {
    for (const vector of vectors.oklab) {
      const lab = hexToOklab(vector.hex);
      const lch = hexToOklch(vector.hex);

      within(lab.L, numericAt(vector.oklab, 0), vectors._meta.tolerances.oklab);
      within(lab.a, numericAt(vector.oklab, 1), vectors._meta.tolerances.oklab);
      within(lab.b, numericAt(vector.oklab, 2), vectors._meta.tolerances.oklab);
      within(lch.L, numericAt(vector.oklch, 0), vectors._meta.tolerances.oklch_C_L);
      within(lch.C, numericAt(vector.oklch, 1), vectors._meta.tolerances.oklch_C_L);
      const expectedHue = nullableNumberAt(vector.oklch, 2);
      if (expectedHue === null) {
        expect(lch.h).toBeNull();
      } else {
        within(lch.h ?? Number.NaN, expectedHue, vectors._meta.tolerances.oklch_hue_deg);
      }
      expectHexChannelsWithinOne(oklabToHex(lab), vector.roundtrip);
    }
    // ADR-021: achromatic colors have no hue, as in the reference vectors.
    expect(hexToOklch('#FFFFFF').h).toBeNull();
    expect(hexToOklch('#000000').h).toBeNull();
    expect(hexToOklch('#808080').h).toBeNull();
    expect(hexToOklch('#777777').h).toBeNull();
  });

  it('matches OKLab distance vectors', () => {
    for (const vector of vectors.deOk) {
      within(deltaEOk(vector.a, vector.b), vector.deOk, vectors._meta.tolerances.deOk);
    }
  });

  it('matches D65 CIELAB reference vectors', () => {
    for (const vector of vectors.lab_D65) {
      const actual = hexToLab(vector.hex);

      within(actual.L, numericAt(vector.lab, 0), vectors._meta.tolerances.lab);
      within(actual.a, numericAt(vector.lab, 1), vectors._meta.tolerances.lab);
      within(actual.b, numericAt(vector.lab, 2), vectors._meta.tolerances.lab);
    }
  });

  it('matches the eight published Sharma CIEDE2000 pairs', () => {
    for (const vector of vectors.deltaE2000_sharma) {
      const actual = deltaE2000(labFrom(vector.lab1), labFrom(vector.lab2));

      within(actual, vector.expected, vectors._meta.tolerances.deltaE2000);
    }
  });
});

function numericAt(values: readonly (number | null)[], index: number): number {
  const value = values[index];
  if (typeof value !== 'number')
    throw new Error(`Golden numeric value missing at index ${String(index)}`);
  return value;
}

function nullableNumberAt(values: readonly (number | null)[], index: number): number | null {
  const value = values[index];
  if (value === null) return null;
  if (typeof value !== 'number') throw new Error(`Golden hue missing at index ${String(index)}`);
  return value;
}

function expectHexChannelsWithinOne(actual: string, expected: string): void {
  const actualChannels = [
    Number.parseInt(actual.slice(1, 3), 16),
    Number.parseInt(actual.slice(3, 5), 16),
    Number.parseInt(actual.slice(5, 7), 16),
  ];
  const expectedChannels = [
    Number.parseInt(expected.slice(1, 3), 16),
    Number.parseInt(expected.slice(3, 5), 16),
    Number.parseInt(expected.slice(5, 7), 16),
  ];

  for (let index = 0; index < actualChannels.length; index += 1) {
    const actualChannel = actualChannels[index];
    const expectedChannel = expectedChannels[index];
    if (actualChannel === undefined || expectedChannel === undefined) {
      throw new Error('Hex channel missing');
    }
    expect(Math.abs(actualChannel - expectedChannel)).toBeLessThanOrEqual(1);
  }
}

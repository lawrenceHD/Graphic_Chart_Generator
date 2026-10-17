import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  contrastRatio,
  deltaE2000,
  formatRatio,
  hexToOklab,
  oklabToHex,
  parseHex,
  toHex,
  wcagLevel,
} from './index.js';

const rgbArbitrary = fc.record({
  r: fc.integer({ min: 0, max: 255 }),
  g: fc.integer({ min: 0, max: 255 }),
  b: fc.integer({ min: 0, max: 255 }),
});

const hexArbitrary = rgbArbitrary.map(rgbToHex);
const labArbitrary = fc.record({
  L: fc.integer({ min: 0, max: 100 }),
  a: fc.integer({ min: -128, max: 127 }),
  b: fc.integer({ min: -128, max: 127 }),
});

describe('color engine properties', () => {
  it('classifies the documented WCAG boundary colors', () => {
    expect(wcagLevel(contrastRatio('#777777', '#FFFFFF'))).toBe('large-ui');
    expect(wcagLevel(contrastRatio('#767676', '#FFFFFF'))).toBe('aa');
    expect(wcagLevel(contrastRatio('#595959', '#FFFFFF'))).toBe('aaa');
  });

  it('truncates ratios without rounding upward', () => {
    expect(formatRatio(4.499)).toBe('4.49');
    expect(formatRatio(21)).toBe('21.00');
  });

  it('round trips normalized hex through RGB', () => {
    fc.assert(
      fc.property(hexArbitrary, (hex) => {
        const result = parseHex(hex.toLowerCase());

        expect(result).toEqual({ ok: true, value: parseRgb(hex) });
        if (result.ok) {
          expect(toHex(result.value)).toBe(hex);
        }
      }),
    );
  });

  it('round trips in-gamut RGB through OKLab within one channel', () => {
    fc.assert(
      fc.property(rgbArbitrary, (rgb) => {
        const hex = toHex(rgb);
        const actual = oklabToHex(hexToOklab(hex));

        expectChannelDistance(actual, hex);
      }),
      { numRuns: 1000 },
    );
  });

  it('keeps contrast symmetric and in the WCAG range', () => {
    fc.assert(
      fc.property(hexArbitrary, hexArbitrary, (foreground, background) => {
        const forward = contrastRatio(foreground, background);
        const reverse = contrastRatio(background, foreground);

        expect(Math.abs(forward - reverse)).toBeLessThanOrEqual(1e-12);
        expect(forward).toBeGreaterThanOrEqual(1);
        expect(forward).toBeLessThanOrEqual(21);
      }),
      { numRuns: 1000 },
    );
  });

  it('keeps CIEDE2000 symmetric and non-negative', () => {
    fc.assert(
      fc.property(labArbitrary, labArbitrary, (first, second) => {
        const forward = deltaE2000(first, second);
        const reverse = deltaE2000(second, first);

        expect(forward).toBeGreaterThanOrEqual(0);
        expect(Math.abs(forward - reverse)).toBeLessThanOrEqual(1e-10);
      }),
      { numRuns: 1000 },
    );
  });

  it('rejects malformed hex strings with INVALID_HEX', () => {
    for (const input of ['#fff', 'fff', '#GGGGGG', '', '#12345', '#1234567']) {
      expect(parseHex(input)).toEqual({ ok: false, error: 'INVALID_HEX' });
    }
  });
});

function parseRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function expectChannelDistance(actual: string, expected: string): void {
  for (const [start, end] of [
    [1, 3],
    [3, 5],
    [5, 7],
  ]) {
    const actualChannel = Number.parseInt(actual.slice(start, end), 16);
    const expectedChannel = Number.parseInt(expected.slice(start, end), 16);

    expect(Math.abs(actualChannel - expectedChannel)).toBeLessThanOrEqual(1);
  }
}

import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  deltaEOk,
  formatRatio,
  hexToLab,
  hexToOklab,
  relativeLuminance,
} from './index.js';

describe('formatRatio truncation', () => {
  it('keeps every exact two-decimal ratio between 1 and 21 unchanged', () => {
    for (let hundredths = 100; hundredths <= 2100; hundredths += 1) {
      const ratio = hundredths / 100;
      expect(formatRatio(ratio)).toBe(ratio.toFixed(2));
    }
  });

  it('still truncates instead of rounding up', () => {
    expect(formatRatio(4.499)).toBe('4.49');
    expect(formatRatio(3.9985)).toBe('3.99');
    expect(formatRatio(4.4999999)).toBe('4.49');
  });
});

describe('hex inputs of the public color functions', () => {
  // A malformed hex is a programming error upstream (inputs are validated by HexColor): fail loudly
  // instead of propagating NaN into contrast levels and palettes.
  it.each(['#fff', 'red', '', '#GGGGGG', '#1234567'])('rejects %j', (hex) => {
    expect(() => contrastRatio(hex, '#000000')).toThrow(RangeError);
    expect(() => relativeLuminance(hex)).toThrow(RangeError);
    expect(() => hexToOklab(hex)).toThrow(RangeError);
    expect(() => hexToLab(hex)).toThrow(RangeError);
    expect(() => deltaEOk('#000000', hex)).toThrow(RangeError);
  });

  it('accepts lowercase hex', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
  });
});

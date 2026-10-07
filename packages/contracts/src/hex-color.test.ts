import { describe, it, expect } from 'vitest';
import { HexColor } from './hex-color.js';

describe('HexColor', () => {
  it('accepts lowercase hex color and normalizes to uppercase', () => {
    const result = HexColor.parse('#aabbcc');
    expect(result).toBe('#AABBCC');
  });

  it('accepts already uppercase hex color', () => {
    const result = HexColor.parse('#AABBCC');
    expect(result).toBe('#AABBCC');
  });

  it('rejects 3-character hex shorthand #abc', () => {
    expect(() => HexColor.parse('#abc')).toThrow();
  });

  it('rejects hex color without leading # (abcdef)', () => {
    expect(() => HexColor.parse('abcdef')).toThrow();
  });

  it('rejects invalid hex characters #GGGGGG', () => {
    expect(() => HexColor.parse('#GGGGGG')).toThrow();
  });

  it('rejects shorthand #fff', () => {
    expect(() => HexColor.parse('#fff')).toThrow();
  });
});

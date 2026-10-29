import { describe, expect, it } from 'vitest';
import {
  cmykOf,
  contrastRatio,
  contrastVerdict,
  hexToOklch,
  inkOn,
  parseHexInput,
  rgbOf,
  withHue,
  withLightness,
} from './color';

describe('studio colour helpers (color-engine underneath)', () => {
  it('normalises what a person types in a hex field', () => {
    expect(parseHexInput('e24329')).toBe('#E24329');
    expect(parseHexInput('  #e24329 ')).toBe('#E24329');
    expect(parseHexInput('#fff')).toBe('#FFFFFF');
    expect(parseHexInput('#12345')).toBeNull();
    expect(parseHexInput('rouge')).toBeNull();
  });

  it('changes the hue and keeps lightness and chroma', () => {
    const base = hexToOklch('#D88F7A');
    const turned = hexToOklch(withHue('#D88F7A', 200));
    expect(turned.L).toBeCloseTo(base.L, 2);
    expect(turned.C).toBeCloseTo(base.C, 1);
    expect(turned.h ?? 0).toBeCloseTo(200, 0);
  });

  it('changes the lightness and keeps the hue', () => {
    const darker = withLightness('#D88F7A', 0.45);
    expect(hexToOklch(darker).L).toBeCloseTo(0.45, 2);
    expect(hexToOklch(darker).h ?? 0).toBeCloseTo(hexToOklch('#D88F7A').h ?? 0, 0);
  });

  it('gives each WCAG tier an icon tone, never colour alone', () => {
    expect(contrastVerdict(7.2)).toEqual({ level: 'aaa', tone: 'ok' });
    expect(contrastVerdict(4.6)).toEqual({ level: 'aa', tone: 'ok' });
    expect(contrastVerdict(3.2)).toEqual({ level: 'large-ui', tone: 'mid' });
    expect(contrastVerdict(1.5)).toEqual({ level: 'fail', tone: 'bad' });
  });

  it('picks the text colour that reads best on a swatch', () => {
    expect(inkOn('#000000')).toBe('#FFFFFF');
    expect(inkOn('#FCF3F0')).toBe('#111111');
    expect(contrastRatio(inkOn('#D88F7A'), '#D88F7A')).toBeGreaterThan(4.5);
  });

  it('prints RGB and indicative CMYK', () => {
    expect(rgbOf('#D88F7A')).toEqual([216, 143, 122]);
    expect(cmykOf('#000000')).toEqual([0, 0, 0, 100]);
    expect(cmykOf('#FFFFFF')).toEqual([0, 0, 0, 0]);
  });
});

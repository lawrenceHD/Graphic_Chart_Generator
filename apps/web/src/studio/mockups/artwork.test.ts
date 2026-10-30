import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from '../../landing/demo';
import type { BrandView } from '../workspace/brand-view';
import { logoFor } from './artwork';

const view: BrandView = {
  ...DEMO_VIEW,
  colors: {
    primary: '#D88F7A',
    accent: '#E3C884',
    neutralLight: '#FCF3F0',
    neutralDark: '#1D1D1B',
  },
};

describe('logoFor — the version of the logo a designer lays on each stock', () => {
  it('keeps the colour logo on white and on the light neutral', () => {
    expect(logoFor(view, '#FFFFFF')).toBe('color');
    expect(logoFor(view, '#FCF3F0')).toBe('color');
  });

  it('reverses the mark out in white on a brand field that holds it, black on a bright one', () => {
    expect(logoFor(view, '#D88F7A')).toBe('white');
    expect(logoFor(view, '#1D1D1B')).toBe('white');
    expect(logoFor(view, '#F5D000')).toBe('black');
  });
});

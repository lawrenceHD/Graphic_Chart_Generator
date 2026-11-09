import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from '../../landing/demo';
import type { BrandView } from '../workspace/brand-view';
import { brandInks, logoSource, renderKey } from './mockup-stage';

const view: BrandView = {
  ...DEMO_VIEW,
  logo: {
    color: '/upload.png',
    vector: '/vector.svg',
    'mono-black': '/black.svg',
    'mono-white': '/white.svg',
    favicon: null,
    horizontal: null,
    vertical: null,
  },
};

describe('computed mockups — what the compositor is given', () => {
  it('lays the traced drawing for the colour version and the monochrome files for one-colour ones', () => {
    expect(logoSource(view, 'color')).toBe('/vector.svg');
    expect(logoSource(view, 'white')).toBe('/white.svg');
    expect(logoSource(view, 'black')).toBe('/black.svg');
  });

  it('falls back to the upload when a version is missing', () => {
    const bare: BrandView = {
      ...view,
      logo: { ...view.logo, vector: null, 'mono-black': null, 'mono-white': null },
    };

    expect(logoSource(bare, 'color')).toBe('/upload.png');
    expect(logoSource(bare, 'white')).toBe('/upload.png');
  });

  it('renders again when a colour changes, not when an unrelated field does', () => {
    const renamed: BrandView = { ...view, name: 'Autre' };
    const recoloured: BrandView = { ...view, colors: { ...view.colors, primary: '#123456' } };

    expect(renderKey(renamed)).toBe(renderKey(view));
    expect(renderKey(recoloured)).not.toBe(renderKey(view));
  });
});

describe('brandInks — the colours the art direction checks the logo against', () => {
  it('counts a neutral read on the logo (a black tagline), not a derived one', () => {
    const black: BrandView = {
      ...view,
      colors: { ...view.colors, neutralDark: '#000000' },
      sources: { ...view.sources, neutralDark: 'extracted', neutralLight: 'derived' },
    };

    expect(brandInks(black)).toContain('#000000');
    expect(brandInks(black)).not.toContain(black.colors.neutralLight);
  });
});

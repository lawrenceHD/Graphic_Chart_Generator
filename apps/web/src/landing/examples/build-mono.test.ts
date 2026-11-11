import { describe, expect, it } from 'vitest';
import { builtExample, monoVariantsOf } from './build';
import { EXAMPLES } from './index';

const decode = (url: string | null): string => {
  if (url === null) throw new Error('no variant');
  return decodeURIComponent(url.slice(url.indexOf(',') + 1));
};

describe('one-colour variants of the example logos (logo-kit engine)', () => {
  const inline = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#12304F"/><circle cx="5" cy="5" r="2" fill="#2F9E8F"/></svg>',
  )}`;

  it('derives a white and a black variant for an inline vector logo', () => {
    const variants = monoVariantsOf(inline);
    const white = decode(variants.white);
    const black = decode(variants.black);
    expect(white).toMatch(/#FFFFFF/iu);
    expect(white).not.toMatch(/#(?!FFFFFF)[0-9A-F]{6}/iu);
    expect(black).toMatch(/#000000/iu);
    expect(black).not.toMatch(/#(?!000000)[0-9A-F]{6}/iu);
  });

  it('invents nothing for a raster logo, and hands the derived files of a vector file to the view', () => {
    expect(monoVariantsOf('/demo/la-meza/logo.png')).toEqual({ black: null, white: null });
    for (const example of EXAMPLES) {
      const { logo } = builtExample(example.id).view;
      expect(logo['mono-white'], example.id).toBe(example.monoLogos?.white ?? null);
      expect(logo['mono-black'], example.id).toBe(example.monoLogos?.black ?? null);
    }
  });

  it('refuses a malformed vector without throwing', () => {
    const broken = `data:image/svg+xml,${encodeURIComponent('<svg')}`;
    expect(monoVariantsOf(broken)).toEqual({ black: null, white: null });
  });
});

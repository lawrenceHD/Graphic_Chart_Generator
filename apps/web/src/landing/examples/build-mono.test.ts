import { describe, expect, it } from 'vitest';
import { builtExample, monoVariantsOf } from './build';
import { EXAMPLES } from './index';

const decode = (url: string | null): string => {
  if (url === null) throw new Error('no variant');
  return decodeURIComponent(url.slice(url.indexOf(',') + 1));
};

describe('one-colour variants of the example logos (logo-kit engine)', () => {
  const vector = EXAMPLES.filter((example) => example.logo.startsWith('data:image/svg+xml'));

  it('derives a white and a black variant for every vector example', () => {
    expect(vector.length).toBeGreaterThanOrEqual(2);
    for (const example of vector) {
      const { view } = builtExample(example.id);
      const white = decode(view.logo['mono-white']);
      const black = decode(view.logo['mono-black']);
      expect(white, example.id).toMatch(/#FFFFFF/iu);
      expect(white, example.id).not.toMatch(/#(?!FFFFFF)[0-9A-F]{6}/iu);
      expect(black, example.id).toMatch(/#000000/iu);
      expect(black, example.id).not.toMatch(/#(?!000000)[0-9A-F]{6}/iu);
    }
  });

  it('invents nothing for a raster logo: no one-colour file exists for it', () => {
    expect(monoVariantsOf('/demo/la-meza/logo.png')).toEqual({ black: null, white: null });
    const raster = EXAMPLES.find((example) => !example.logo.startsWith('data:image/svg+xml'));
    if (raster === undefined) throw new Error('no raster example');
    expect(builtExample(raster.id).view.logo['mono-white']).toBeNull();
  });

  it('refuses a malformed vector without throwing', () => {
    const broken = `data:image/svg+xml,${encodeURIComponent('<svg')}`;
    expect(monoVariantsOf(broken)).toEqual({ black: null, white: null });
  });
});

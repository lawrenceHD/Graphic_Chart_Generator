import type { SceneDefinition, SceneSurface } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { contrast, directScene, type BrandPalette } from './direct.js';

const LA_MEZA: BrandPalette = {
  primary: '#D88F7A',
  accent: '#E3C884',
  neutralLight: '#FCF3F0',
  neutralDark: '#1D1D1B',
};
const PASTEL_INKS = ['#D88F7A', '#A6B49B', '#E3C884', '#1D1D1B'];

function surface(id: string, patch: Partial<SceneSurface> = {}): SceneSurface {
  return {
    id,
    quad: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
    logoBox: { aspect: 1, fit: 'contain', paddingRatio: 0.2 },
    baseTint: [0.95, 0.95, 0.94],
    light: { direction: [0, 0, 1] },
    finishes: ['print'],
    ...patch,
  };
}
const scene = (...surfaces: SceneSurface[]): SceneDefinition => ({
  id: 'test',
  schemaVersion: 2,
  category: 'hospitality',
  size: { width: 100, height: 100 },
  surfaces,
});

describe('directScene — the art direction of a mockup', () => {
  it('shares the brand colours out between the objects of one scene', () => {
    const paints: SceneSurface['paint'] = ['primary', 'neutralLight', 'neutralDark'];
    const directions = directScene(
      scene(
        surface('left', { paint: paints }),
        surface('centre', { paint: paints }),
        surface('right', { paint: paints }),
      ),
      LA_MEZA,
      PASTEL_INKS,
    );

    expect(directions.map((d) => d.paint)).toEqual(['#D88F7A', '#FCF3F0', '#1D1D1B']);
  });

  it('prints the colour logo only where it reads, a one-colour logo elsewhere', () => {
    const [onWhite, onTerracotta, onBlack] = directScene(
      scene(
        surface('white', { paint: ['none'] }),
        surface('terracotta', { paint: ['primary'] }),
        surface('black', { paint: ['neutralDark'] }),
      ),
      LA_MEZA,
      PASTEL_INKS,
    );

    expect(onWhite).toMatchObject({ paint: null, logo: 'color', finish: 'print' });
    // The pastel inks vanish on terracotta: one colour, the one that reads best — the same choice as the
    // backgrounds page of the guideline (R9 of 16_GUIDELINE_RULES.md, logo-kit chooseVersion).
    expect(onTerracotta?.logo).toBe('black');
    expect(onBlack?.logo).toBe('white');
  });

  it('chooses foil on dark stock and a blind emboss on white, when the surface allows them', () => {
    const finishes: SceneSurface['finishes'] = ['foil', 'emboss', 'print'];
    const [dark, light] = directScene(
      scene(
        surface('dark', { paint: ['neutralDark'], finishes }),
        surface('light', { paint: ['neutralLight'], finishes }),
      ),
      LA_MEZA,
      PASTEL_INKS,
    );

    expect(dark).toMatchObject({ finish: 'foil', foil: 'gold' });
    expect(light).toMatchObject({ finish: 'emboss' });
  });

  it('picks silver foil for a cool palette', () => {
    const cool: BrandPalette = { ...LA_MEZA, primary: '#1F4BFF', accent: '#7FA7C9' };
    const [card] = directScene(
      scene(surface('card', { paint: ['neutralDark'], finishes: ['foil'] })),
      cool,
      ['#1F4BFF'],
    );

    expect(card?.foil).toBe('silver');
  });

  it('measures contrast as WCAG does', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#E3C884', '#FCF3F0')).toBeCloseTo(1.49, 2);
  });

  describe('the choices of the person', () => {
    const paints: SceneSurface['paint'] = ['primary', 'accent', 'none'];
    const rich = scene(
      surface('card', { paint: paints, finishes: ['print', 'foil', 'emboss'] }),
      surface('plain', { finishes: ['print'] }),
    );

    it('prints an object on the colour chosen, and the logo follows the new ground', () => {
      const [card] = directScene(rich, LA_MEZA, PASTEL_INKS, { card: { paint: 'neutralDark' } });
      expect(card?.paint).toBe('#1D1D1B');
      expect(card?.background).toBe('#1D1D1B');
      expect(card?.logo).toBe('white');
    });

    it('keeps the photograph stock when the person asks for it, if the scene allows', () => {
      const [card] = directScene(rich, LA_MEZA, PASTEL_INKS, { card: { paint: 'none' } });
      expect(card?.paint).toBeNull();
    });

    it('takes a finish the surface offers, with the foil tone, and refuses one it does not', () => {
      const [card, plain] = directScene(rich, LA_MEZA, PASTEL_INKS, {
        card: { finish: 'foil' },
        plain: { finish: 'foil' },
      });
      expect(card?.finish).toBe('foil');
      expect(card?.foil).toBe('gold');
      expect(plain?.finish).toBe('print');
      expect(plain?.foil).toBeUndefined();
    });

    it('takes the logo version asked for over the automatic one', () => {
      const [card] = directScene(rich, LA_MEZA, PASTEL_INKS, { card: { logo: 'black' } });
      expect(card?.logo).toBe('black');
    });

    it('ignores a colour on an object the scene does not let be repainted', () => {
      const [, plain] = directScene(rich, LA_MEZA, PASTEL_INKS, { plain: { paint: 'primary' } });
      expect(plain?.paint).toBeNull();
    });

    it('does not move the turn of the other objects', () => {
      const twins = scene(
        surface('a', { paint: ['primary', 'accent'] }),
        surface('b', { paint: ['primary', 'accent'] }),
      );
      const [, second] = directScene(twins, LA_MEZA, PASTEL_INKS, { a: { paint: 'neutralDark' } });
      expect(second?.paint).toBe('#E3C884');
    });
  });

  describe('the logo version that reads (3:1 on the object)', () => {
    const dark = scene(surface('apron', { paint: ['neutralDark'], finishes: ['embroidery'] }));
    const onPrimary = scene(surface('screen', { paint: ['primary'], finishes: ['screen'] }));
    const ALL = ['color', 'black', 'white'] as const;

    it('never picks a version the brand does not have, which would fall back to the colour file', () => {
      const [onlyColour] = directScene(dark, LA_MEZA, PASTEL_INKS, {}, ['color', 'black']);
      expect(onlyColour?.logo).not.toBe('white');
      const [full] = directScene(dark, LA_MEZA, PASTEL_INKS, {}, ALL);
      expect(full?.logo).toBe('white');
    });

    it('takes the black version on a light ground when the colour one does not read', () => {
      const pale = { ...LA_MEZA, primary: '#F2E8D5' };
      const [light] = directScene(onPrimary, pale, ['#F2E8D5', '#E9DFC8'], {}, ['black', 'white']);
      expect(light?.logo).toBe('black');
    });

    it('keeps the best contrast available when nothing reaches 3:1', () => {
      const mid = { ...LA_MEZA, primary: '#808080' };
      const [dir] = directScene(onPrimary, mid, ['#808080'], {}, ALL);
      expect(['black', 'white']).toContain(dir?.logo);
    });

    it('does not turn a logo the person chose into a shape-only finish on its own', () => {
      const notebook = scene(
        surface('cover', {
          paint: ['neutralDark'],
          finishes: ['deboss', 'foil', 'print'],
        }),
      );
      const [auto] = directScene(notebook, LA_MEZA, PASTEL_INKS);
      expect(auto?.finish).toBe('foil');
      const [chosen] = directScene(notebook, LA_MEZA, PASTEL_INKS, { cover: { logo: 'white' } });
      expect(chosen?.finish).toBe('print');
      expect(chosen?.logo).toBe('white');
    });
  });
});

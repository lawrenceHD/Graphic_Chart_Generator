import { contrastRatio } from '@app/color-engine';
import { describe, expect, it } from 'vitest';
import { backgroundBoard, chooseVersion, logoVersions, PHOTO_TONES } from './usage.js';

const palette = {
  primary: '#1F4BFF',
  accent: '#DAA500',
  neutralLight: '#F2F5FC',
  neutralDark: '#12161F',
  extra: [],
};

describe('logo versions (R5)', () => {
  it('lists colour, negative on the brand colour, black, white on dark, in that order', () => {
    expect(logoVersions(palette).map(({ version, background }) => [version, background])).toEqual([
      ['colour', '#F2F5FC'],
      ['white', '#1F4BFF'],
      ['black', '#FFFFFF'],
      ['white', '#12161F'],
    ]);
    expect(logoVersions(palette).map(({ key }) => key)).toEqual([
      'colour',
      'negative',
      'black',
      'white',
    ]);
  });

  it('drops the negative version when white does not read on the brand colour', () => {
    const pale = { ...palette, primary: '#FFD60A' };
    expect(logoVersions(pale).map(({ key }) => key)).toEqual(['colour', 'black', 'white']);
  });
});

describe('version on a background (R3, R9)', () => {
  it('keeps the colour logo while every logo colour reads at 3:1', () => {
    expect(chooseVersion('#FFFFFF', ['#1F4BFF', '#12161F'])).toEqual({
      version: 'colour',
      contrast: contrastRatio('#FFFFFF', '#1F4BFF'),
    });
  });

  it('falls back to white or black, whichever contrasts most, as soon as one colour fails', () => {
    expect(chooseVersion('#12161F', ['#1A2B6B', '#DAA500']).version).toBe('white');
    expect(chooseVersion('#DAA500', ['#1F4BFF', '#FFD60A']).version).toBe('black');
  });

  it('builds the R9 board: light, dark, brand, light photo, dark photo, then one forbidden case', () => {
    const board = backgroundBoard(palette, ['#1F4BFF']);
    expect(board.map(({ kind }) => kind)).toEqual([
      'light',
      'dark',
      'brand',
      'photo-light',
      'photo-dark',
      'forbidden',
    ]);
    expect(board.map(({ background }) => background)).toEqual([
      '#F2F5FC',
      '#12161F',
      '#1F4BFF',
      PHOTO_TONES.light,
      PHOTO_TONES.dark,
      '#1F4BFF',
    ]);
    for (const usage of board.slice(0, 5)) expect(usage.contrast).toBeGreaterThanOrEqual(3);
    // The forbidden case is the colour logo where it does not read: on its own brand colour.
    const forbidden = board.at(-1);
    expect(forbidden?.version).toBe('colour');
    expect(forbidden?.contrast).toBeLessThan(3);
  });

  it('keeps the colour version on the light background it was designed for, even with a pale colour', () => {
    // Mastercard: its orange reads at about 2:1 on white, yet the colour logo is the one shown on white.
    const board = backgroundBoard({ ...palette, neutralLight: '#FCF3F1', primary: '#EB001B' }, [
      '#EB001B',
      '#F79E1B',
      '#000000',
    ]);
    const light = board.find(({ kind }) => kind === 'light');
    expect(light?.version).toBe('colour');
    // Reported: the contrast of its best-reading colour, the one that carries the shape.
    expect(light?.contrast).toBeCloseTo(contrastRatio('#FCF3F1', '#000000'), 9);
    expect(board.find(({ kind }) => kind === 'forbidden')?.background).not.toBe('#FCF3F1');
  });

  it('does not keep a pale one-colour logo in colour on the light background (R3)', () => {
    const board = backgroundBoard({ ...palette, neutralLight: '#FCF3F1' }, ['#FFD60A']);
    expect(board.find(({ kind }) => kind === 'light')?.version).toBe('black');
  });

  it('shows no forbidden case when no logo colour is known, and never the colour version', () => {
    const board = backgroundBoard(palette, []);
    expect(board.map(({ kind }) => kind)).not.toContain('forbidden');
    expect(board.every(({ version }) => version !== 'colour')).toBe(true);
  });
});

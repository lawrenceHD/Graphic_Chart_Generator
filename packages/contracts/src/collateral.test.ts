import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES,
  BrandContactSchema,
  COLLATERAL_FORMATS,
  COLLATERAL_KINDS,
  COMPOSITIONS,
  CollateralLayoutSchema,
  compositionFor,
  formatGrid,
  motifFor,
  MOODS,
  needsPhoto,
  seriesComposition,
  TaglineSchema,
  treatmentFor,
} from './index.js';

describe('compositionFor', () => {
  it('leads the poster with the composition of the table (§2.1)', () => {
    expect(compositionFor('poster', 'warm', 'jester', true)).toBe('bleed-corner');
    expect(compositionFor('poster', 'warm', 'caregiver', true)).toBe('plate-circle');
    expect(compositionFor('poster', 'warm', 'sage', true)).toBe('plate-circle');
    expect(compositionFor('poster', 'editorial', 'hero', true)).toBe('bleed-corner');
    expect(compositionFor('poster', 'editorial', 'lover', true)).toBe('full-bleed');
    expect(compositionFor('poster', 'strict', 'ruler', true)).toBe('split');
  });

  it('falls back to the typographic poster when there is no photo', () => {
    for (const mood of MOODS) {
      for (const archetype of ARCHETYPES) {
        expect(compositionFor('poster', mood, archetype, false)).toBe('type-only');
      }
    }
  });

  it('picks the card front by family, the strong motif for jester and creator', () => {
    expect(compositionFor('card-front', 'strict', 'jester', false)).toBe('quiet');
    expect(compositionFor('card-front', 'warm', 'creator', false)).toBe('motif');
    expect(compositionFor('card-front', 'editorial', 'sage', false)).toBe('field');
  });

  it('always returns a composition of the kind, and never one needing a missing photo', () => {
    for (const kind of COLLATERAL_KINDS) {
      for (const mood of MOODS) {
        for (const archetype of ARCHETYPES) {
          for (const photo of [true, false]) {
            const composition = compositionFor(kind, mood, archetype, photo);
            expect(COMPOSITIONS[kind]).toContain(composition);
            if (!photo) expect(needsPhoto(composition), `${kind} ${composition}`).toBe(false);
          }
        }
      }
    }
  });
});

describe('seriesComposition', () => {
  it('moves one step per item of the series so two posters differ', () => {
    const head = compositionFor('poster', 'warm', 'jester', true);
    expect(seriesComposition('poster', head, 0, true)).toBe(head);
    expect(seriesComposition('poster', head, 1, true)).not.toBe(head);
  });

  it('only offers photo-free compositions without a photo', () => {
    for (let index = 0; index < 6; index += 1) {
      expect(needsPhoto(seriesComposition('poster', 'type-only', index, false))).toBe(false);
    }
  });
});

describe('treatment and motif by archetype (§2.0)', () => {
  it('follows the table', () => {
    expect(treatmentFor('outlaw')).toBe('duotone');
    expect(treatmentFor('innocent')).toBe('warm-natural');
    expect(treatmentFor('explorer')).toBe('contrast-natural');
    expect(treatmentFor('sage')).toBe('monochrome');
    expect(motifFor('hero')).toEqual({ pattern: 'scatter', opacity: 1 });
    expect(motifFor('everyman')).toEqual({ pattern: 'repeat', opacity: 1 });
    expect(motifFor('magician')).toEqual({ pattern: 'turn', opacity: 0.12 });
    expect(motifFor('ruler')).toEqual({ pattern: 'checker', opacity: 1 });
  });
});

describe('formats and grid (§2.0)', () => {
  it('derives the module from the width and narrows the margin under 60 mm', () => {
    const poster = formatGrid('poster');
    expect(poster.module).toBeCloseTo(24.75, 5);
    expect(poster.margin).toBeCloseTo(24.75, 5);
    expect(poster.gutter).toBeCloseTo(24.75 / 4, 5);
    expect(poster.baseline).toBeCloseTo(24.75 / 2, 5);
    const card = formatGrid('card-front');
    expect(card.module).toBeCloseTo(85 / 12, 5);
    expect(card.margin).toBeCloseTo((0.75 * 85) / 12, 5);
    expect(formatGrid('badge').module).toBeCloseTo(6.75, 5);
    expect(formatGrid('label-round').margin).toBeCloseTo(5, 5);
  });

  it('keeps the A3, card and CR80 sizes, and says the story margins are not sourced', () => {
    expect(COLLATERAL_FORMATS.poster).toMatchObject({ unit: 'mm', width: 297, height: 420 });
    expect(COLLATERAL_FORMATS['card-back']).toMatchObject({ width: 85, height: 55, bleed: 3 });
    expect(COLLATERAL_FORMATS.badge).toMatchObject({ width: 54, height: 85.6 });
    expect(COLLATERAL_FORMATS.story).toMatchObject({
      unit: 'px',
      reserved: { top: 250, bottom: 340, sourced: false },
    });
  });
});

describe('user fields of the brand', () => {
  it('accepts a short tagline and refuses markup or an empty one', () => {
    expect(TaglineSchema.safeParse('Le goût du marché').success).toBe(true);
    expect(TaglineSchema.safeParse('').success).toBe(false);
    expect(TaglineSchema.safeParse('<b>x</b>').success).toBe(false);
    expect(TaglineSchema.safeParse('x'.repeat(121)).success).toBe(false);
  });

  it('accepts a partial contact but not an empty one or an unknown key', () => {
    expect(BrandContactSchema.safeParse({ phone: '+237 6 00 00 00 00' }).success).toBe(true);
    expect(BrandContactSchema.safeParse({}).success).toBe(false);
    expect(BrandContactSchema.safeParse({ fax: '0' }).success).toBe(false);
  });
});

describe('CollateralLayoutSchema', () => {
  it('refuses a node of an unknown kind', () => {
    const layout = {
      kind: 'poster',
      composition: 'type-only',
      unit: 'mm',
      width: 297,
      height: 420,
      bleed: 3,
      grid: formatGrid('poster'),
      nodes: [{ kind: 'sticker', zone: 'logo' }],
      headline: null,
      logoRule: 'default',
      exampleLegend: true,
    };
    expect(CollateralLayoutSchema.safeParse(layout).success).toBe(false);
    expect(CollateralLayoutSchema.safeParse({ ...layout, nodes: [] }).success).toBe(true);
  });
});

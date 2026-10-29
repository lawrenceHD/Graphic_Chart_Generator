import { describe, expect, it } from 'vitest';
import { IndexedReferenceSchema, ReferenceCardSchema } from './index.js';

const card = {
  kind: 'stationery',
  sections: ['stationery', 'packaging', 'stationery'],
  mockups: ['Business Card', 'coffee cup', '<script>', 'coffee cup'],
  styles: ['organic', 'minimal'],
  headingType: 'serif-oldstyle',
  bodyType: 'humanist-sans',
  whitespace: 'balanced',
  background: 'textured',
  palette: ['#2f4f39', 'not a colour', '#E8E1D1', '#2F4F39'],
  quality: 5,
  insight: 'Use a cohesive multi-item mockup grid.',
};

describe('reference library contracts', () => {
  it('cleans model output: dedupes, normalises and drops invalid mockups and colours', () => {
    const parsed = ReferenceCardSchema.parse(card);
    expect(parsed.sections).toEqual(['stationery', 'packaging']);
    expect(parsed.mockups).toEqual(['business card', 'coffee cup']);
    expect(parsed.palette).toEqual(['#2F4F39', '#E8E1D1']);
  });

  it('rejects unknown vocabulary, markup in the insight and out-of-range quality', () => {
    expect(ReferenceCardSchema.safeParse({ ...card, kind: 'poster' }).success).toBe(false);
    expect(ReferenceCardSchema.safeParse({ ...card, insight: '<img src=x>' }).success).toBe(false);
    expect(ReferenceCardSchema.safeParse({ ...card, quality: 6 }).success).toBe(false);
    expect(ReferenceCardSchema.safeParse({ ...card, styles: [] }).success).toBe(false);
  });

  it('refuses index lines whose file escapes the library', () => {
    const line = {
      id: 'ref-1',
      sector: 'restaurant',
      file: 'restaurant/ref-1.jpg',
      card,
      embedding: Array.from({ length: 768 }, () => 0.01),
      model: { vision: 'v', embedding: 'e', dimensions: 768 },
    };
    expect(IndexedReferenceSchema.safeParse(line).success).toBe(true);
    expect(IndexedReferenceSchema.safeParse({ ...line, file: '../.env.local' }).success).toBe(
      false,
    );
    const windowsPaths = [
      'restaurant/C:\\x.jpg',
      'restaurant\\..\\..\\.env.local',
      '\\\\server\\share.jpg',
      'C:/x.jpg',
      'restaurant/a\u0000.jpg',
    ];
    for (const file of windowsPaths) {
      expect(IndexedReferenceSchema.safeParse({ ...line, file }).success).toBe(false);
    }
    expect(
      IndexedReferenceSchema.safeParse({ ...line, model: { ...line.model, dimensions: 512 } })
        .success,
    ).toBe(false);
    expect(IndexedReferenceSchema.safeParse({ ...line, sector: 'Bad Sector' }).success).toBe(false);
  });
});

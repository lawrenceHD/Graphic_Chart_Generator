import { describe, expect, it } from 'vitest';
import { direction, reference } from './fixtures.js';
import { cosine, rankReferences } from './rank.js';

const query = {
  sector: 'restaurant',
  styles: ['organic', 'warm'] as const,
  palette: ['#1F3A2E'],
  logoEmbedding: direction(0),
};

describe('cosine', () => {
  it('is 0 for vectors of different sizes rather than a truncated value', () => {
    expect(cosine([1, 0, 0], [1, 0])).toBe(0);
    expect(cosine([1, 0], [1, 0])).toBe(1);
  });
});

describe('rankReferences', () => {
  it('puts the visually closest reference of the same sector first and explains the score', () => {
    const library = [
      reference('far', 'restaurant', direction(5)),
      reference('close', 'restaurant', direction(0, 1, 0.1), { styles: ['organic'] }),
      reference('close-other-sector', 'finance', direction(0, 1, 0.1), { styles: ['organic'] }),
    ];
    const ranked = rankReferences({ ...query, styles: [...query.styles] }, library, {
      limit: 3,
      relevanceWeight: 1,
    });
    expect(ranked.map((entry) => entry.reference.id)).toEqual([
      'close',
      'close-other-sector',
      'far',
    ]);
    const top = ranked[0];
    expect(top?.breakdown.sector).toBe(1);
    expect(top?.breakdown.visual).toBeGreaterThan(0.9);
    expect(top?.breakdown.style).toBeCloseTo(0.5);
    expect(top?.breakdown.palette).toBeCloseTo(1);
  });

  it('prefers the brand sector when everything else is equal', () => {
    const library = [
      reference('a-other-sector', 'finance', direction(0)),
      reference('z-same-sector', 'restaurant', direction(0)),
    ];
    const ranked = rankReferences({ ...query, styles: [...query.styles] }, library, {
      limit: 2,
      relevanceWeight: 1,
    });
    expect(ranked.map((entry) => entry.reference.id)).toEqual(['z-same-sector', 'a-other-sector']);
    expect(ranked[1]?.breakdown.sector).toBe(0);
  });

  it('drops references below the quality floor', () => {
    const library = [reference('amateur', 'restaurant', direction(0), { quality: 2 })];
    expect(rankReferences({ ...query, styles: [...query.styles] }, library, { limit: 5 })).toEqual(
      [],
    );
  });

  it('diversifies: a near duplicate yields its place to a different good reference', () => {
    const library = [
      reference('a', 'restaurant', direction(0)),
      reference('a-duplicate', 'restaurant', direction(0)),
      reference('b', 'restaurant', direction(0, 2, 0.45)),
    ];
    const ranked = rankReferences({ ...query, styles: [...query.styles] }, library, { limit: 2 });
    expect(ranked.map((entry) => entry.reference.id)).toEqual(['a', 'b']);
  });

  it('still ranks by sector, style and palette when the logo has no embedding', () => {
    const library = [
      reference('other', 'finance', direction(0), { styles: ['corporate'], palette: ['#FF0000'] }),
      reference('match', 'restaurant', direction(9), { styles: ['organic', 'warm'] }),
    ];
    const ranked = rankReferences(
      { sector: 'restaurant', styles: ['organic', 'warm'], palette: ['#1F3A2E'] },
      library,
      { limit: 2 },
    );
    expect(ranked[0]?.reference.id).toBe('match');
    expect(ranked[0]?.breakdown.visual).toBeUndefined();
  });
});

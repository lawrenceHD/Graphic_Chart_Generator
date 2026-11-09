import { describe, expect, it } from 'vitest';
import { direction, reference } from './fixtures.js';
import { rankReferences } from './rank.js';

describe('rankReferences: sector affinity', () => {
  it('ranks a related sector above an unrelated one when the exact sector is not indexed', () => {
    const library = [
      reference('a-unrelated', 'finance', direction(0)),
      reference('z-related', 'cafe-bakery', direction(0)),
    ];
    const ranked = rankReferences(
      { sector: 'restaurant', styles: ['organic'], palette: ['#1F3A2E'] },
      library,
      { limit: 2, relevanceWeight: 1 },
    );
    expect(ranked.map((entry) => entry.reference.id)).toEqual(['z-related', 'a-unrelated']);
    expect(ranked[0]?.breakdown.sector).toBeCloseTo(0.5);
    expect(ranked[1]?.breakdown.sector).toBe(0);
  });
});

describe('rankReferences: palette affinity', () => {
  const brand = { sector: 'restaurant', styles: ['organic' as const] };

  it('rewards a reference that carries every brand colour over one sharing a single colour', () => {
    const library = [
      reference('a-one-colour', 'restaurant', direction(0), {
        palette: ['#1F3A2E', '#7B2D8E', '#D62828'],
      }),
      reference('z-both', 'restaurant', direction(0), { palette: ['#1F3A2E', '#E0B13A'] }),
    ];
    const ranked = rankReferences({ ...brand, palette: ['#1F3A2E', '#E0B13A'] }, library, {
      limit: 2,
      relevanceWeight: 1,
    });
    expect(ranked.map((entry) => entry.reference.id)).toEqual(['z-both', 'a-one-colour']);
  });

  it('ignores the black and white of the logo: they say nothing about the brand hue', () => {
    const library = [reference('a', 'restaurant', direction(0), { palette: ['#1F3A2E'] })];
    const [plain] = rankReferences({ ...brand, palette: ['#1F3A2E'] }, library, { limit: 1 });
    const [withNeutrals] = rankReferences(
      { ...brand, palette: ['#FFFFFF', '#1F3A2E', '#000000'] },
      library,
      { limit: 1 },
    );
    expect(withNeutrals?.breakdown.palette).toBeCloseTo(plain?.breakdown.palette ?? -1);
  });
});

describe('rankReferences: purpose', () => {
  it('prefers mockup scenes for a mockup search and guideline spreads for a charter search', () => {
    const library = [
      reference('a-spread', 'restaurant', direction(0), { kind: 'guideline-spread' }),
      reference('z-scene', 'restaurant', direction(0), { kind: 'mockup-scene' }),
    ];
    const base = { sector: 'restaurant', styles: ['minimal' as const], palette: ['#1F3A2E'] };
    const ids = (purpose: 'charter' | 'mockups'): string[] =>
      rankReferences(base, library, { limit: 2, relevanceWeight: 1, purpose }).map(
        (entry) => entry.reference.id,
      );
    expect(ids('mockups')).toEqual(['z-scene', 'a-spread']);
    expect(ids('charter')).toEqual(['a-spread', 'z-scene']);
  });

  it('does not use the kind when no purpose is given', () => {
    const library = [reference('a', 'restaurant', direction(0), { kind: 'mockup-scene' })];
    const [top] = rankReferences(
      { sector: 'restaurant', styles: ['minimal'], palette: ['#1F3A2E'] },
      library,
      { limit: 1 },
    );
    expect(top?.breakdown.kind).toBeUndefined();
  });
});

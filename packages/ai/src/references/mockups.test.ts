import { describe, expect, it } from 'vitest';
import { buildArtDirection } from './direction.js';
import { direction, reference } from './fixtures.js';
import { canonicalMockup } from './mockups.js';
import { rankReferences } from './rank.js';

describe('canonicalMockup', () => {
  it('folds the synonyms the model writes into one subject', () => {
    expect(canonicalMockup('Shopping bag')).toBe('paper bag');
    expect(canonicalMockup('takeaway bag')).toBe('paper bag');
    expect(canonicalMockup('storefront sign')).toBe('signage');
    expect(canonicalMockup('name card')).toBe('business card');
    expect(canonicalMockup('mug')).toBe('coffee cup');
  });

  it('keeps an unknown subject as it is, trimmed and lowercase', () => {
    expect(canonicalMockup('  Ceramic Planter ')).toBe('ceramic planter');
  });
});

describe('buildArtDirection: mockups', () => {
  it('adds up the support of synonyms instead of splitting it', () => {
    const library = [
      reference('a', 'cafe-bakery', direction(0), { mockups: ['paper bag', 'coffee cup'] }),
      reference('b', 'cafe-bakery', direction(0, 1, 0.2), { mockups: ['shopping bag'] }),
      reference('c', 'cafe-bakery', direction(0, 2, 0.3), { mockups: ['takeaway bag', 'mug'] }),
    ];
    const ranked = rankReferences(
      { sector: 'cafe-bakery', styles: ['minimal'], palette: ['#1F3A2E'] },
      library,
      { limit: 3 },
    );
    const mockups = buildArtDirection(ranked).mockups;
    expect(mockups[0]?.subject).toBe('paper bag');
    expect(mockups[0]?.evidence.slice().sort()).toEqual(['a', 'b', 'c']);
    expect(mockups.map((entry) => entry.subject)).toEqual(['paper bag', 'coffee cup']);
    expect(mockups[1]?.evidence.slice().sort()).toEqual(['a', 'c']);
  });
});

import { REFERENCE_SECTORS } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { direction, reference } from './fixtures.js';
import { deriveLibraryStats } from './stats.js';

const library = [
  reference('a', 'cafe-bakery', direction(0), {
    kind: 'brand-board',
    sections: ['logo', 'packaging'],
    mockups: ['shopping bag', 'mug'],
    styles: ['warm', 'organic'],
    palette: ['#C0392B', '#F5E6D3', '#FFFFFF'],
    quality: 5,
    background: 'light',
  }),
  reference('b', 'cafe-bakery', direction(1), {
    kind: 'mockup-scene',
    sections: ['logo'],
    mockups: ['paper bag'],
    styles: ['warm'],
    palette: ['#2E7D32'],
    quality: 3,
    background: 'dark',
  }),
  reference('c', 'finance', direction(2), { kind: 'guideline-spread', quality: 4 }),
];

describe('deriveLibraryStats', () => {
  const stats = deriveLibraryStats(library, { 'cafe-bakery': 81, finance: 90, fashion: 55 });
  const bakery = stats.sectors['cafe-bakery'];

  it('counts what is indexed and what was collected, per sector', () => {
    expect(stats.total).toBe(3);
    expect(bakery?.indexed).toBe(2);
    expect(bakery?.collected).toBe(81);
    expect(stats.sectors['fashion']?.indexed).toBe(0);
    expect(stats.sectors['fashion']?.collected).toBe(55);
  });

  it('lists the sectors of the library that no reference was indexed for', () => {
    expect(stats.unindexedSectors).toEqual(
      REFERENCE_SECTORS.filter((sector) => sector !== 'cafe-bakery' && sector !== 'finance'),
    );
  });

  it('gives the share of references showing each section, kind and style', () => {
    expect(bakery?.sections).toContainEqual({ name: 'logo', share: 1 });
    expect(bakery?.sections).toContainEqual({ name: 'packaging', share: 0.5 });
    expect(bakery?.kinds).toContainEqual({ name: 'brand-board', share: 0.5 });
    expect(bakery?.styles[0]).toEqual({ name: 'warm', share: 1 });
  });

  it('folds mockup synonyms before counting them', () => {
    expect(bakery?.mockups[0]).toEqual({ name: 'paper bag', share: 1 });
    expect(bakery?.mockups).toContainEqual({ name: 'coffee cup', share: 0.5 });
  });

  it('averages the quality and summarises the palettes by hue family, neutrals apart', () => {
    expect(bakery?.quality).toBe(4);
    const shares = bakery?.hues ?? [];
    expect(shares.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1, 2);
    expect(shares.find((entry) => entry.name === 'neutral')?.share).toBeCloseTo(0.5, 2);
    expect(shares.find((entry) => entry.name === 'red')?.share).toBeCloseTo(0.25, 2);
    expect(shares.find((entry) => entry.name === 'green')?.share).toBeCloseTo(0.25, 2);
  });

  it('is deterministic and holds no image, id or file name', () => {
    expect(JSON.stringify(deriveLibraryStats(library, {}))).toBe(
      JSON.stringify(deriveLibraryStats([...library].reverse(), {})),
    );
    const text = JSON.stringify(stats);
    for (const secret of ['jpg', '"a"', 'embedding']) expect(text).not.toContain(secret);
  });
});

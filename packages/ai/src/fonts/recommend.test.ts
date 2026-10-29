import { describe, expect, it } from 'vitest';
import { loadFontCatalogue } from './catalogue.js';
import { recommendPairings } from './recommend.js';

const catalogue = loadFontCatalogue();

describe('font catalogue', () => {
  it('loads the open-source Google Fonts catalogue through Zod', () => {
    expect(catalogue.length).toBeGreaterThan(1000);
    expect(catalogue.find((font) => font.family === 'Inter')?.classes['Sans/Neo Grotesque']).toBe(
      100,
    );
  });

  it('leaves out families designed first for Chinese, Japanese or Korean', () => {
    const families = catalogue.map((font) => font.family);
    expect(families).not.toContain('LINE Seed JP');
    expect(families).not.toContain('M PLUS Rounded 1c');
    expect(families).toEqual(expect.arrayContaining(['Poppins', 'Kanit', 'Heebo', 'Cairo']));
  });
});

describe('recommendPairings', () => {
  it('pairs an old-style serif heading with a humanist sans body for a warm organic brand', () => {
    const pairings = recommendPairings(
      { heading: 'serif-oldstyle', body: 'humanist-sans', styles: ['organic', 'warm'] },
      catalogue,
    );
    expect(pairings).toHaveLength(3);
    for (const pairing of pairings) {
      const heading = catalogue.find((font) => font.family === pairing.heading.family);
      const body = catalogue.find((font) => font.family === pairing.body.family);
      expect(Object.keys(heading?.classes ?? {}).some((tag) => tag.startsWith('Serif/'))).toBe(
        true,
      );
      expect(body?.classes['Sans/Humanist'] ?? 0).toBeGreaterThanOrEqual(50);
      expect(pairing.heading.family).not.toBe(pairing.body.family);
    }
    expect(new Set(pairings.map((pairing) => pairing.heading.family)).size).toBe(3);
  });

  it('only proposes body faces with a regular and a bold weight, never display or handwriting', () => {
    const pairings = recommendPairings(
      {
        heading: 'display',
        body: 'geometric-sans',
        styles: ['playful', 'organic', 'bold', 'afrocentric'],
      },
      catalogue,
    );
    for (const pairing of pairings) {
      const body = catalogue.find((font) => font.family === pairing.body.family);
      expect(body?.weights).toEqual(expect.arrayContaining([400, 700]));
      expect(['Display', 'Handwriting']).not.toContain(body?.category);
    }
  });

  it('never sets running text in a script face, even when asked to', () => {
    expect(
      recommendPairings({ heading: 'didone', body: 'script', styles: ['elegant'] }, catalogue),
    ).toEqual([]);
  });

  it('answers one family in several weights, not two look-alikes, when heading and body share a style', () => {
    const pairings = recommendPairings(
      { heading: 'geometric-sans', body: 'geometric-sans', styles: ['playful', 'organic'] },
      catalogue,
    );
    expect(pairings.length).toBeGreaterThan(0);
    for (const pairing of pairings) expect(pairing.heading.family).toBe(pairing.body.family);
    const families = pairings.map((pairing) => pairing.heading.family);
    expect(new Set(families).size).toBe(families.length);
  });

  it('never proposes the same two faces twice in swapped roles', () => {
    const pairings = recommendPairings(
      { heading: 'grotesque-sans', body: 'humanist-sans', styles: ['minimal'] },
      catalogue,
    );
    const seen = new Set<string>();
    for (const pairing of pairings) {
      const key = [pairing.heading.family, pairing.body.family].sort().join('+');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(pairings.some((other) => other.heading.family === pairing.body.family)).toBe(false);
    }
  });

  it('recognises the logo typeface whatever its case or weight suffix', () => {
    const plain = recommendPairings(
      { heading: 'geometric-sans', body: 'humanist-sans', styles: ['minimal'] },
      catalogue,
    );
    const top = plain[0]?.heading.family ?? '';
    const pairings = recommendPairings(
      {
        heading: 'geometric-sans',
        body: 'humanist-sans',
        styles: ['minimal'],
        avoid: [`${top.toUpperCase()} Bold`],
      },
      catalogue,
    );
    expect(top).not.toBe('');
    for (const pairing of pairings) expect(pairing.heading.family).not.toBe(top);
  });

  it('explains each choice with the tags that matched', () => {
    const [first] = recommendPairings(
      { heading: 'geometric-sans', body: 'grotesque-sans', styles: ['tech', 'minimal'] },
      catalogue,
    );
    expect(first?.heading.reasons.some((reason) => reason.startsWith('Sans/Geometric'))).toBe(true);
    expect(first?.score).toBeGreaterThan(0);
  });

  it('excludes families the caller wants to avoid, such as the typeface already in the logo', () => {
    const pairings = recommendPairings(
      {
        heading: 'geometric-sans',
        body: 'geometric-sans',
        styles: ['minimal'],
        avoid: ['Poppins'],
      },
      catalogue,
    );
    for (const pairing of pairings) {
      expect([pairing.heading.family, pairing.body.family]).not.toContain('Poppins');
    }
  });
});

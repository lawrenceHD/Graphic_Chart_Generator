import type { VisualStyle } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { buildArtDirection } from './direction.js';
import { direction, reference } from './fixtures.js';
import { rankReferences } from './rank.js';

const library = [
  reference('menu-1', 'restaurant', direction(0), {
    sections: ['logo', 'palette', 'menu', 'signage'],
    mockups: ['menu card', 'storefront sign', 'coffee cup'],
    styles: ['organic', 'warm'],
    headingType: 'serif-oldstyle',
    bodyType: 'humanist-sans',
    whitespace: 'generous',
    insight: 'Show the menu flat with the palette strip beside it.',
    quality: 5,
  }),
  reference('menu-2', 'restaurant', direction(0, 1, 0.2), {
    sections: ['menu', 'uniform', 'palette'],
    mockups: ['menu card', 'apron'],
    styles: ['organic'],
    headingType: 'serif-oldstyle',
    bodyType: 'humanist-sans',
    whitespace: 'generous',
    insight: 'Pair the apron mockup with the clear-space rule.',
  }),
  reference('menu-3', 'restaurant', direction(0, 2, 0.3), {
    sections: ['menu', 'packaging'],
    mockups: ['takeaway bag', 'menu card'],
    styles: ['warm', 'handcrafted'],
    headingType: 'didone',
    bodyType: 'humanist-sans',
    whitespace: 'balanced',
  }),
];

const query = {
  sector: 'restaurant',
  styles: ['organic', 'warm'] satisfies VisualStyle[],
  palette: ['#1F3A2E'],
  logoEmbedding: direction(0),
};

describe('buildArtDirection', () => {
  const ranked = rankReferences(query, library, { limit: 3 });
  const art = buildArtDirection(ranked);

  it('plans the core guideline sections plus the ones the sector references show', () => {
    const plan = art.sections.map((entry) => entry.section);
    for (const core of [
      'cover',
      'logo',
      'clear-space',
      'misuse',
      'palette',
      'typography',
      'closing',
    ]) {
      expect(plan).toContain(core);
    }
    const menu = art.sections.find((entry) => entry.section === 'menu');
    expect(menu?.core).toBe(false);
    expect(menu?.support).toBeCloseTo(1);
    expect(menu?.evidence).toEqual(['menu-1', 'menu-2', 'menu-3']);
    expect(plan).not.toContain('vehicle');
  });

  it('orders the plan like a professional guideline: identity, then system, then applications', () => {
    const plan = art.sections.map((entry) => entry.section);
    expect(plan.indexOf('cover')).toBe(0);
    expect(plan.indexOf('logo')).toBeLessThan(plan.indexOf('palette'));
    expect(plan.indexOf('typography')).toBeLessThan(plan.indexOf('menu'));
    expect(plan.at(-1)).toBe('closing');
  });

  it('ranks mockups by how often the closest references use them, with evidence', () => {
    expect(art.mockups[0]).toEqual({
      subject: 'menu card',
      support: 1,
      evidence: ['menu-1', 'menu-2', 'menu-3'],
    });
  });

  it('derives typography intent and layout from a weighted vote', () => {
    expect(art.typography.heading).toBe('serif-oldstyle');
    expect(art.typography.body).toBe('humanist-sans');
    expect(art.layout.whitespace).toBe('generous');
    expect(art.styles.map((entry) => entry.style).slice(0, 2)).toEqual(['organic', 'warm']);
  });

  it('keeps the insights of the best references, each tied to its source', () => {
    expect(art.insights[0]).toEqual({
      text: 'Show the menu flat with the palette strip beside it.',
      evidence: 'menu-1',
    });
  });

  it('returns only the core plan, without invented evidence, when nothing matched', () => {
    const empty = buildArtDirection([]);
    expect(empty.sections.every((entry) => entry.core && entry.evidence.length === 0)).toBe(true);
    expect(empty.mockups).toEqual([]);
    expect(empty.typography.heading).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import {
  ChartPlanSchema,
  DENSE_PAGES,
  GUIDELINE_SECTIONS,
  PAGE_CAPACITY,
  SECTOR_SECTIONS,
  homeOf,
  type PageType,
} from './index.js';

describe('DENSE_PAGES', () => {
  it('is the minimum set of 14 dense pages of the content study, one section each', () => {
    expect(DENSE_PAGES.map((page) => page.section)).toEqual([
      'cover',
      'contents',
      'brand-story',
      'tone-of-voice',
      'logo',
      'logo-variants',
      'clear-space',
      'misuse',
      'palette',
      'color-ratio',
      'typography',
      'type-hierarchy',
      'pattern',
      'stationery',
    ]);
    for (const page of DENSE_PAGES) {
      expect(page.title.fr.length, page.section).toBeGreaterThan(0);
      expect(page.title.en.length, page.section).toBeGreaterThan(0);
    }
  });

  it('fits the page capacities with every sector page added', () => {
    const counts = new Map<PageType, number>();
    for (const { type } of DENSE_PAGES) counts.set(type, (counts.get(type) ?? 0) + 1);
    counts.set('mockup', (counts.get('mockup') ?? 0) + SECTOR_SECTIONS.length);
    for (const [type, count] of counts)
      expect(count, type).toBeLessThanOrEqual(PAGE_CAPACITY[type]);
  });
});

describe('homeOf', () => {
  it('sends every research section to a dense page or to a sector page, never nowhere', () => {
    const dense = new Set(DENSE_PAGES.map((page) => page.section));
    const sector = new Set<string>(SECTOR_SECTIONS);
    for (const section of GUIDELINE_SECTIONS) {
      const home = homeOf(section);
      expect(dense.has(home) || sector.has(home), section).toBe(true);
    }
  });

  it('groups the thin sections into the dense page that carries their content', () => {
    expect(homeOf('values')).toBe('brand-story');
    expect(homeOf('closing')).toBe('contents');
    expect(homeOf('minimum-size')).toBe('clear-space');
    expect(homeOf('logo-construction')).toBe('logo');
    expect(homeOf('photography')).toBe('pattern');
    expect(homeOf('grid-layout')).toBe('stationery');
    expect(homeOf('menu')).toBe('menu');
  });
});

describe('ChartSectionSchema.section', () => {
  it('names the guideline section of a page, optional for older plans', () => {
    const base = { type: 'palette', title: 'Couleurs', evidence: [] };
    expect(ChartPlanSchema.safeParse({ sections: [base] }).success).toBe(true);
    expect(ChartPlanSchema.safeParse({ sections: [{ ...base, section: 'palette' }] }).success).toBe(
      true,
    );
    expect(ChartPlanSchema.safeParse({ sections: [{ ...base, section: 'nope' }] }).success).toBe(
      false,
    );
  });
});

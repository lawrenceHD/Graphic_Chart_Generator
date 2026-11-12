import { describe, expect, it } from 'vitest';
import {
  fallbackOf,
  logoBySection,
  manifestoBySection,
  mockupBySection,
  outlineOf,
  sectionAt,
  sectionOfData,
  typeBySection,
  typeScale,
} from './section';

describe('sectionOfData', () => {
  it('reads the guideline section a plan wrote in the page data', () => {
    expect(sectionOfData({ evidence: [], section: 'contents' })).toBe('contents');
  });

  it('is null for an older page, an unknown section or a malformed value', () => {
    expect(sectionOfData({})).toBeNull();
    expect(sectionOfData({ section: 'nope' })).toBeNull();
    expect(sectionOfData({ section: 3 })).toBeNull();
    expect(sectionOfData(null)).toBeNull();
  });
});

describe('sectionAt', () => {
  const outline = outlineOf([
    { type: 'cover', title: 'Couverture', data: { section: 'cover' } },
    { type: 'manifesto', title: 'Sommaire', data: { section: 'contents' } },
    { type: 'manifesto', title: 'Plateforme', data: {} },
  ]);

  it('finds the section of the page drawn at a number, when type and title agree', () => {
    expect(sectionAt(outline, 2, 'manifesto', 'Sommaire')).toBe('contents');
  });

  it('is null when the page has no section or does not match the outline', () => {
    expect(sectionAt(outline, 3, 'manifesto', 'Plateforme')).toBeNull();
    expect(sectionAt(outline, 2, 'logo', 'Sommaire')).toBeNull();
    expect(sectionAt(outline, 2, 'manifesto', 'Autre titre')).toBeNull();
    expect(sectionAt(undefined, 1, 'cover', 'Couverture')).toBeNull();
  });
});

describe('views by section', () => {
  it('draws the contents as a contents page, the platform as the manifesto', () => {
    expect(manifestoBySection('contents')).toBe('contents');
    expect(manifestoBySection('closing')).toBe('contents');
    expect(manifestoBySection('brand-story')).toBe('overview');
    expect(manifestoBySection(null)).toBeNull();
  });

  it('draws the logo anatomy and the versions on their own pages', () => {
    expect(logoBySection('logo')).toBe('construction');
    expect(logoBySection('logo-variants')).toBe('variants');
    expect(logoBySection('palette')).toBeNull();
  });

  it('draws families and hierarchy on two different typography pages', () => {
    expect(typeBySection('typography')).toBe('families');
    expect(typeBySection('type-hierarchy')).toBe('hierarchy');
  });

  it('gives every application section scenes of its own subject, never the same trio', () => {
    const sections = [
      'stationery',
      'menu',
      'packaging',
      'signage',
      'social-media',
      'website',
      'merchandise',
      'uniform',
    ] as const;
    const trios = sections.map((section) => {
      const shown = mockupBySection(section);
      return shown?.kind === 'scenes' ? shown.scenes.join(',') : null;
    });
    expect(trios).not.toContain(null);
    expect(new Set(trios).size).toBe(sections.length);
    expect(mockupBySection('menu')).toEqual({
      kind: 'scenes',
      scenes: ['menu-table', 'place-cards', 'napkin-plate'],
    });
  });

  it('shows the pattern on the visual language page and says when no scene fits', () => {
    expect(mockupBySection('pattern')).toEqual({ kind: 'pattern' });
    expect(mockupBySection('vehicle')).toEqual({ kind: 'missing' });
    expect(mockupBySection(null)).toBeNull();
  });
});

describe('fallbackOf', () => {
  it('replaces a serif face by Georgia and a sans face by Arial, for the web and the office', () => {
    expect(fallbackOf("'Fraunces Variable', ui-serif, Georgia, serif")).toEqual({
      office: 'Georgia',
      web: 'Georgia, serif',
    });
    expect(fallbackOf("'Inter Variable', ui-sans-serif, system-ui, sans-serif")).toEqual({
      office: 'Arial',
      web: 'Arial, Helvetica, sans-serif',
    });
  });
});

describe('typeScale', () => {
  const rows = typeScale();

  it('steps every level by 1.25 from a 10 pt, 16 px body', () => {
    const body = rows.find((row) => row.level === 'body');
    expect(body).toMatchObject({ pt: 10, px: 16, leadingPt: 15 });
    expect(rows.map((row) => row.level)).toEqual(['h1', 'h2', 'h3', 'lead', 'body', 'caption']);
    expect(rows.map((row) => row.pt)).toEqual([24.5, 19.5, 15.5, 12.5, 10, 8]);
    expect(rows.map((row) => row.px)).toEqual([39, 31, 25, 20, 16, 13]);
  });

  it('opens body text to 1.5 (WCAG 1.4.12) and closes the headings', () => {
    for (const row of rows) {
      const ratio = row.leadingPt / row.pt;
      if (row.level === 'body' || row.level === 'caption')
        expect(ratio).toBeGreaterThanOrEqual(1.4);
      else expect(ratio).toBeLessThanOrEqual(1.3);
    }
    expect(rows.find((row) => row.level === 'h1')?.tracking).toBeLessThan(0);
    expect(rows.find((row) => row.level === 'body')?.tracking).toBe(0);
  });
});

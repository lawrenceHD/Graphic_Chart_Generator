import { describe, expect, it } from 'vitest';
import {
  evidenceLine,
  evidenceOf,
  mockupScenes,
  occurrencesOf,
  paletteRoles,
  typeFocus,
} from './variant';

describe('occurrencesOf', () => {
  it('numbers each page among the pages of its type', () => {
    const result = occurrencesOf([
      { type: 'palette' },
      { type: 'logo' },
      { type: 'palette' },
      { type: 'palette' },
    ]);
    expect(result).toEqual([
      { index: 0, count: 3 },
      { index: 0, count: 1 },
      { index: 1, count: 3 },
      { index: 2, count: 3 },
    ]);
  });
});

describe('paletteRoles', () => {
  it('shows the four roles on a single palette page', () => {
    expect(paletteRoles({ index: 0, count: 1 })).toEqual([
      'primary',
      'accent',
      'neutralLight',
      'neutralDark',
    ]);
  });

  it('gives primary, accent then neutrals to three pages', () => {
    const roles = [0, 1, 2].map((index) => paletteRoles({ index, count: 3 }));
    expect(roles).toEqual([['primary'], ['accent'], ['neutralLight', 'neutralDark']]);
  });

  it('splits two pages in colours then neutrals', () => {
    expect(paletteRoles({ index: 0, count: 2 })).toEqual(['primary', 'accent']);
    expect(paletteRoles({ index: 1, count: 2 })).toEqual(['neutralLight', 'neutralDark']);
  });

  it('never gives two pages of a plan the same roles', () => {
    for (const count of [2, 3]) {
      const seen = new Set(
        Array.from({ length: count }, (_, index) => paletteRoles({ index, count }).join()),
      );
      expect(seen.size).toBe(count);
    }
  });
});

describe('typeFocus', () => {
  it('shows both families on a single page, then headings, then text', () => {
    expect(typeFocus({ index: 0, count: 1 })).toBe('both');
    expect(typeFocus({ index: 0, count: 2 })).toBe('headings');
    expect(typeFocus({ index: 1, count: 2 })).toBe('text');
  });
});

describe('mockupScenes', () => {
  it('keeps the historical trio on a single page and changes scenes per page', () => {
    expect(mockupScenes({ index: 0, count: 1 })).toEqual([
      'cards-floating',
      'a4-sheet',
      'mug-white',
    ]);
    const first = mockupScenes({ index: 0, count: 2 });
    const second = mockupScenes({ index: 1, count: 2 });
    expect(first.filter((scene) => second.includes(scene))).toEqual([]);
  });
});

describe('evidenceOf', () => {
  it('reads the evidence references of a page', () => {
    expect(evidenceOf({ evidence: ['logo.svg', 'site: couleurs'] })).toEqual([
      'logo.svg',
      'site: couleurs',
    ]);
  });

  it('ignores absent, malformed and empty evidence', () => {
    expect(evidenceOf({})).toEqual([]);
    expect(evidenceOf({ evidence: 'x' })).toEqual([]);
    expect(evidenceOf({ evidence: [1] })).toEqual([]);
    expect(evidenceOf(undefined)).toEqual([]);
    expect(evidenceOf({ evidence: ['  ', 'a'] })).toEqual(['a']);
  });
});

describe('evidenceLine', () => {
  it('is null without evidence', () => {
    expect(evidenceLine('Preuve', [])).toBeNull();
  });

  it('lists up to three references and counts the rest', () => {
    expect(evidenceLine('Preuve', ['a', 'b'])).toBe('Preuve : a, b');
    expect(evidenceLine('Preuve', ['a', 'b', 'c', 'd', 'e'])).toBe('Preuve : a, b, c, +2');
  });
});

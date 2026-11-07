import { describe, expect, it } from 'vitest';
import {
  clearSpaceView,
  contrastView,
  doDontView,
  evidenceLine,
  evidenceOf,
  logoView,
  manifestoView,
  mockupScenes,
  occurrencesOf,
  paletteView,
  typeView,
  type Occurrence,
} from './variant';

const ranks = (count: number): readonly Occurrence[] =>
  Array.from({ length: count }, (_, index) => ({ index, count }));

describe('occurrencesOf', () => {
  it('reads the rank from the page id, not from its position', () => {
    const result = occurrencesOf([
      { id: 'page-palette-3', type: 'palette' },
      { id: 'page-logo', type: 'logo' },
      { id: 'page-palette-2', type: 'palette' },
    ]);
    expect(result).toEqual([
      { index: 2, count: 2 },
      { index: 0, count: 1 },
      { index: 1, count: 2 },
    ]);
  });

  it('keeps the rank of a page when an earlier page of its type is deleted', () => {
    const [neutrals] = occurrencesOf([{ id: 'page-palette-3', type: 'palette' }]);
    expect(neutrals?.index).toBe(2);
  });

  it('handles type names with a hyphen', () => {
    const result = occurrencesOf([
      { id: 'page-clear-space', type: 'clear-space' },
      { id: 'page-clear-space-2', type: 'clear-space' },
    ]);
    expect(result.map((entry) => entry.index)).toEqual([0, 1]);
  });

  it('falls back on the order for ids that do not follow the pattern', () => {
    const result = occurrencesOf([
      { id: 'a', type: 'logo' },
      { id: 'b', type: 'logo' },
    ]);
    expect(result.map((entry) => entry.index)).toEqual([0, 1]);
  });
});

describe('paletteView', () => {
  it('shows the four roles on a single page', () => {
    expect(paletteView({ index: 0, count: 1 })).toEqual({ kind: 'overview' });
  });

  it('gives primary, accent then neutrals, then an overview', () => {
    expect(paletteView({ index: 0, count: 4 })).toEqual({ kind: 'roles', roles: ['primary'] });
    expect(paletteView({ index: 1, count: 4 })).toEqual({ kind: 'roles', roles: ['accent'] });
    expect(paletteView({ index: 2, count: 4 })).toEqual({
      kind: 'roles',
      roles: ['neutralLight', 'neutralDark'],
    });
    expect(paletteView({ index: 3, count: 4 })).toEqual({ kind: 'overview' });
  });
});

describe('non-repetition up to 11 pages of a type', () => {
  const same = (list: readonly unknown[]): number =>
    new Set(list.map((v) => JSON.stringify(v))).size;

  it.each([
    ['palette', paletteView],
    ['typography', typeView],
    ['do-dont', doDontView],
    ['mockup', mockupScenes],
  ] as const)('%s never repeats a page', (_type, view) => {
    expect(same(ranks(11).map((occurrence) => view(occurrence)))).toBe(11);
  });

  it.each([
    ['manifesto', manifestoView, 4],
    ['logo', logoView, 4],
    ['clear-space', clearSpaceView, 3],
    ['contrast', contrastView, 2],
  ] as const)('%s has its own content up to its capacity, then says so', (_t, view, capacity) => {
    const real = ranks(11).filter((occurrence) => view(occurrence).kind !== 'beyond');
    expect(real).toHaveLength(capacity);
    expect(same(real.map((occurrence) => view(occurrence)))).toBe(capacity);
    const past = ranks(11).filter((occurrence) => occurrence.index >= capacity);
    for (const occurrence of past)
      expect(view(occurrence)).toEqual({ kind: 'beyond', rank: occurrence.index });
  });

  it('keeps the unique page of a type on its overview', () => {
    expect(manifestoView({ index: 0, count: 1 }).kind).toBe('overview');
    expect(logoView({ index: 0, count: 1 }).kind).toBe('overview');
    expect(clearSpaceView({ index: 0, count: 1 }).kind).toBe('overview');
    expect(contrastView({ index: 0, count: 1 }).kind).toBe('matrix');
    expect(typeView({ index: 0, count: 1 }).kind).toBe('both');
    expect(doDontView({ index: 0, count: 1 }).kind).toBe('logo');
  });

  it('says so explicitly instead of repeating a page past its capacity', () => {
    expect(paletteView({ index: 40, count: 41 })).toEqual({ kind: 'beyond', rank: 40 });
    expect(typeView({ index: 40, count: 41 })).toEqual({ kind: 'beyond', rank: 40 });
    expect(doDontView({ index: 40, count: 41 })).toEqual({ kind: 'beyond', rank: 40 });
  });
});

describe('mockupScenes', () => {
  it('keeps the historical trio on a single page', () => {
    expect(mockupScenes({ index: 0, count: 1 })).toEqual({
      kind: 'scenes',
      scenes: ['cards-floating', 'a4-sheet', 'mug-white'],
    });
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

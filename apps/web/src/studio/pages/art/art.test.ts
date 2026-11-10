import { describe, expect, it } from 'vitest';
import { MOODS, moodOf, variantFor } from './mood';
import { MOTIF_KINDS, motifCells } from './motif';

const axes = (serious: number, classic: number, sober: number, formal = 50) =>
  [
    { id: 'formal-casual', value: formal },
    { id: 'serious-playful', value: serious },
    { id: 'classic-avantgarde', value: classic },
    { id: 'sober-expressive', value: sober },
  ] as const;

describe('mood of a brand', () => {
  it('reads playful and expressive brands as warm', () => {
    expect(moodOf(axes(80, 50, 70))).toBe('warm');
  });
  it('reads avant-garde and expressive brands without play as editorial', () => {
    expect(moodOf(axes(40, 80, 75))).toBe('editorial');
  });
  it('reads sober, classic, serious brands as strict', () => {
    expect(moodOf(axes(20, 25, 20, 15))).toBe('strict');
  });
  it('is strict without any tone', () => {
    expect(moodOf([])).toBe('strict');
  });
});

describe('variant choice', () => {
  const list = ['a', 'b', 'c'] as const;
  it('gives distinct compositions to the pages of one type up to the list length', () => {
    const picked = [0, 1, 2].map((index) => variantFor(list, 'warm', { index, count: 3 }));
    expect(new Set(picked).size).toBe(3);
  });
  it('lets the mood choose the lead composition of a single page', () => {
    const lead = MOODS.map((mood) => variantFor(list, mood, { index: 0, count: 1 }));
    expect(new Set(lead).size).toBe(3);
  });
  it('wraps past the list instead of failing', () => {
    expect(variantFor(list, 'strict', { index: 7, count: 9 })).toBeDefined();
  });
});

describe('motif cells', () => {
  const base = { cols: 5, rows: 3, seed: 'khan' } as const;
  it('is deterministic for a seed', () => {
    expect(motifCells({ ...base, kind: 'turn' })).toEqual(motifCells({ ...base, kind: 'turn' }));
  });
  it('differs with the seed', () => {
    expect(motifCells({ ...base, kind: 'turn' })).not.toEqual(
      motifCells({ ...base, kind: 'turn', seed: 'other' }),
    );
  });
  it('fills the grid, one cell per place', () => {
    for (const kind of MOTIF_KINDS) expect(motifCells({ ...base, kind })).toHaveLength(15);
  });
  it('always shows the mark at least once and never two touching cells of one field', () => {
    for (const kind of MOTIF_KINDS) {
      const cells = motifCells({ ...base, kind });
      expect(cells.some((cell) => cell.mark)).toBe(true);
      for (const a of cells)
        for (const b of cells)
          if (Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1)
            expect(a.field === b.field && a.mark === b.mark && a.turn === b.turn).toBe(false);
    }
  });
  it('turns the mark only by quarter turns', () => {
    for (const kind of MOTIF_KINDS)
      for (const cell of motifCells({ ...base, kind })) expect([0, 90, 180, 270]).toContain(cell.turn);
  });
});

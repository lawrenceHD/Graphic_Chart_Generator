// A procedural pattern drawn from the logo itself: the mark repeated, turned by quarter turns, set on a
// chequer of two brand fields or on its own. Deterministic (the seed is the brand name): no randomness at
// render time, and never two touching cells that look alike (neighbours always change field).
export const MOTIF_KINDS = ['repeat', 'turn', 'checker', 'scatter'] as const;
export type MotifKind = (typeof MOTIF_KINDS)[number];

export type MotifField = 'primary' | 'accent' | 'light' | 'dark';

export interface MotifCell {
  readonly col: number;
  readonly row: number;
  readonly field: MotifField;
  /** False: the cell is a plain flat of its field. */
  readonly mark: boolean;
  readonly turn: 0 | 90 | 180 | 270;
}

const PAIRS: readonly (readonly [MotifField, MotifField])[] = [
  ['primary', 'light'],
  ['dark', 'primary'],
  ['accent', 'light'],
  ['primary', 'accent'],
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stream(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TURNS = [0, 90, 180, 270] as const;

export function motifCells(input: {
  readonly cols: number;
  readonly rows: number;
  readonly seed: string;
  readonly kind: MotifKind;
}): readonly MotifCell[] {
  const { cols, rows, kind } = input;
  const seed = hash(`${input.seed}:${kind}`);
  const next = stream(seed);
  const pair = PAIRS[seed % PAIRS.length] ?? PAIRS[0];
  if (pair === undefined) return [];
  const cells: MotifCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const parity = (col + row) % 2;
      const field = pair[parity] ?? pair[0];
      const draw = next();
      const turn = TURNS[Math.floor(draw * 4) % 4] ?? 0;
      let mark = true;
      let angle: MotifCell['turn'] = 0;
      if (kind === 'turn') angle = TURNS[(col + 2 * row + (seed >>> 8)) % 4] ?? 0;
      if (kind === 'checker') mark = parity === 0;
      if (kind === 'scatter') {
        mark = parity === 0 || draw > 0.5;
        angle = turn;
      }
      cells.push({ col, row, field, mark, turn: angle });
    }
  }
  return cells;
}

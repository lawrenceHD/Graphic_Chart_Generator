import { contrastRatio, wcagLevel, type WcagLevel } from './contrast.js';

// 05_ENGINES.md §2.9.
export interface ContrastCell {
  readonly text: string;
  readonly background: string;
  readonly ratio: number;
  readonly level: WcagLevel;
}

export interface BestText {
  readonly background: string;
  readonly text: string;
  readonly ratio: number;
}

export interface ContrastMatrix {
  readonly cells: readonly ContrastCell[];
  /** One entry per palette colour, in palette order. */
  readonly bestText: readonly BestText[];
}

/** Candidate with the highest ratio on `background`; on ties the earlier candidate wins (stable). */
export function bestTextFor(background: string, candidates: readonly string[]): BestText {
  let best: BestText | undefined;
  for (const text of candidates) {
    const ratio = contrastRatio(text, background);
    if (best === undefined || ratio > best.ratio) best = { background, text, ratio };
  }
  if (best === undefined) throw new RangeError('bestTextFor needs at least one candidate.');
  return best;
}

/** `palette` in the order [primary, accent, neutralLight, neutralDark, ...extra]; every ordered pair, no diagonal. */
export function buildContrastMatrix(palette: readonly string[]): ContrastMatrix {
  const cells: ContrastCell[] = [];
  for (const background of palette) {
    for (const text of palette) {
      if (text === background) continue;
      const ratio = contrastRatio(text, background);
      cells.push({ text, background, ratio, level: wcagLevel(ratio) });
    }
  }
  const bestText = palette.map((background) =>
    bestTextFor(background, [...palette.filter((hex) => hex !== background), '#000000', '#FFFFFF']),
  );
  return { cells, bestText };
}

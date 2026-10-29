import type { IndexedReference, ReferenceCard } from '@app/contracts';

export const DIMENSIONS = 64;

// A unit vector along one axis, blended with a second axis: lets tests place references at known angles.
export function direction(axis: number, blendAxis = axis, blend = 0): number[] {
  const vector = Array.from({ length: DIMENSIONS }, () => 0);
  vector[axis] = 1 - blend;
  vector[blendAxis] = (vector[blendAxis] ?? 0) + blend;
  return vector;
}

const baseCard: ReferenceCard = {
  kind: 'brand-board',
  sections: ['logo', 'palette', 'typography'],
  mockups: [],
  styles: ['minimal'],
  headingType: 'grotesque-sans',
  bodyType: 'grotesque-sans',
  whitespace: 'balanced',
  background: 'light',
  palette: ['#1F3A2E'],
  quality: 4,
  insight: 'Generic insight.',
};

export function reference(
  id: string,
  sector: string,
  embedding: number[],
  card: Partial<ReferenceCard> = {},
): IndexedReference {
  return {
    id,
    sector,
    file: `${sector}/${id}.jpg`,
    card: { ...baseCard, ...card },
    embedding,
    model: { vision: 'test', embedding: 'gemini-embedding-2', dimensions: DIMENSIONS },
  };
}

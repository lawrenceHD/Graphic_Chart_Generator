import { deltaEOk, hexToOklch } from '@app/color-engine';
import type { IndexedReference, ReferenceKind, VisualStyle } from '@app/contracts';
import { sectorAffinity } from './sectors.js';

export interface ResearchQuery {
  sector: string;
  styles: VisualStyle[];
  palette: string[];
  // Image embedding of the user's logo, same model and size as the library (absent: ranked without it).
  logoEmbedding?: number[];
}

export interface ScoreBreakdown {
  visual?: number;
  sector: number;
  style: number;
  palette: number;
  quality: number;
  // Only when the search has a purpose: how well the kind of image serves it.
  kind?: number;
}

export interface RankedReference {
  reference: IndexedReference;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface RankOptions {
  limit: number;
  minQuality?: number;
  // 1 = pure relevance, lower = more variety between the selected references (maximal marginal relevance).
  relevanceWeight?: number;
  // What the references are for: a charter search favours guideline spreads, a mockup search mockup scenes.
  purpose?: SearchPurpose;
}

export type SearchPurpose = 'charter' | 'mockups';

const WEIGHTS = {
  visual: 0.4,
  sector: 0.25,
  style: 0.2,
  palette: 0.1,
  quality: 0.05,
  kind: 0.1,
} as const;
// OKLab distance at which two brand colours stop reading as the same family.
const PALETTE_FALLOFF = 0.15;
// Share of the palette score that asks the reference to carry the brand colours (the rest: the reference's own
// leading colours must be found in the brand).
const PALETTE_FORWARD = 0.65;
const PALETTE_DEPTH = 3;

const KIND_FIT: Record<SearchPurpose, Partial<Record<ReferenceKind, number>>> = {
  charter: { 'guideline-spread': 1, 'brand-board': 0.8, 'logo-presentation': 0.4, stationery: 0.3 },
  mockups: {
    'mockup-scene': 1,
    packaging: 0.9,
    stationery: 0.9,
    signage: 0.9,
    apparel: 0.9,
    'social-media': 0.7,
    'digital-ui': 0.6,
    'brand-board': 0.4,
  },
};

export function cosine(a: readonly number[], b: readonly number[]): number {
  // Vectors of different sizes come from different models: they are not comparable.
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const x = a[index] ?? 0;
    const y = b[index] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB);
}

function jaccard<T>(a: readonly T[], b: readonly T[]): number {
  const left = new Set(a);
  const right = new Set(b);
  const union = new Set([...left, ...right]).size;
  if (union === 0) return 0;
  return [...left].filter((item) => right.has(item)).length / union;
}

// Plain white and black paper (and the greys near them) carry no brand hue: the library palettes exclude them too.
function isNeutral(hex: string): boolean {
  const { L, C } = hexToOklch(hex);
  return C < 0.03 && (L > 0.9 || L < 0.25);
}

// Mean closeness of each colour of `from` (leading colours weigh more) to its nearest colour of `to`.
function coverage(from: readonly string[], to: readonly string[]): number {
  let total = 0;
  let weights = 0;
  from.forEach((colour, index) => {
    const weight = 1 / (1 + 0.5 * index);
    const closest = Math.min(...to.map((other) => deltaEOk(colour, other)));
    total += weight * Math.exp(-closest / PALETTE_FALLOFF);
    weights += weight;
  });
  return weights === 0 ? 0 : total / weights;
}

function paletteAffinity(query: readonly string[], palette: readonly string[]): number {
  if (query.length === 0 || palette.length === 0) return 0;
  const chromatic = query.filter((colour) => !isNeutral(colour));
  const brand = chromatic.length > 0 ? chromatic : query;
  return (
    PALETTE_FORWARD * coverage(brand, palette) +
    (1 - PALETTE_FORWARD) * coverage(palette.slice(0, PALETTE_DEPTH), brand)
  );
}

function score(
  query: ResearchQuery,
  reference: IndexedReference,
  purpose: SearchPurpose | undefined,
): RankedReference {
  const { card } = reference;
  const breakdown: ScoreBreakdown = {
    sector: sectorAffinity(query.sector, reference.sector),
    style: jaccard(query.styles, card.styles),
    palette: paletteAffinity(query.palette, card.palette),
    quality: (card.quality - 1) / 4,
  };
  let total =
    WEIGHTS.sector * breakdown.sector +
    WEIGHTS.style * breakdown.style +
    WEIGHTS.palette * breakdown.palette +
    WEIGHTS.quality * breakdown.quality;
  let weight = WEIGHTS.sector + WEIGHTS.style + WEIGHTS.palette + WEIGHTS.quality;
  if (purpose !== undefined) {
    breakdown.kind = KIND_FIT[purpose][card.kind] ?? 0;
    total += WEIGHTS.kind * breakdown.kind;
    weight += WEIGHTS.kind;
  }
  if (query.logoEmbedding && query.logoEmbedding.length === reference.embedding.length) {
    breakdown.visual = Math.max(0, cosine(query.logoEmbedding, reference.embedding));
    total += WEIGHTS.visual * breakdown.visual;
    weight += WEIGHTS.visual;
  }
  return { reference, score: total / weight, breakdown };
}

export function rankReferences(
  query: ResearchQuery,
  library: readonly IndexedReference[],
  options: RankOptions,
): RankedReference[] {
  const minQuality = options.minQuality ?? 3;
  const lambda = options.relevanceWeight ?? 0.7;
  const candidates = library
    .filter((reference) => reference.card.quality >= minQuality)
    .map((reference) => score(query, reference, options.purpose))
    .sort((a, b) => b.score - a.score || a.reference.id.localeCompare(b.reference.id));
  const selected: RankedReference[] = [];
  while (selected.length < options.limit && candidates.length > 0) {
    let bestIndex = 0;
    let bestValue = Number.NEGATIVE_INFINITY;
    candidates.forEach((candidate, index) => {
      const redundancy = selected.reduce(
        (max, chosen) =>
          Math.max(max, cosine(candidate.reference.embedding, chosen.reference.embedding)),
        0,
      );
      const value = lambda * candidate.score - (1 - lambda) * redundancy;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    const [chosen] = candidates.splice(bestIndex, 1);
    if (chosen) selected.push(chosen);
  }
  return selected;
}

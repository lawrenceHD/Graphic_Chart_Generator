import { deltaEOk } from '@app/color-engine';
import type { IndexedReference, VisualStyle } from '@app/contracts';

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
}

const WEIGHTS = { visual: 0.4, sector: 0.25, style: 0.2, palette: 0.1, quality: 0.05 } as const;
// OKLab distance at which two brand colours stop reading as the same family.
const PALETTE_FALLOFF = 0.15;

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

function paletteAffinity(query: readonly string[], palette: readonly string[]): number {
  if (query.length === 0 || palette.length === 0) return 0;
  let closest = Number.POSITIVE_INFINITY;
  for (const a of query) for (const b of palette) closest = Math.min(closest, deltaEOk(a, b));
  return Math.exp(-closest / PALETTE_FALLOFF);
}

function score(query: ResearchQuery, reference: IndexedReference): RankedReference {
  const { card } = reference;
  const breakdown: ScoreBreakdown = {
    sector: reference.sector === query.sector ? 1 : 0,
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
    .map((reference) => score(query, reference))
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

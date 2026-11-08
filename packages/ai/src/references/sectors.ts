import type { ReferenceSector } from '@app/contracts';

// Sectors whose brand identities borrow codes from each other (a bakery reads like a cafe, a clinic like a
// beauty salon). Used when the exact sector has few or no references in the library: 14 of the 19 sectors of
// the owner's library were collected but not indexed on 2026-11-09, so an exact match alone would score 0.
// Weights: 1 = same sector (handled by the caller), then the strength of the family resemblance.
const RELATED: readonly (readonly [ReferenceSector, ReferenceSector, number])[] = [
  ['restaurant', 'cafe-bakery', 0.5],
  ['restaurant', 'hospitality-events', 0.5],
  ['cafe-bakery', 'hospitality-events', 0.4],
  ['restaurant', 'agriculture-food-products', 0.35],
  ['cafe-bakery', 'agriculture-food-products', 0.35],
  ['fashion', 'beauty-cosmetics', 0.5],
  ['fashion', 'retail-ecommerce', 0.4],
  ['beauty-cosmetics', 'retail-ecommerce', 0.3],
  ['beauty-cosmetics', 'health-clinic', 0.35],
  ['health-clinic', 'sport-fitness', 0.3],
  ['tech-startup', 'finance', 0.35],
  ['tech-startup', 'consulting-legal', 0.3],
  ['finance', 'consulting-legal', 0.5],
  ['finance', 'real-estate-construction', 0.3],
  ['real-estate-construction', 'consulting-legal', 0.3],
  ['real-estate-construction', 'transport-logistics', 0.3],
  ['transport-logistics', 'retail-ecommerce', 0.3],
  ['education', 'kids-family', 0.5],
  ['education', 'ngo-community', 0.4],
  ['ngo-community', 'kids-family', 0.3],
  ['ngo-community', 'african-brands', 0.3],
  ['media-music-creative', 'hospitality-events', 0.35],
  ['media-music-creative', 'tech-startup', 0.3],
  ['agriculture-food-products', 'african-brands', 0.3],
  ['fashion', 'african-brands', 0.3],
];

const affinities = new Map<string, number>();
for (const [a, b, weight] of RELATED) {
  affinities.set(`${a}|${b}`, weight);
  affinities.set(`${b}|${a}`, weight);
}

/** 1 for the same sector, the family resemblance (0 to 0.5) for a related one, 0 otherwise. */
export function sectorAffinity(brand: string, reference: string): number {
  if (brand === reference) return 1;
  return affinities.get(`${brand}|${reference}`) ?? 0;
}

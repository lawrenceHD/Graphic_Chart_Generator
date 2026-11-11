import type { Archetype, SceneCategory } from '@app/contracts';

// Inspiration searches built once the logo is analysed: the objects of the sector, the mood of the brand's
// archetype, and the pages of logo usage a professional guideline shows. The source searches channel titles,
// which designers name in two or three English words ("menu design", "brand guidelines"): longer queries find
// nothing (measured on 2026-11-11). Pure.

export interface InspirationQueries {
  /** Branding and mockups of the sector's objects, then the brand's mood. */
  readonly mockups: readonly string[];
  /** Logo usage pages: guidelines, variants, clear space, sizes. */
  readonly usage: readonly string[];
}

const OBJECTS: Readonly<Record<SceneCategory, readonly string[]>> = {
  hospitality: ['restaurant branding', 'menu design', 'cafe branding'],
  packaging: ['packaging design', 'label design', 'packaging mockups'],
  apparel: ['apparel branding', 'merch design', 'fashion branding'],
  signage: ['signage', 'wayfinding', 'storefront'],
  stationery: ['stationery', 'business cards', 'letterhead'],
  digital: ['app branding', 'digital branding', 'web design'],
  generic: ['brand identity', 'mockups', 'stationery'],
};

const MOOD: Readonly<Record<Archetype, string>> = {
  innocent: 'minimal branding',
  sage: 'editorial design',
  explorer: 'outdoor branding',
  outlaw: 'brutalist branding',
  magician: 'mystical branding',
  hero: 'sport branding',
  lover: 'elegant branding',
  jester: 'playful branding',
  everyman: 'warm branding',
  caregiver: 'soft branding',
  ruler: 'luxury branding',
  creator: 'bold branding',
};

const USAGE = ['brand guidelines', 'logo guidelines', 'brand manual'] as const;

export function buildInspirationQueries(input: {
  readonly sceneCategory: SceneCategory;
  readonly archetype: Archetype;
}): InspirationQueries {
  const mockups = [...OBJECTS[input.sceneCategory], MOOD[input.archetype]];
  return { mockups: [...new Set(mockups)], usage: [...USAGE] };
}

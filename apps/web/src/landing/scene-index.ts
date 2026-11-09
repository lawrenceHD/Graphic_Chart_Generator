import { z } from 'zod';

/**
 * Index of the mock-up scenes shipped under /public/scenes. The scene files themselves (scene.json, base.webp,
 * masks) are validated by mockup-engine; this index only says which scenes exist, how each was made and what it is
 * good for, so that a page can pick scenes without listing a directory. A test keeps it equal to the folder.
 */
export const SceneIndexEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    /** photo: a photograph with annotated surfaces; psd: a designer's Photoshop mock-up replayed layer by layer. */
    kind: z.enum(['photo', 'psd']),
    origin: z.enum(['flux-generated', 'psd-baked']),
    category: z.enum([
      'stationery',
      'digital',
      'signage',
      'generic',
      'hospitality',
      'packaging',
      'apparel',
    ]),
    /** What the objects are, for choosing a scene by the logo's shape (wide wordmark, square emblem...). */
    subject: z.string().min(1).max(80),
    /** Number of surfaces the logo is placed on (1 for most scenes). */
    surfaces: z.number().int().min(1).max(6),
  })
  .strict();
export type SceneIndexEntry = z.infer<typeof SceneIndexEntrySchema>;

const photo = (
  id: string,
  category: SceneIndexEntry['category'],
  subject: string,
  surfaces = 1,
): SceneIndexEntry => ({
  id,
  kind: 'photo',
  origin: 'flux-generated',
  category,
  subject,
  surfaces,
});
const psd = (
  id: string,
  category: SceneIndexEntry['category'],
  subject: string,
): SceneIndexEntry => ({
  id,
  kind: 'psd',
  origin: 'psd-baked',
  category,
  subject,
  surfaces: 1,
});

const SCENE_INDEX_DATA: readonly SceneIndexEntry[] = [
  // Brand-mockup pack (tools/scenes/packs/brand-mockups.json): the Pinterest-grade set.
  photo('blade-sign-street', 'signage', 'Blade sign on a shop facade'),
  photo('brochure-grey', 'stationery', 'Brochure cover on concrete'),
  photo('business-cards-sage', 'stationery', 'Business cards on sage paper', 2),
  photo('laptop-desk', 'digital', 'Laptop screen on a desk'),
  photo('mailer-box-blue', 'packaging', 'Mailer box on blue paper'),
  photo('notebook-flatlay', 'stationery', 'Hardcover notebook on linen'),
  photo('poster-frame-console', 'generic', 'Framed poster above a console'),
  photo('stationery-dark', 'stationery', 'Letterhead, envelope and card on slate', 3),
  photo('tote-terracotta', 'apparel', 'Canvas tote on a terracotta wall'),
  // Hospitality pack (tools/scenes/packs/hospitality.json).
  photo('apron', 'apparel', 'Linen apron on a peg'),
  photo('gift-box', 'packaging', 'Rigid gift box on linen'),
  photo('invitation', 'stationery', 'Deckle-edged invitation card'),
  photo('menu-table', 'hospitality', 'Menu card on a dinner table'),
  photo('napkin-plate', 'hospitality', 'Napkin on a plate'),
  photo('paper-bag', 'packaging', 'Paper shopping bag'),
  photo('phone-table', 'digital', 'Phone screen on a table'),
  photo('place-cards', 'hospitality', 'Three place cards', 3),
  photo('stationery-flatlay', 'stationery', 'Stationery flat lay', 4),
  photo('storefront-sign', 'signage', 'Panel beside a restaurant door'),
  // Designers' Photoshop mock-ups, replayed (tools/psd-mockups/bake.py).
  psd('a4-sheet', 'stationery', 'A4 sheet'),
  psd('cards-floating', 'stationery', 'Floating business cards'),
  psd('cards-stack', 'stationery', 'Stack of business cards'),
  psd('mug-stripes', 'hospitality', 'Striped mug'),
  psd('mug-white', 'hospitality', 'White mug'),
  psd('poster-hanging', 'generic', 'Hanging poster'),
  psd('poster-held', 'generic', 'Held poster'),
  psd('poster-living', 'generic', 'Poster in a living room'),
];

// Validated once at load: a malformed entry fails the build, not a visitor's page.
export const SCENE_INDEX: readonly SceneIndexEntry[] = SCENE_INDEX_DATA.map((entry) =>
  SceneIndexEntrySchema.parse(entry),
);

export function sceneIndexEntry(id: string): SceneIndexEntry | undefined {
  return SCENE_INDEX.find((entry) => entry.id === id);
}

import type { ArenaFound, Inspiration } from './inspiration/arena';
import type { InspirationQueries } from './inspiration/queries';
import { ARCHETYPES, SceneCategory, type Archetype } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';

// Inspirations of the studio (docs/research/2026-11-11-inspirations-mockups.md §5): searched when the person
// asks, from what the analysis left (scene category, archetype), in public sources only. Nothing is stored:
// an hour of memory per search spares the source and the person's wait, and is lost at restart.

export type InspirationKind = 'mockup' | 'usage';
export interface CollectedInspiration extends Inspiration {
  readonly kind: InspirationKind;
}
type Search = (query: string) => Promise<Result<ArenaFound, 'INSPIRATION_UNAVAILABLE'>>;

const TTL_MS = 60 * 60 * 1000;
const MAX_ITEMS = 18;

export function createInspirationCollector(deps: {
  readonly search: Search;
  readonly now: () => number;
}) {
  // Only complete answers are kept; a search under way is shared, so simultaneous clicks ask once.
  const cache = new Map<string, { readonly at: number; readonly items: readonly Inspiration[] }>();
  const pending = new Map<string, Promise<readonly Inspiration[] | null>>();
  const cached = (query: string): Promise<readonly Inspiration[] | null> => {
    const kept = cache.get(query);
    if (kept !== undefined && deps.now() - kept.at < TTL_MS) return Promise.resolve(kept.items);
    const running = pending.get(query);
    if (running !== undefined) return running;
    const asked = deps
      .search(query)
      .then((found) => {
        if (!found.ok) return null; // a failure is never kept: the next click tries again
        if (found.value.complete) cache.set(query, { at: deps.now(), items: found.value.items });
        return found.value.items;
      })
      .finally(() => {
        pending.delete(query);
      });
    pending.set(query, asked);
    return asked;
  };

  return async (
    queries: InspirationQueries,
  ): Promise<Result<readonly CollectedInspiration[], 'INSPIRATION_UNAVAILABLE'>> => {
    // The first two objects of the sector, the mood, and two kinds of guideline pages.
    const asked: readonly (readonly [string, InspirationKind])[] = [
      ...queries.mockups.slice(0, 2).map((query) => [query, 'mockup'] as const),
      ...queries.mockups.slice(-1).map((query) => [query, 'mockup'] as const),
      ...queries.usage.slice(0, 2).map((query) => [query, 'usage'] as const),
    ].filter(([query], index, all) => all.findIndex(([other]) => other === query) === index);
    const lists = await Promise.all(asked.map(([query]) => cached(query)));
    if (lists.every((list) => list === null)) return err('INSPIRATION_UNAVAILABLE');
    // Round robin over the searches, so the first screen mixes objects, mood and usage pages.
    const seen = new Set<string>();
    const items: CollectedInspiration[] = [];
    const longest = Math.max(...lists.map((list) => list?.length ?? 0));
    for (let rank = 0; rank < longest && items.length < MAX_ITEMS; rank += 1) {
      for (const [index, list] of lists.entries()) {
        const entry = list?.[rank];
        const kind = asked[index]?.[1];
        if (entry === undefined || kind === undefined || seen.has(entry.id)) continue;
        seen.add(entry.id);
        items.push({ ...entry, kind });
        if (items.length === MAX_ITEMS) break;
      }
    }
    return ok(items);
  };
}

const DocumentBrand = z.object({
  brand: z.object({ archetype: z.enum(ARCHETYPES) }).loose(),
});

/** The scene category of the project and the archetype of its document; an ordinary brand before both. */
export function inspirationInputOf(
  sceneCategory: string | null,
  document: unknown,
): { readonly sceneCategory: SceneCategory; readonly archetype: Archetype } {
  const category = SceneCategory.safeParse(sceneCategory);
  const brand = DocumentBrand.safeParse(document);
  return {
    sceneCategory: category.success ? category.data : 'generic',
    archetype: brand.success ? brand.data.brand.archetype : 'everyman',
  };
}

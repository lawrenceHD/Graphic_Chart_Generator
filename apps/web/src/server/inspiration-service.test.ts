import type { Inspiration } from './inspiration/arena';
import { describe, expect, it, vi } from 'vitest';
import { createInspirationCollector, inspirationInputOf } from './inspiration-service';

const item = (id: string, query: string): Inspiration => ({
  id,
  title: id,
  thumbnail: `https://images.are.na/${id}`,
  link: `https://dribbble.com/${id}`,
  author: null,
  via: `https://www.are.na/block/${id}`,
  query,
});

const queries = {
  mockups: ['restaurant branding', 'menu design', 'cafe branding', 'warm branding'],
  usage: ['brand guidelines', 'logo guidelines', 'brand manual'],
};

describe('inspiration collector', () => {
  it('alternates mockups and logo usage, without duplicates, capped', async () => {
    const search = vi.fn((query: string) =>
      Promise.resolve({
        ok: true as const,
        value: {
          complete: true,
          items: [item(`${query}-1`, query), item(`${query}-2`, query), item('shared', query)],
        },
      }),
    );
    const collect = createInspirationCollector({ search, now: () => 0 });
    const found = await collect(queries);
    if (!found.ok) throw new Error('expected inspirations');
    const ids = found.value.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(18);
    expect(found.value[0]?.kind).toBe('mockup');
    expect(found.value.some((entry) => entry.kind === 'usage')).toBe(true);
    // The sector, the mood and two kinds of guideline pages, not every query.
    expect(search).toHaveBeenCalledTimes(5);
    expect(search.mock.calls.map(([query]) => query)).toContain('warm branding');
  });

  it('serves the same searches from its cache for an hour', async () => {
    let clock = 0;
    const search = vi.fn((query: string) =>
      Promise.resolve({
        ok: true as const,
        value: { complete: true, items: [item(query, query)] },
      }),
    );
    const collect = createInspirationCollector({ search, now: () => clock });
    await collect(queries);
    await collect(queries);
    expect(search).toHaveBeenCalledTimes(5);
    clock = 61 * 60 * 1000;
    await collect(queries);
    expect(search).toHaveBeenCalledTimes(10);
  });

  it('is unavailable only when every search failed, and never caches a failure', async () => {
    const failing = vi.fn(() =>
      Promise.resolve({ ok: false as const, error: 'INSPIRATION_UNAVAILABLE' as const }),
    );
    const collect = createInspirationCollector({ search: failing, now: () => 0 });
    expect(await collect(queries)).toEqual({ ok: false, error: 'INSPIRATION_UNAVAILABLE' });
    await collect(queries);
    expect(failing).toHaveBeenCalledTimes(10);
  });

  it('shows a partial answer but does not keep it, and asks once for simultaneous clicks', async () => {
    let calls = 0;
    const search = (query: string) => {
      calls += 1;
      return Promise.resolve({
        ok: true as const,
        value: { complete: false, items: [item(query, query)] },
      });
    };
    const collect = createInspirationCollector({ search, now: () => 0 });
    const [first, second] = await Promise.all([collect(queries), collect(queries)]);
    expect(first.ok && first.value.length).toBe(5);
    expect(second.ok && second.value.length).toBe(5);
    expect(calls).toBe(5);
    await collect(queries);
    expect(calls).toBe(10);
  });
});

describe('inspirationInputOf (what the analysis left on the project)', () => {
  it('reads the scene category of the project and the archetype of its document', () => {
    expect(
      inspirationInputOf('hospitality', {
        brand: { archetype: 'caregiver', name: 'x' },
        pages: [],
      }),
    ).toEqual({ sceneCategory: 'hospitality', archetype: 'caregiver' });
  });
  it('falls back to a generic, ordinary brand before the analysis', () => {
    expect(inspirationInputOf(null, null)).toEqual({
      sceneCategory: 'generic',
      archetype: 'everyman',
    });
    expect(inspirationInputOf('spaceships', { brand: { archetype: 'pirate' } })).toEqual({
      sceneCategory: 'generic',
      archetype: 'everyman',
    });
  });
});

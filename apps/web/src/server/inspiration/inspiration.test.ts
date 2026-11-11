import { describe, expect, it } from 'vitest';
import { searchArena, type ArenaFetch } from './arena';
import { buildInspirationQueries } from './queries';

describe('buildInspirationQueries (after the analysis: sector, spirit of the brand)', () => {
  it('asks for mockups of the objects of the sector, in the mood of the archetype', () => {
    const queries = buildInspirationQueries({
      sceneCategory: 'hospitality',
      archetype: 'everyman',
    });
    expect(queries.mockups.length).toBeGreaterThanOrEqual(3);
    expect(queries.mockups.join(' | ')).toMatch(/restaurant|cafe|menu/u);
    expect(queries.mockups).toContain('warm branding');
  });

  it('writes queries of two or three words, the way designers name their channels', () => {
    for (const archetype of ['sage', 'ruler', 'jester'] as const) {
      const { mockups, usage } = buildInspirationQueries({ sceneCategory: 'packaging', archetype });
      for (const query of [...mockups, ...usage]) {
        expect(query.split(' ').length).toBeGreaterThanOrEqual(1);
        expect(query.split(' ').length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('asks for the guideline pages that show logo usage', () => {
    const { usage } = buildInspirationQueries({ sceneCategory: 'digital', archetype: 'sage' });
    expect(usage).toEqual(['brand guidelines', 'logo guidelines', 'brand manual']);
  });

  it('gives different objects to different sectors, without duplicates', () => {
    const food = buildInspirationQueries({ sceneCategory: 'hospitality', archetype: 'ruler' });
    const wear = buildInspirationQueries({ sceneCategory: 'apparel', archetype: 'ruler' });
    expect(food.mockups).not.toEqual(wear.mockups);
    const all = [...food.mockups, ...food.usage];
    expect(new Set(all).size).toBe(all.length);
  });
});

const channels = (slugs: readonly string[]) =>
  JSON.stringify({ channels: slugs.map((slug) => ({ slug, title: slug, length: 30 })) });
const image = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  class: 'Image',
  title: `Shot ${String(id)}`,
  image: { thumb: { url: `https://images.are.na/t${String(id)}` } },
  source: { url: `https://dribbble.com/shots/${String(id)}` },
  user: { full_name: 'Ada Lovelace', slug: 'ada' },
  ...extra,
});
const contents = (blocks: readonly unknown[]) => JSON.stringify({ contents: blocks });

function fakeArena(routes: Record<string, string | number>): {
  readonly fetch: ArenaFetch;
  readonly urls: string[];
} {
  const urls: string[] = [];
  const fetch: ArenaFetch = (url) => {
    urls.push(url);
    const key = Object.keys(routes).find((prefix) => url.includes(prefix));
    const answer = key === undefined ? 404 : routes[key];
    return Promise.resolve(
      typeof answer === 'number'
        ? new Response('', { status: answer })
        : new Response(answer, { status: 200 }),
    );
  };
  return { fetch, urls };
}

describe('searchArena (Are.na, public API, no key)', () => {
  it('reads the images of the channels found, with their author and original source', async () => {
    const arena = fakeArena({
      'search/channels': channels(['menu-design', 'cafe-branding']),
      'channels/menu-design/contents': contents([image(1), image(2)]),
      'channels/cafe-branding/contents': contents([image(3)]),
    });
    const found = await searchArena({ fetch: arena.fetch }, 'restaurant branding mockup');
    expect(found.ok && found.value.items.map((item) => item.id)).toEqual([
      'arena-1',
      'arena-2',
      'arena-3',
    ]);
    expect(found.ok && found.value.items[0]).toEqual({
      id: 'arena-1',
      title: 'Shot 1',
      thumbnail: 'https://images.are.na/t1',
      link: 'https://dribbble.com/shots/1',
      author: 'Ada Lovelace',
      via: 'https://www.are.na/block/1',
      query: 'restaurant branding mockup',
    });
    expect(arena.urls[0]).toContain('q=restaurant%20branding%20mockup');
    expect(found.ok && found.value.complete).toBe(true);
  });

  it('keeps only images served by Are.na, over https, and skips text or channel blocks', async () => {
    const arena = fakeArena({
      'search/channels': channels(['mixed']),
      'channels/mixed/contents': contents([
        image(1),
        { id: 2, class: 'Text', title: 'note' },
        { id: 3, class: 'Channel', title: 'sub' },
        image(4, { image: { thumb: { url: 'http://images.are.na/t4' } } }),
        image(5, { image: { thumb: { url: 'https://evil.example/t5' } } }),
        image(6, { class: 'Link', source: { url: 'javascript:alert(1)' } }),
      ]),
    });
    const found = await searchArena({ fetch: arena.fetch }, 'logo usage');
    expect(found.ok && found.value.items.map((item) => item.id)).toEqual(['arena-1', 'arena-6']);
    // A source that is not a web page is replaced by the Are.na block itself.
    expect(found.ok && found.value.items[1]?.link).toBe('https://www.are.na/block/6');
  });

  it('reports an unavailable service instead of failing, and survives one bad channel', async () => {
    const down = fakeArena({ 'search/channels': 503 });
    expect(await searchArena({ fetch: down.fetch }, 'logo usage')).toEqual({
      ok: false,
      error: 'INSPIRATION_UNAVAILABLE',
    });
    const partial = fakeArena({
      'search/channels': channels(['broken', 'good']),
      'channels/broken/contents': 'not json',
      'channels/good/contents': contents([image(7)]),
    });
    const found = await searchArena({ fetch: partial.fetch }, 'logo usage');
    expect(found.ok && found.value.items.map((item) => item.id)).toEqual(['arena-7']);
    expect(found.ok && found.value.complete).toBe(false);
  });

  it('stays light: two channels, twelve blocks each at most', async () => {
    const arena = fakeArena({
      'search/channels': channels(['a', 'b', 'c', 'd']),
      'channels/': contents([image(1)]),
    });
    await searchArena({ fetch: arena.fetch }, 'logo usage');
    expect(arena.urls.filter((url) => url.includes('/contents')).length).toBe(2);
    expect(arena.urls.every((url) => !url.includes('/contents') || url.includes('per=12'))).toBe(
      true,
    );
  });

  it('drops links carrying credentials, thumbnails with a port, and invisible characters', async () => {
    const arena = fakeArena({
      'search/channels': channels(['tricky']),
      'channels/tricky/contents': contents([
        image(1, { source: { url: 'https://user:pass@phish.example/' } }),
        image(2, { image: { thumb: { url: 'https://images.are.na:8443/t2' } } }),
        image(3, { title: 'Me‮nu​ ', user: { full_name: 'Ada' } }),
      ]),
    });
    const found = await searchArena({ fetch: arena.fetch }, 'logo usage');
    if (!found.ok) throw new Error('expected items');
    expect(found.value.items.map((item) => item.id)).toEqual(['arena-1', 'arena-3']);
    expect(found.value.items[0]?.link).toBe('https://www.are.na/block/1');
    expect(found.value.items[1]?.title).toBe('Menu');
    expect(found.value.items[1]?.author).toBe('Ada');
  });

  it('refuses to follow a redirection', async () => {
    const inits: unknown[] = [];
    const fetch: ArenaFetch = (_url, init) => {
      inits.push(init.redirect);
      return Promise.resolve(new Response(channels([]), { status: 200 }));
    };
    await searchArena({ fetch }, 'logo usage');
    expect(inits).toEqual(['error']);
  });
});

import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';

// Are.na (https://dev.are.na), public API without a key: channels kept by designers ("brand guidelines",
// "menu design"), whose image blocks point to their original page (Dribbble, Behance, studios). Searching
// blocks directly is refused to anonymous clients; channels, then their contents, are not. The answer is
// untrusted: validated by Zod, images kept only when Are.na serves them over https, links only to web pages.
// Nothing is stored: the studio shows the thumbnail from Are.na and links to the source (no redistribution).

export type ArenaFetch = (
  url: string,
  init: {
    readonly headers: Record<string, string>;
    readonly signal: AbortSignal;
    readonly redirect: 'error';
  },
) => Promise<Response>;

export interface ArenaFound {
  readonly items: readonly Inspiration[];
  /** False when a channel could not be read: worth showing, not worth keeping. */
  readonly complete: boolean;
}

export interface Inspiration {
  readonly id: string;
  readonly title: string;
  /** Served by Are.na; never copied. */
  readonly thumbnail: string;
  /** The original page (the designer's), else the Are.na block. */
  readonly link: string;
  readonly author: string | null;
  /** The Are.na block, credited next to the source. */
  readonly via: string;
  readonly query: string;
}

const API = 'https://api.are.na/v2';
const CHANNELS = 2;
const BLOCKS = 12;
const TIMEOUT_MS = 8_000;
const IMAGE_HOST = 'images.are.na';

const ChannelSearch = z.object({
  channels: z.array(z.object({ slug: z.string().regex(/^[\w-]+$/u) }).loose()),
});
const Block = z
  .object({
    id: z.number().int().positive(),
    class: z.string(),
    title: z.string().nullish(),
    image: z
      .object({ thumb: z.object({ url: z.string() }).loose() })
      .loose()
      .nullish(),
    source: z.object({ url: z.string().nullish() }).loose().nullish(),
    user: z.object({ full_name: z.string().nullish() }).loose().nullish(),
  })
  .loose();
const Contents = z.object({ contents: z.array(z.unknown()) });

const MAX_BODY_BYTES = 2 * 1024 * 1024;
// Control, zero-width and bidi characters: a title could reorder or hide what the studio shows.
const INVISIBLE_RANGES: readonly (readonly [number, number])[] = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];
const INVISIBLE = new RegExp(
  `[${INVISIBLE_RANGES.map(([from, to]) => `${String.fromCodePoint(from)}-${String.fromCodePoint(to)}`).join('')}]`,
  'gu',
);
const clean = (value: string, max: number): string =>
  value.replace(INVISIBLE, '').trim().slice(0, max);

/** An https URL without credentials or port (the CSP would refuse a port), on `host` when given. */
export const httpsOn = (value: string, host?: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      (host === undefined || url.hostname === host)
    );
  } catch {
    return false; // not a URL: dropped
  }
};

async function getJson(fetch: ArenaFetch, url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Charta/0.1' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`are.na ${String(response.status)}`);
  const body = await response.text();
  if (body.length > MAX_BODY_BYTES) throw new Error('are.na answer too large');
  return JSON.parse(body);
}

const authorOf = (name: string | null | undefined): string | null => {
  const cleaned = clean(name ?? '', 80);
  return cleaned === '' ? null : cleaned;
};

function inspirationOf(raw: unknown, query: string): Inspiration | null {
  const block = Block.safeParse(raw);
  if (!block.success || (block.data.class !== 'Image' && block.data.class !== 'Link')) return null;
  const thumbnail = block.data.image?.thumb.url ?? '';
  if (!httpsOn(thumbnail, IMAGE_HOST)) return null;
  const via = `https://www.are.na/block/${String(block.data.id)}`;
  const source = block.data.source?.url ?? '';
  return {
    id: `arena-${String(block.data.id)}`,
    title: clean(block.data.title ?? '', 140),
    thumbnail,
    link: httpsOn(source) ? source : via,
    author: authorOf(block.data.user?.full_name),
    via,
    query,
  };
}

export async function searchArena(
  deps: { readonly fetch: ArenaFetch },
  query: string,
): Promise<Result<ArenaFound, 'INSPIRATION_UNAVAILABLE'>> {
  let slugs: string[];
  try {
    const found = ChannelSearch.safeParse(
      await getJson(deps.fetch, `${API}/search/channels?q=${encodeURIComponent(query)}&per=5`),
    );
    if (!found.success) return err('INSPIRATION_UNAVAILABLE');
    slugs = found.data.channels.slice(0, CHANNELS).map((channel) => channel.slug);
  } catch {
    return err('INSPIRATION_UNAVAILABLE'); // down, refused or timed out: the studio says so
  }
  const lists = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const listed = Contents.safeParse(
          await getJson(deps.fetch, `${API}/channels/${slug}/contents?per=${String(BLOCKS)}`),
        );
        return listed.success ? listed.data.contents : null;
      } catch {
        return null; // one unreadable channel does not hide the others, but the answer is partial
      }
    }),
  );
  const seen = new Set<string>();
  const items: Inspiration[] = [];
  for (const raw of lists.flatMap((list) => list ?? [])) {
    const item = inspirationOf(raw, query);
    if (item === null || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return ok({ items, complete: lists.every((list) => list !== null) });
}

import { deltaEOk } from '@app/color-engine';
import type { SceneCategory } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';

// Free photographs for the built applications (docs/research/2026-11-11-univers-de-marque.md §3): Pexels, then
// Unsplash, with the owner's free keys, server side only. Both licences allow modification and commercial use
// with credit; neither image is ever stored: the studio shows it from the provider's CDN (Unsplash requires the
// hotlink) with the photographer named. Every answer is untrusted: validated by Zod, images kept only when the
// provider's own CDN serves them over https.

export type PhotoFetch = (
  url: string,
  init: {
    readonly headers: Record<string, string>;
    readonly signal: AbortSignal;
    readonly redirect: 'error';
  },
) => Promise<Response>;

export type PhotoProvider = 'pexels' | 'unsplash';
export type Orientation = 'portrait' | 'landscape' | 'squarish';

export interface Photo {
  readonly id: string;
  readonly provider: PhotoProvider;
  /** Small, for the picker. */
  readonly thumbnail: string;
  /** Large enough for an A4 page at screen resolution. */
  readonly image: string;
  readonly width: number;
  readonly height: number;
  /** Average colour given by the provider, #RRGGBB. */
  readonly color: string;
  readonly alt: string;
  readonly author: string;
  readonly authorLink: string;
  readonly sourceLink: string;
  /** Unsplash: to be called once the photo is chosen (its API guidelines); null for Pexels. */
  readonly downloadLocation: string | null;
}

export interface PhotoSearch {
  readonly query: string;
  readonly orientation: Orientation;
  /** The brand's primary colour, #RRGGBB. */
  readonly color: string;
}

type Found = Result<readonly Photo[], 'PHOTOS_UNAVAILABLE'>;

const TIMEOUT_MS = 8_000;
const PER_PAGE = 15;
const MAX_BODY = 2 * 1024 * 1024;
const HEX = /^#?[0-9a-f]{6}$/iu;
const UTM = 'utm_source=charta&utm_medium=referral';

const httpsOn = (value: string, hosts: readonly string[]): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      hosts.includes(url.hostname)
    );
  } catch {
    return false; // not a URL: the photo is dropped
  }
};
const hex = (value: string): string => `#${value.replace('#', '').toUpperCase()}`;
const tagged = (link: string): string => `${link}${link.includes('?') ? '&' : '?'}${UTM}`;

async function getJson(fetch: PhotoFetch, url: string, auth: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Authorization: auth, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`photos ${String(response.status)}`);
  const body = await response.text();
  if (body.length > MAX_BODY) throw new Error('photos answer too large');
  return JSON.parse(body);
}

const PexelsPhoto = z
  .object({
    id: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    url: z.string(),
    photographer: z.string().min(1),
    photographer_url: z.string(),
    avg_color: z.string().regex(HEX),
    alt: z.string().nullish(),
    src: z.object({ portrait: z.string(), large: z.string(), medium: z.string() }).loose(),
  })
  .loose();
const PEXELS_IMAGES = ['images.pexels.com'];
const PEXELS_PAGES = ['www.pexels.com', 'pexels.com'];

export async function searchPexels(
  deps: { readonly fetch: PhotoFetch; readonly key: string },
  search: PhotoSearch,
): Promise<Found> {
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(search.query)}` +
    `&orientation=${search.orientation === 'squarish' ? 'square' : search.orientation}` +
    `&color=${search.color.replace('#', '')}&per_page=${String(PER_PAGE)}`;
  let raw: unknown;
  try {
    raw = await getJson(deps.fetch, url, deps.key);
  } catch {
    return err('PHOTOS_UNAVAILABLE'); // refused key, quota, timeout: the studio offers the graphic composition
  }
  const answer = z.object({ photos: z.array(z.unknown()) }).safeParse(raw);
  if (!answer.success) return err('PHOTOS_UNAVAILABLE');
  return ok(
    answer.data.photos.flatMap((entry) => {
      const photo = PexelsPhoto.safeParse(entry);
      if (!photo.success) return [];
      const { data } = photo;
      const image = search.orientation === 'portrait' ? data.src.portrait : data.src.large;
      if (
        !httpsOn(image, PEXELS_IMAGES) ||
        !httpsOn(data.src.medium, PEXELS_IMAGES) ||
        !httpsOn(data.url, PEXELS_PAGES) ||
        !httpsOn(data.photographer_url, PEXELS_PAGES)
      )
        return [];
      return [
        {
          id: `pexels-${String(data.id)}`,
          provider: 'pexels' as const,
          thumbnail: data.src.medium,
          image,
          width: data.width,
          height: data.height,
          color: hex(data.avg_color),
          alt: (data.alt ?? '').slice(0, 200),
          author: data.photographer.slice(0, 80),
          authorLink: data.photographer_url,
          sourceLink: data.url,
          downloadLocation: null,
        },
      ];
    }),
  );
}

const UnsplashPhoto = z
  .object({
    id: z.string().regex(/^[\w-]+$/u),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    color: z.string().regex(HEX),
    alt_description: z.string().nullish(),
    urls: z.object({ regular: z.string(), small: z.string() }).loose(),
    links: z.object({ html: z.string(), download_location: z.string() }).loose(),
    user: z
      .object({ name: z.string().min(1), links: z.object({ html: z.string() }).loose() })
      .loose(),
  })
  .loose();
const UNSPLASH_IMAGES = ['images.unsplash.com'];
const UNSPLASH_PAGES = ['unsplash.com'];

// The 11 colour names Unsplash accepts (https://unsplash.com/documentation#search-photos), each with the hue
// it stands for; the brand's primary is sent as the nearest in OKLab.
const UNSPLASH_COLORS: readonly (readonly [string, string])[] = [
  ['black', '#111111'],
  ['white', '#F5F5F5'],
  ['yellow', '#F2C230'],
  ['orange', '#E8874A'],
  ['red', '#D33A2C'],
  ['purple', '#7B3FA0'],
  ['magenta', '#C2308A'],
  ['green', '#3C9A4A'],
  ['teal', '#2A9D8F'],
  ['blue', '#2F5BD8'],
];

export function nearestUnsplashColor(color: string): string {
  let best = 'black';
  let distance = Number.POSITIVE_INFINITY;
  for (const [name, swatch] of UNSPLASH_COLORS) {
    const gap = deltaEOk(hex(color), swatch);
    if (gap < distance) {
      distance = gap;
      best = name;
    }
  }
  return best;
}

export async function searchUnsplash(
  deps: { readonly fetch: PhotoFetch; readonly key: string },
  search: PhotoSearch,
): Promise<Found> {
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(search.query)}` +
    `&orientation=${search.orientation}&color=${nearestUnsplashColor(search.color)}` +
    `&per_page=${String(PER_PAGE)}&content_filter=high`;
  let raw: unknown;
  try {
    raw = await getJson(deps.fetch, url, `Client-ID ${deps.key}`);
  } catch {
    return err('PHOTOS_UNAVAILABLE'); // refused key, 50 an hour in demo mode, timeout
  }
  const answer = z.object({ results: z.array(z.unknown()) }).safeParse(raw);
  if (!answer.success) return err('PHOTOS_UNAVAILABLE');
  return ok(
    answer.data.results.flatMap((entry) => {
      const photo = UnsplashPhoto.safeParse(entry);
      if (!photo.success) return [];
      const { data } = photo;
      if (
        !httpsOn(data.urls.regular, UNSPLASH_IMAGES) ||
        !httpsOn(data.urls.small, UNSPLASH_IMAGES) ||
        !httpsOn(data.links.html, UNSPLASH_PAGES) ||
        !httpsOn(data.user.links.html, UNSPLASH_PAGES) ||
        !httpsOn(data.links.download_location, ['api.unsplash.com'])
      )
        return [];
      return [
        {
          id: `unsplash-${data.id}`,
          provider: 'unsplash' as const,
          thumbnail: data.urls.small,
          image: data.urls.regular,
          width: data.width,
          height: data.height,
          color: hex(data.color),
          alt: (data.alt_description ?? '').slice(0, 200),
          author: data.user.name.slice(0, 80),
          authorLink: tagged(data.user.links.html),
          sourceLink: tagged(data.links.html),
          downloadLocation: data.links.download_location,
        },
      ];
    }),
  );
}

const SHOWN = 6;

/** The six photos whose colour is closest to the brand's, first seen first kept. */
export function rankPhotos(photos: readonly Photo[], primary: string): readonly Photo[] {
  const seen = new Set<string>();
  const unique = photos.filter((photo) => !seen.has(photo.id) && seen.add(photo.id));
  return unique
    .map((photo, order) => ({ photo, order, gap: deltaEOk(photo.color, hex(primary)) }))
    .sort((first, second) => first.gap - second.gap || first.order - second.order)
    .slice(0, SHOWN)
    .map(({ photo }) => photo);
}

// What the sector photographs (English: the vocabulary of the providers). The person's own word comes first:
// Charta never guesses the signature dish.
const SUBJECTS: Readonly<Record<SceneCategory, readonly string[]>> = {
  hospitality: ['plated dish top view', 'food overhead table', 'dish close up'],
  packaging: ['product packaging flat lay', 'product still life', 'kraft box'],
  apparel: ['folded clothing flat lay', 'fashion editorial', 'fabric texture'],
  signage: ['storefront street', 'shop window', 'city street'],
  stationery: ['desk flat lay', 'paper texture', 'workspace top view'],
  digital: ['abstract gradient', 'workspace laptop', 'geometric shapes'],
  generic: ['texture background', 'still life', 'workspace top view'],
};

export function photoQueries(category: SceneCategory, word: string | null): readonly string[] {
  const own = (word ?? '').trim().slice(0, 60);
  return [...(own === '' ? [] : [own]), ...SUBJECTS[category]];
}

const Keys = z.object({
  PEXELS_API_KEY: z.string().optional(),
  UNSPLASH_ACCESS_KEY: z.string().optional(),
});

/** The free keys, server side only; an absent or empty key turns its provider off. */
export function photoKeysOf(env: Record<string, string | undefined>): {
  readonly pexels: string | null;
  readonly unsplash: string | null;
} {
  const keys = Keys.safeParse(env);
  const present = (value: string | undefined): string | null =>
    value === undefined || value.trim() === '' ? null : value.trim();
  return keys.success
    ? {
        pexels: present(keys.data.PEXELS_API_KEY),
        unsplash: present(keys.data.UNSPLASH_ACCESS_KEY),
      }
    : { pexels: null, unsplash: null };
}

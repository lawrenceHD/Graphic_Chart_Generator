import { describe, expect, it } from 'vitest';
import {
  nearestUnsplashColor,
  photoKeysOf,
  photoQueries,
  rankPhotos,
  searchPexels,
  searchUnsplash,
  type Photo,
  type PhotoFetch,
} from './providers';

const pexelsAnswer = {
  photos: [
    {
      id: 101,
      width: 3000,
      height: 4000,
      url: 'https://www.pexels.com/photo/pasta-101/',
      photographer: 'Ana Lima',
      photographer_url: 'https://www.pexels.com/@ana',
      avg_color: '#C0784E',
      alt: 'Plate of pasta',
      src: {
        portrait: 'https://images.pexels.com/photos/101/a.jpeg?h=1200',
        large: 'https://images.pexels.com/photos/101/a.jpeg?h=650',
        medium: 'https://images.pexels.com/photos/101/a.jpeg?h=350',
        tiny: 'https://images.pexels.com/photos/101/a.jpeg?h=200',
      },
    },
  ],
};
const unsplashAnswer = {
  results: [
    {
      id: 'Ab3',
      width: 4000,
      height: 6000,
      color: '#d8a07a',
      alt_description: 'bowl of soup',
      urls: {
        regular: 'https://images.unsplash.com/photo-1?w=1080',
        small: 'https://images.unsplash.com/photo-1?w=400',
      },
      links: {
        html: 'https://unsplash.com/photos/Ab3',
        download_location: 'https://api.unsplash.com/photos/Ab3/download?ixid=x',
      },
      user: { name: 'Kofi Mensah', links: { html: 'https://unsplash.com/@kofi' } },
    },
  ],
};

function fake(
  answer: unknown,
  status = 200,
): { fetch: PhotoFetch; calls: { url: string; auth: string }[] } {
  const calls: { url: string; auth: string }[] = [];
  return {
    calls,
    fetch: (url, init) => {
      calls.push({ url, auth: init.headers.Authorization ?? '' });
      return Promise.resolve(new Response(JSON.stringify(answer), { status }));
    },
  };
}

describe('photo providers (Pexels, Unsplash: free photos, credit shown, never stored)', () => {
  it('reads Pexels with the key in its header, filtered by the brand colour', async () => {
    const api = fake(pexelsAnswer);
    const found = await searchPexels(
      { fetch: api.fetch, key: 'pk' },
      { query: 'plated dish top view', orientation: 'portrait', color: '#D88F7A' },
    );
    expect(api.calls[0]?.auth).toBe('pk');
    expect(api.calls[0]?.url).toContain('query=plated%20dish%20top%20view');
    expect(api.calls[0]?.url).toContain('orientation=portrait');
    expect(api.calls[0]?.url).toContain('color=D88F7A');
    expect(found).toEqual({
      ok: true,
      value: [
        {
          id: 'pexels-101',
          provider: 'pexels',
          thumbnail: 'https://images.pexels.com/photos/101/a.jpeg?h=350',
          image: 'https://images.pexels.com/photos/101/a.jpeg?h=1200',
          width: 3000,
          height: 4000,
          color: '#C0784E',
          alt: 'Plate of pasta',
          author: 'Ana Lima',
          authorLink: 'https://www.pexels.com/@ana',
          sourceLink: 'https://www.pexels.com/photo/pasta-101/',
          downloadLocation: null,
        },
      ],
    });
  });

  it('reads Unsplash with its Client-ID, the nearest of its colour names, and credit links tagged', async () => {
    const api = fake(unsplashAnswer);
    const found = await searchUnsplash(
      { fetch: api.fetch, key: 'uk' },
      { query: 'dish close up', orientation: 'portrait', color: '#D88F7A' },
    );
    expect(api.calls[0]?.auth).toBe('Client-ID uk');
    expect(api.calls[0]?.url).toContain('color=orange');
    if (!found.ok) throw new Error('expected photos');
    expect(found.value[0]).toMatchObject({
      id: 'unsplash-Ab3',
      provider: 'unsplash',
      image: 'https://images.unsplash.com/photo-1?w=1080',
      color: '#D8A07A',
      author: 'Kofi Mensah',
      downloadLocation: 'https://api.unsplash.com/photos/Ab3/download?ixid=x',
    });
    expect(found.value[0]?.authorLink).toBe(
      'https://unsplash.com/@kofi?utm_source=charta&utm_medium=referral',
    );
  });

  it('refuses what it cannot trust: images from another host, an error answer', async () => {
    const tricked = structuredClone(pexelsAnswer);
    const [first] = tricked.photos;
    if (first === undefined) throw new Error('fixture');
    first.src.portrait = 'https://evil.example/x.jpeg';
    const found = await searchPexels(
      { fetch: fake(tricked).fetch, key: 'pk' },
      { query: 'dish', orientation: 'portrait', color: '#D88F7A' },
    );
    expect(found).toEqual({ ok: true, value: [] });
    expect(
      await searchUnsplash(
        { fetch: fake({}, 401).fetch, key: 'bad' },
        { query: 'dish', orientation: 'portrait', color: '#D88F7A' },
      ),
    ).toEqual({ ok: false, error: 'PHOTOS_UNAVAILABLE' });
  });
});

describe('choosing the photos', () => {
  const photo = (id: string, color: string): Photo => ({
    id,
    provider: 'pexels',
    thumbnail: `https://images.pexels.com/${id}`,
    image: `https://images.pexels.com/${id}`,
    width: 3,
    height: 4,
    color,
    alt: '',
    author: 'A',
    authorLink: 'https://www.pexels.com/@a',
    sourceLink: 'https://www.pexels.com/photo/a',
    downloadLocation: null,
  });

  it('keeps the six closest to the palette, without duplicates', () => {
    const ranked = rankPhotos(
      [
        photo('far', '#1030F0'),
        photo('close', '#D58C78'),
        photo('mid', '#B0705A'),
        photo('close', '#D58C78'),
        ...['a', 'b', 'c', 'd', 'e'].map((id) => photo(id, '#808080')),
      ],
      '#D88F7A',
    );
    expect(ranked).toHaveLength(6);
    expect(ranked[0]?.id).toBe('close');
    expect(ranked.map((entry) => entry.id)).not.toContain('far');
  });

  it('asks for the dishes of a restaurant, and for the word the person typed first', () => {
    expect(photoQueries('hospitality', null)[0]).toBe('plated dish top view');
    expect(photoQueries('hospitality', 'Ndolé')[0]).toBe('Ndolé');
    expect(photoQueries('digital', '   ')).not.toContain('   ');
  });

  it('names the Unsplash colour nearest to the brand', () => {
    expect(nearestUnsplashColor('#D88F7A')).toBe('orange');
    expect(nearestUnsplashColor('#1F4BFF')).toBe('blue');
    expect(nearestUnsplashColor('#111111')).toBe('black');
  });

  it('reads the keys from the environment, either one optional, an empty one absent', () => {
    expect(photoKeysOf({ PEXELS_API_KEY: 'p', UNSPLASH_ACCESS_KEY: '' })).toEqual({
      pexels: 'p',
      unsplash: null,
    });
    expect(photoKeysOf({})).toEqual({ pexels: null, unsplash: null });
  });
});

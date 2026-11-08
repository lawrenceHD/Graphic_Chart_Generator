import { describe, expect, it } from 'vitest';
import { DISALLOWED_PATHS, PUBLIC_PAGES, buildPageMetadata, parseSiteOrigin } from './seo';

const base = {
  title: 'Charta',
  description: 'Une charte.',
  path: '/tarifs',
  locale: 'fr',
  siteOrigin: 'https://charta.example/ignored',
  siteName: 'Charta',
} as const;

describe('parseSiteOrigin', () => {
  it('keeps the origin only', () => {
    expect(parseSiteOrigin('https://charta.example/a?b=1')).toBe('https://charta.example');
  });
  it('rejects a non-URL', () => {
    expect(() => parseSiteOrigin('nope')).toThrow();
  });
});

describe('buildPageMetadata', () => {
  it('emits an absolute canonical and no hreflang', () => {
    const meta = buildPageMetadata(base);
    expect(meta.alternates).toEqual({ canonical: 'https://charta.example/tarifs' });
  });
  it('sets og locale and the alternate one', () => {
    const meta = buildPageMetadata({ ...base, locale: 'en' });
    expect(meta.openGraph).toMatchObject({ locale: 'en_US', alternateLocale: ['fr_FR'] });
  });
  it('uses a summary card without image, a large one with image', () => {
    expect(buildPageMetadata(base).twitter).toMatchObject({ card: 'summary' });
    const withImage = buildPageMetadata({ ...base, image: '/og.png' });
    expect(withImage.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['https://charta.example/og.png'],
    });
  });
  it('marks non-indexable pages noindex', () => {
    expect(buildPageMetadata({ ...base, indexable: false }).robots).toEqual({
      index: false,
      follow: false,
    });
  });
});

describe('public pages', () => {
  it('lists auth screens as non-indexable and keeps the funnel out of crawls', () => {
    const noindex = PUBLIC_PAGES.filter((p) => !p.indexable).map((p) => p.path);
    expect(noindex).toEqual(['/connexion', '/inscription']);
    expect(DISALLOWED_PATHS).toContain('/api/');
  });
});

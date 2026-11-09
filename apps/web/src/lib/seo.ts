import type { Metadata } from 'next';
import { z } from 'zod';
import { LOCALES, type Locale } from '../i18n/locale';

/** Public pages, with whether search engines should index them (auth screens carry no content). */
export const PUBLIC_PAGES = [
  { path: '/', indexable: true, changeFrequency: 'weekly', priority: 1 },
  { path: '/tarifs', indexable: true, changeFrequency: 'monthly', priority: 0.6 },
  { path: '/connexion', indexable: false, changeFrequency: 'yearly', priority: 0 },
  { path: '/inscription', indexable: false, changeFrequency: 'yearly', priority: 0 },
] as const;

/** Routes crawlers must not enter: API, studio, projects, guest entry. */
export const DISALLOWED_PATHS = ['/api/', '/studio/', '/projets', '/start'] as const;

const SiteOrigin = z.url().transform((value) => new URL(value).origin);

export function parseSiteOrigin(source: unknown): string {
  return SiteOrigin.parse(source);
}

const OG_LOCALES = { fr: 'fr_FR', en: 'en_US' } satisfies Record<Locale, string>;

export type PageSeo = {
  readonly title: string;
  readonly description: string;
  /** Path starting with "/". */
  readonly path: string;
  readonly locale: Locale;
  readonly siteOrigin: string;
  readonly siteName: string;
  readonly indexable?: boolean;
  /** Absolute or site-relative URL of a 1200x630 image; omitted when none exists yet. */
  readonly image?: string;
};

/**
 * Canonical, Open Graph and Twitter metadata. The locale lives in a cookie (no URL segment), so both
 * languages share one URL: only a canonical is emitted, never hreflang pairs pointing at the same address.
 */
export function buildPageMetadata(seo: PageSeo): Metadata {
  const url = new URL(seo.path, parseSiteOrigin(seo.siteOrigin)).toString();
  const images = seo.image === undefined ? undefined : [new URL(seo.image, url).toString()];
  const other = LOCALES.filter((l) => l !== seo.locale);

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: url },
    robots:
      seo.indexable === false ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      url,
      siteName: seo.siteName,
      title: seo.title,
      description: seo.description,
      locale: OG_LOCALES[seo.locale],
      alternateLocale: other.map((l) => OG_LOCALES[l]),
      ...(images === undefined ? {} : { images }),
    },
    twitter: {
      card: images === undefined ? 'summary' : 'summary_large_image',
      title: seo.title,
      description: seo.description,
      ...(images === undefined ? {} : { images }),
    },
  };
}

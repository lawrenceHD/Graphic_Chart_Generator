import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { resolveLocale } from '../i18n/locale';
import { buildPageMetadata } from './seo';
import { getRuntimeEnv } from './runtime-env';

/** Metadata of a public page: the texts come from i18n, the origin from the validated environment. */
export async function publicMetadata(page: {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly indexable?: boolean;
  readonly image?: string;
}): Promise<Metadata> {
  return buildPageMetadata({
    ...page,
    locale: resolveLocale(await getLocale(), null),
    siteOrigin: getRuntimeEnv().APP_URL,
    siteName: 'Charta',
  });
}

import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, parseSiteOrigin } from '../lib/seo';
import { getRuntimeEnv } from '../lib/runtime-env';

// Only indexable public pages; no lastModified (no honest source for it, never fabricate dates).
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = parseSiteOrigin(getRuntimeEnv().APP_URL);
  return PUBLIC_PAGES.filter((page) => page.indexable).map((page) => ({
    url: new URL(page.path, origin).toString(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

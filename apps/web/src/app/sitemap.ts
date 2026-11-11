import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, parseSiteOrigin } from '../lib/seo';
import { getRuntimeEnv } from '../lib/runtime-env';

// Rendered per request: APP_URL is a runtime value, absent when the application is built (CI, pnpm verify).
export const dynamic = 'force-dynamic';

// Only indexable public pages; no lastModified (no honest source for it, never fabricate dates).
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = parseSiteOrigin(getRuntimeEnv().APP_URL);
  return PUBLIC_PAGES.filter((page) => page.indexable).map((page) => ({
    url: new URL(page.path, origin).toString(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

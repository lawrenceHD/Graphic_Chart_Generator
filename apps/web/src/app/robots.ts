import type { MetadataRoute } from 'next';
import { DISALLOWED_PATHS, parseSiteOrigin } from '../lib/seo';
import { getRuntimeEnv } from '../lib/runtime-env';

// Rendered per request: APP_URL is a runtime value, absent when the application is built (CI, pnpm verify).
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const origin = parseSiteOrigin(getRuntimeEnv().APP_URL);
  return {
    rules: { userAgent: '*', allow: '/', disallow: [...DISALLOWED_PATHS] },
    sitemap: new URL('/sitemap.xml', origin).toString(),
    host: origin,
  };
}

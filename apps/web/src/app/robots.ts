import type { MetadataRoute } from 'next';
import { DISALLOWED_PATHS, parseSiteOrigin } from '../lib/seo';
import { getRuntimeEnv } from '../lib/runtime-env';

export default function robots(): MetadataRoute.Robots {
  const origin = parseSiteOrigin(getRuntimeEnv().APP_URL);
  return {
    rules: { userAgent: '*', allow: '/', disallow: [...DISALLOWED_PATHS] },
    sitemap: new URL('/sitemap.xml', origin).toString(),
    host: origin,
  };
}

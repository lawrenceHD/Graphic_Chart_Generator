import { headers } from 'next/headers';
import { getRuntimeEnv } from '../lib/runtime-env';

/** `<` is escaped so that no text can close the script element (the content is static, this is defence in depth). */
function serialise(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\u003c');
}

/**
 * Structured data of the home page: the organisation and the application, nothing else. No rating, review or
 * user count: none exists. The script carries the CSP nonce set by the proxy (ADR-024).
 */
export async function HomeJsonLd({ description }: { readonly description: string }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const url = new URL('/', getRuntimeEnv().APP_URL).toString();
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Charta', url },
      {
        '@type': 'SoftwareApplication',
        name: 'Charta',
        url,
        description,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: serialise(data) }}
    />
  );
}

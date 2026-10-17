import { NextResponse, type NextRequest } from 'next/server';

export type SecurityOptions = {
  readonly r2AccountId: string;
  readonly development: boolean;
};

const STATIC_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

// docs/08_SECURITY_PRIVACY.md §3 and ADR-024.
export function buildContentSecurityPolicy(nonce: string, options: SecurityOptions): string {
  const r2Origin = `https://${options.r2AccountId}.r2.cloudflarestorage.com`;
  // React needs eval in development only, to rebuild server error stacks in the browser.
  const developmentEval = options.development ? " 'unsafe-eval'" : '';

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentEval} https://challenges.cloudflare.com`,
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: blob: ${r2Origin}`,
    "font-src 'self'",
    `connect-src 'self' ${r2Origin}`,
    'frame-src https://challenges.cloudflare.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function secureResponse(request: NextRequest, options: SecurityOptions): NextResponse {
  const nonce = btoa(crypto.randomUUID());
  const requestId = crypto.randomUUID();
  const policy = buildContentSecurityPolicy(nonce, options);

  // Next.js reads the nonce from the request CSP header while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Content-Security-Policy', policy);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of Object.entries(STATIC_HEADERS)) {
    response.headers.set(name, value);
  }
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('X-Request-Id', requestId);
  return response;
}

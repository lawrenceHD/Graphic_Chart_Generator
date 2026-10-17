import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, secureResponse } from './security-headers.js';

const options = { r2AccountId: 'acme', development: false };

function nonceOf(policy: string | null): string | undefined {
  return policy?.match(/'nonce-([^']+)'/)?.[1];
}

describe('buildContentSecurityPolicy', () => {
  it('follows the ADR-024 policy with the nonce and the R2 endpoint', () => {
    const policy = buildContentSecurityPolicy('abc123', options);

    expect(policy.split('; ')).toEqual([
      "default-src 'self'",
      "script-src 'self' 'nonce-abc123' 'strict-dynamic' https://challenges.cloudflare.com",
      "style-src-elem 'self' 'nonce-abc123'",
      "style-src-attr 'unsafe-inline'",
      "img-src 'self' data: blob: https://acme.r2.cloudflarestorage.com",
      "font-src 'self'",
      "connect-src 'self' https://acme.r2.cloudflarestorage.com",
      'frame-src https://challenges.cloudflare.com',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]);
  });

  it('never allows eval outside development', () => {
    expect(buildContentSecurityPolicy('n', options)).not.toContain('unsafe-eval');
    expect(buildContentSecurityPolicy('n', { ...options, development: true })).toContain(
      "'strict-dynamic' 'unsafe-eval'",
    );
  });
});

describe('secureResponse', () => {
  it('sets the security headers with a distinct nonce on every request', () => {
    const first = secureResponse(new NextRequest('http://localhost:3000/'), options);
    const second = secureResponse(new NextRequest('http://localhost:3000/any/route'), options);
    const firstNonce = nonceOf(first.headers.get('content-security-policy'));
    const secondNonce = nonceOf(second.headers.get('content-security-policy'));

    expect(first.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains',
    );
    expect(first.headers.get('x-content-type-options')).toBe('nosniff');
    expect(first.headers.get('x-frame-options')).toBe('DENY');
    expect(first.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(first.headers.get('permissions-policy')).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
    expect(first.headers.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(first.headers.get('x-xss-protection')).toBeNull();
    expect(first.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(firstNonce).toMatch(/^[A-Za-z0-9+/=]{16,}$/);
    expect(secondNonce).toMatch(/^[A-Za-z0-9+/=]{16,}$/);
    expect(secondNonce).not.toBe(firstNonce);
  });
});

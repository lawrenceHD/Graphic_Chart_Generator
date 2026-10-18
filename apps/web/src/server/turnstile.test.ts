import { describe, expect, it } from 'vitest';
import { createTurnstileVerifier } from './turnstile';

// The Cloudflare endpoint is replaced by a recorded-answer function: what is tested is our request and our
// reading of the answer, not Cloudflare itself.
function fakeFetch(answer: unknown, status = 200, seen: URLSearchParams[] = []): typeof fetch {
  return (_url, init) => {
    if (init?.body instanceof URLSearchParams) seen.push(init.body);
    return Promise.resolve(Response.json(answer, { status }));
  };
}

describe('Turnstile verifier', () => {
  it('posts the secret, token and IP, and accepts a successful answer', async () => {
    const seen: URLSearchParams[] = [];
    const verify = createTurnstileVerifier('site-secret', fakeFetch({ success: true }, 200, seen));
    expect(await verify('client-token', '203.0.113.7')).toBe(true);
    expect(Object.fromEntries(seen[0] ?? [])).toEqual({
      secret: 'site-secret',
      response: 'client-token',
      remoteip: '203.0.113.7',
    });
  });

  it('fails closed on refusal, malformed answer, HTTP error, network error or empty token', async () => {
    const failing: typeof fetch = () => Promise.reject(new Error('network down'));
    expect(await createTurnstileVerifier('s', fakeFetch({ success: false }))('t', null)).toBe(
      false,
    );
    expect(await createTurnstileVerifier('s', fakeFetch({ ok: 'yes' }))('t', null)).toBe(false);
    expect(await createTurnstileVerifier('s', fakeFetch({ success: true }, 500))('t', null)).toBe(
      false,
    );
    expect(await createTurnstileVerifier('s', failing)('t', null)).toBe(false);
    expect(await createTurnstileVerifier('s', fakeFetch({ success: true }))('', null)).toBe(false);
  });
});

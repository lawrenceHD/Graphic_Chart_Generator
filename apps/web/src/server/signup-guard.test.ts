import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { RateLimiter } from './rate-limiter';
import {
  isCloudflareTestSecret,
  signupVerifier,
  TURNSTILE_HEADER,
  turnstileSignup,
} from './signup-guard';
import type { TurnstileVerifier } from './turnstile';

const codeOf = async (response: Response): Promise<string> =>
  z.object({ code: z.string() }).parse(await response.json()).code;

const UPSTREAM = 'upstream reached';
const upstream = (calls: string[]) => (request: Request) => {
  calls.push(new URL(request.url).pathname);
  return Promise.resolve(new Response(UPSTREAM));
};
const limiterOf = (wait: number): RateLimiter => ({ hit: () => Promise.resolve(wait) });
const accept: TurnstileVerifier = (token) => Promise.resolve(token === 'good');

const signUp = (headers: Record<string, string> = {}, path = '/api/auth/sign-up/email') =>
  new Request(`http://localhost:3000${path}`, { method: 'POST', headers, body: '{}' });

function guard(verify: TurnstileVerifier | null, wait = 0) {
  const calls: string[] = [];
  const handler = turnstileSignup(upstream(calls), {
    verify,
    limiter: limiterOf(wait),
    trustedProxyHops: 0,
  });
  return { handler, calls };
}

describe('Turnstile on sign-up (SEC-25)', () => {
  it('lets a valid token through to Better Auth', async () => {
    const { handler, calls } = guard(accept);
    const response = await handler(signUp({ [TURNSTILE_HEADER]: 'good' }));
    expect(await response.text()).toBe(UPSTREAM);
    expect(calls).toHaveLength(1);
  });

  it('refuses a missing or wrong token with 403 and never reaches Better Auth', async () => {
    const { handler, calls } = guard(accept);
    for (const headers of [{}, { [TURNSTILE_HEADER]: 'bad' }]) {
      const response = await handler(signUp(headers));
      expect(response.status).toBe(403);
      expect(await codeOf(response)).toBe('TURNSTILE_FAILED');
    }
    expect(calls).toHaveLength(0);
  });

  it('is closed, not open, when no verifier is configured (503)', async () => {
    const { handler, calls } = guard(null);
    const response = await handler(signUp({ [TURNSTILE_HEADER]: 'good' }));
    expect(response.status).toBe(503);
    expect(await codeOf(response)).toBe('TURNSTILE_NOT_CONFIGURED');
    expect(calls).toHaveLength(0);
  });

  it('limits sign-ups per address before verifying (429 + Retry-After)', async () => {
    const { handler, calls } = guard(accept, 42);
    const response = await handler(signUp({ [TURNSTILE_HEADER]: 'good' }));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('42');
    expect(calls).toHaveLength(0);
  });

  it('leaves the other Better Auth routes alone', async () => {
    const { handler, calls } = guard(null, 99);
    for (const path of ['/api/auth/sign-in/email', '/api/auth/get-session']) {
      expect((await handler(signUp({}, path))).status).toBe(200);
    }
    expect(calls).toHaveLength(2);
  });
});

describe('signupVerifier (no silent bypass)', () => {
  const create = () => accept;
  it('is null without a secret, and for a Cloudflare dummy secret on https', () => {
    expect(signupVerifier(undefined, 'https://charta.example', create)).toBeNull();
    expect(signupVerifier('  ', 'https://charta.example', create)).toBeNull();
    expect(
      signupVerifier('1x0000000000000000000000000000000AA', 'https://charta.example', create),
    ).toBeNull();
  });

  it('accepts a real secret anywhere and the dummy secret on local http only', () => {
    expect(signupVerifier('0x4AAAAreal', 'https://charta.example', create)).toBe(accept);
    expect(
      signupVerifier('1x0000000000000000000000000000000AA', 'http://localhost:3000', create),
    ).toBe(accept);
    expect(isCloudflareTestSecret('1x0000000000000000000000000000000AA')).toBe(true);
    expect(isCloudflareTestSecret('0x4AAAAreal')).toBe(false);
  });
});

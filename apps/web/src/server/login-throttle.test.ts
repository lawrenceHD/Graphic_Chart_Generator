import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth, type Auth } from './auth';
import { createLoginThrottle, throttledSignIn } from './login-throttle';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';

describe.runIf(adminUrl !== '')('per-account sign-in limit (SEC-05)', () => {
  let test: TestDatabase;
  let auth: Auth;
  let clock = new Date('2026-10-18T10:00:00Z');
  let signIn: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    auth = createAuth(
      test.database.orm,
      { APP_URL, AUTH_SECRET: 'test-only-secret-with-enough-entropy-0123456789' },
      { checkCompromisedPasswords: false },
    );
    for (const email of ['ada@example.invalid', 'bob@example.invalid']) {
      await auth.api.signUpEmail({ body: { email, password: 'the right passphrase', name: 'x' } });
    }
    signIn = throttledSignIn(
      (request) => auth.handler(request),
      createLoginThrottle(test.database.orm, () => clock),
    );
  });
  afterAll(async () => {
    await test.dispose();
  });

  // Distinct client IPs so that Better Auth's per-IP limit never interferes with the per-account one.
  let ip = 0;
  const attempt = (email: string, password: string): Promise<Response> => {
    ip += 1;
    return signIn(
      new Request(`${APP_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: APP_URL,
          'x-forwarded-for': `198.51.100.${String(ip)}`,
        },
        body: JSON.stringify({ email, password }),
      }),
    );
  };

  it('locks an account after 5 failures, even for the right password, without touching others', async () => {
    for (let failure = 0; failure < 5; failure += 1) {
      expect((await attempt('ada@example.invalid', 'a wrong passphrase')).status).toBe(401);
    }
    const locked = await attempt('ADA@example.invalid ', 'the right passphrase');
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await attempt('bob@example.invalid', 'the right passphrase')).status).toBe(200);
  });

  it('opens again after the window, and a success resets the count', async () => {
    clock = new Date(clock.getTime() + 16 * 60 * 1000);
    expect((await attempt('ada@example.invalid', 'the right passphrase')).status).toBe(200);
    for (let failure = 0; failure < 4; failure += 1)
      await attempt('ada@example.invalid', 'a wrong passphrase');
    expect((await attempt('ada@example.invalid', 'the right passphrase')).status).toBe(200);
  });

  it('answers 429 identically for an unknown account once it is locked', async () => {
    for (let failure = 0; failure < 5; failure += 1)
      await attempt('ghost@example.invalid', 'whatever passphrase');
    const response = await attempt('ghost@example.invalid', 'whatever passphrase');
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ code: 'TOO_MANY_ATTEMPTS', status: 429 });
  });
});

import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actorFromSession, createAuth, type Auth } from './auth';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const PASSWORD = 'a long enough passphrase';

// End-to-end through the HTTP handler served at /api/auth/* (04_API_CONTRACTS.md §3, SEC-02, SEC-05, SEC-06).
describe.runIf(adminUrl !== '')('auth over HTTP: sign-up, sign-in, session, sign-out', () => {
  let test: TestDatabase;
  let auth: Auth;
  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    auth = createAuth(
      test.database.orm,
      { APP_URL, AUTH_SECRET: 'test-only-secret-with-enough-entropy-0123456789' },
      { checkCompromisedPasswords: false },
    );
  });
  afterAll(async () => {
    await test.dispose();
  });

  let client = 0;
  const call = (
    path: string,
    body: unknown,
    options: { origin?: string; cookie?: string; ip?: string } = {},
  ): Promise<Response> => {
    client += 1;
    const headers = new Headers({
      'content-type': 'application/json',
      origin: options.origin ?? APP_URL,
      'x-forwarded-for': options.ip ?? `198.51.100.${String(client)}`,
    });
    if (options.cookie !== undefined) headers.set('cookie', options.cookie);
    return auth.handler(
      new Request(`${APP_URL}/api/auth${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }),
    );
  };
  const cookieOf = (response: Response): string =>
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
  const sessionActor = async (cookie: string) =>
    actorFromSession(await auth.api.getSession({ headers: new Headers({ cookie }) }));

  it('runs the life of a session: sign-up, sign-in, sign-out revokes it, sign-in again', async () => {
    const signUp = await call('/sign-up/email', {
      email: 'ada@example.invalid',
      password: PASSWORD,
      name: 'Ada',
    });
    expect(signUp.status).toBe(200);
    expect(signUp.headers.getSetCookie()).toEqual([]);
    const signedIn = await call('/sign-in/email', {
      email: 'ada@example.invalid',
      password: PASSWORD,
    });
    const cookie = cookieOf(signedIn);
    expect(signedIn.headers.getSetCookie().join(';')).toMatch(/HttpOnly/i);
    expect(await sessionActor(cookie)).toMatchObject({ kind: 'user', emailVerified: false });

    expect((await call('/sign-out', {}, { cookie })).status).toBe(200);
    expect(await sessionActor(cookie)).toBeNull();

    const again = await call('/sign-in/email', {
      email: 'ada@example.invalid',
      password: PASSWORD,
    });
    expect(again.status).toBe(200);
    expect(await sessionActor(cookieOf(again))).not.toBeNull();
  });

  it('validates input at the boundary: malformed e-mail, short password, missing name', async () => {
    for (const body of [
      { email: 'not-an-email', password: PASSWORD, name: 'x' },
      { email: 'short@example.invalid', password: 'short-9ch', name: 'x' },
      { email: 'noname@example.invalid', password: PASSWORD },
    ]) {
      const response = await call('/sign-up/email', body);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }
  });

  it('rejects a mutation from a foreign Origin without touching the session (SEC-06)', async () => {
    const credentials = { email: 'ada@example.invalid', password: PASSWORD };
    const cookie = cookieOf(await call('/sign-in/email', credentials));
    const evil = 'https://evil.example';
    expect((await call('/sign-out', {}, { cookie, origin: evil })).status).toBe(403);
    expect((await call('/sign-in/email', credentials, { origin: evil })).status).toBe(403);
    expect(await sessionActor(cookie)).not.toBeNull();
  });

  it('limits sign-in attempts per IP: the 6th in 15 minutes answers 429 with Retry-After', async () => {
    const statuses: number[] = [];
    let last: Response | undefined;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      last = await call(
        '/sign-in/email',
        { email: 'ada@example.invalid', password: 'a wrong passphrase' },
        { ip: '203.0.113.9' },
      );
      statuses.push(last.status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    expect(Number(last?.headers.get('x-retry-after'))).toBeGreaterThan(0);
  });

  const shapeOf = async (response: Response): Promise<string[]> =>
    Object.keys(z.record(z.string(), z.unknown()).parse(await response.json())).sort();

  it('answers a sign-up on a taken e-mail like a fresh one (no account enumeration)', async () => {
    const body = { email: 'taken@example.invalid', password: PASSWORD, name: 'T' };
    const first = await call('/sign-up/email', body);
    const second = await call('/sign-up/email', body);
    expect([second.status, await shapeOf(second)]).toEqual([first.status, await shapeOf(first)]);
  });

  it('does not tell an existing account from an unknown one at sign-in', async () => {
    const wrong = { password: 'wrong wrong wrong' };
    const known = await call('/sign-in/email', { email: 'ada@example.invalid', ...wrong });
    const unknown = await call('/sign-in/email', { email: 'ghost@example.invalid', ...wrong });
    expect([unknown.status, await unknown.json()]).toEqual([known.status, await known.json()]);
  });
});

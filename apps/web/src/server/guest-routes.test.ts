import { randomBytes } from 'node:crypto';
import type { Actor } from '@app/contracts';
import { eq, projects, user } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { guestActorFromCookie } from './guest-service';
import { guestCookieOf, guestHandlers } from './guest-routes';
import { createProject } from './project-service';
import { createRateLimiter } from './rate-limiter';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const SECRET = 'test-only-secret-with-enough-entropy-0123456789';

describe.runIf(adminUrl !== '')('guest sessions (SEC-10, T-017)', () => {
  let test: TestDatabase;
  const clock = new Date('2026-10-18T10:00:00Z');
  let turnstileAnswer = true;
  let signedIn: Actor | null = null;
  let routes: ReturnType<typeof guestHandlers>;

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    routes = guestHandlers({
      orm: test.database.orm,
      appUrl: APP_URL,
      guestSecret: SECRET,
      // Turnstile's verdict is an input of these tests; its client is tested in turnstile.test.ts.
      verifyTurnstile: () => Promise.resolve(turnstileAnswer),
      now: () => clock,
      limiter: createRateLimiter(test.database.orm, () => clock),
      resolveActor: () => Promise.resolve(signedIn),
    });
  });
  afterAll(async () => {
    await test.dispose();
  });

  // A distinct client per request by default, so that the per-IP limit only bites in its own test.
  let client = 0;
  const post = (path: string, body: unknown, cookie = '', origin = APP_URL, ip = ''): Request => {
    client += 1;
    const forwarded = ip === '' ? `198.51.100.${String(client)}` : ip;
    return new Request(`${APP_URL}/api/v1${path}`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json', 'x-forwarded-for': forwarded },
      body: JSON.stringify(body),
    });
  };
  async function newGuest(): Promise<{ cookie: string; actor: Actor | null }> {
    const response = await routes.create(post('/guest-sessions', { turnstileToken: 'ok' }));
    const setCookie = response.headers.get('set-cookie') ?? '';
    const cookie = setCookie.split(';')[0] ?? '';
    const value = guestCookieOf(new Request(APP_URL, { headers: { cookie } })) ?? '';
    return { cookie, actor: await guestActorFromCookie(test.database.orm, value, SECRET, clock) };
  }

  it('creates a session behind Turnstile and Origin, with a hardened cookie', async () => {
    const response = await routes.create(post('/guest-sessions', { turnstileToken: 'ok' }));
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toMatch(
      /^atelier_guest=[\w-]+\.[\w-]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=86400$/,
    );

    turnstileAnswer = false;
    expect((await routes.create(post('/guest-sessions', { turnstileToken: 'bot' }))).status).toBe(
      403,
    );
    turnstileAnswer = true;
    expect(
      (
        await routes.create(
          post('/guest-sessions', { turnstileToken: 'ok' }, '', 'https://evil.example'),
        )
      ).status,
    ).toBe(403);
  });

  it('limits session creation to 5 per hour per IP, before any Turnstile call', async () => {
    const fromOneIp = () =>
      routes.create(post('/guest-sessions', { turnstileToken: 'ok' }, '', APP_URL, '203.0.113.50'));
    for (let created = 0; created < 5; created += 1) expect((await fromOneIp()).status).toBe(201);
    const limited = await fromOneIp();
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(3500);
    expect((await routes.create(post('/guest-sessions', { turnstileToken: 'ok' }))).status).toBe(
      201,
    );
  });

  it('resolves the guest actor from its cookie only while valid', async () => {
    const { cookie, actor } = await newGuest();
    expect(actor?.kind).toBe('guest');
    const value = cookie.split('=').slice(1).join('=');
    expect(await guestActorFromCookie(test.database.orm, `${value}x`, SECRET, clock)).toBeNull();
    expect(
      await guestActorFromCookie(
        test.database.orm,
        value,
        SECRET,
        new Date(clock.getTime() + 25 * 3_600_000),
      ),
    ).toBeNull();
  });

  it("claims the guest's project into the account's workspace and closes the session", async () => {
    const { cookie, actor } = await newGuest();
    if (actor?.kind !== 'guest') throw new Error('guest expected');
    const project = await createProject(test.database.orm, actor, {
      title: 'Draft',
      language: 'fr',
    });
    const userId = uuidV7(clock.getTime(), randomBytes(10));
    await test.database.orm
      .insert(user)
      .values({ id: userId, name: 'Ada', email: `${userId}@example.invalid` });

    signedIn = null;
    expect((await routes.claim(post('/guest-sessions/claim', {}, cookie))).status).toBe(401);
    signedIn = { kind: 'user', userId, emailVerified: false };
    const response = await routes.claim(post('/guest-sessions/claim', {}, cookie));
    expect(await response.json()).toEqual({ claimed: 1 });
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0/);

    const [row] = await test.database.orm
      .select()
      .from(projects)
      .where(eq(projects.id, project.id));
    expect([row?.guestSessionId, typeof row?.workspaceId]).toEqual([null, 'string']);
    const value = cookie.split('=').slice(1).join('=');
    expect(await guestActorFromCookie(test.database.orm, value, SECRET, clock)).toBeNull();
  });
});

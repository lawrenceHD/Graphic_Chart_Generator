import { randomBytes } from 'node:crypto';
import type { Actor } from '@app/contracts';
import { eq, guestSessions, projects, user } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { expireGuestProjects, guestActorFromCookie } from './guest-service';
import { guestCookieOf, guestHandlers } from './guest-routes';
import { createProject } from './project-service';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const SECRET = 'test-only-secret-with-enough-entropy-0123456789';

describe.runIf(adminUrl !== '')('guest sessions (SEC-10, T-017)', () => {
  let test: TestDatabase;
  let clock = new Date('2026-10-18T10:00:00Z');
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
      resolveActor: () => Promise.resolve(signedIn),
    });
  });
  afterAll(async () => {
    await test.dispose();
  });

  const post = (path: string, body: unknown, cookie = '', origin = APP_URL): Request =>
    new Request(`${APP_URL}/api/v1${path}`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
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

  it('logically deletes the projects of expired, unclaimed sessions', async () => {
    const { actor } = await newGuest();
    if (actor?.kind !== 'guest') throw new Error('guest expected');
    const project = await createProject(test.database.orm, actor, {
      title: 'Forgotten',
      language: 'fr',
    });
    clock = new Date(clock.getTime() + 25 * 3_600_000);

    expect(await expireGuestProjects(test.database.orm, clock)).toBeGreaterThanOrEqual(1);
    const [row] = await test.database.orm
      .select()
      .from(projects)
      .where(eq(projects.id, project.id));
    expect(row?.deletedAt).toEqual(clock);
    const [session] = await test.database.orm
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.id, actor.guestSessionId));
    expect(session?.claimedByUserId).toBeNull();
  });
});

import { randomBytes } from 'node:crypto';
import type { Actor } from '@app/contracts';
import { documents, eq, guestSessions, projects, revisions, user } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { claimGuestSession, guestActorFromCookie } from './guest-service';
import { guestCookieOf, guestHandlers } from './guest-routes';
import { projectResource } from './project-access';
import { createProject, listProjects } from './project-service';
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
      trustedProxyHops: 1,
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

  it('cannot dodge the 5/h limit by forging X-Forwarded-For behind one proxy', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await routes.create(
        post(
          '/guest-sessions',
          { turnstileToken: 'ok' },
          '',
          APP_URL,
          `192.0.2.${String(attempt + 1)}, 203.0.113.60`,
        ),
      );
      statuses.push(response.status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it('shares one bucket when no proxy is trusted: the header is ignored', async () => {
    const untrusting = guestHandlers({
      orm: test.database.orm,
      appUrl: APP_URL,
      guestSecret: SECRET,
      verifyTurnstile: () => Promise.resolve(true),
      now: () => clock,
      limiter: createRateLimiter(test.database.orm, () => clock),
      resolveActor: () => Promise.resolve(null),
    });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1)
      statuses.push(
        (await untrusting.create(post('/guest-sessions', { turnstileToken: 'ok' }))).status,
      );
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
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
  it('keeps the document and history of the claimed project, readable by the new owner only (AC-01.3)', async () => {
    const orm = test.database.orm;
    const { cookie, actor } = await newGuest();
    if (actor?.kind !== 'guest') throw new Error('guest expected');
    const project = await createProject(orm, actor, { title: 'Precious', language: 'fr' });
    const body = { brand: { name: 'Precious' } };
    await orm.insert(documents).values({ projectId: project.id, schemaVersion: 1, body, seq: 1 });
    await orm.insert(revisions).values({
      id: uuidV7(clock.getTime(), randomBytes(10)),
      projectId: project.id,
      seq: 1,
      actor: 'user',
      command: { type: 'SetBrandField' },
      inverse: { type: 'SetBrandField' },
    });
    const owner = uuidV7(clock.getTime(), randomBytes(10));
    const stranger = uuidV7(clock.getTime(), randomBytes(10));
    for (const userId of [owner, stranger])
      await orm.insert(user).values({ id: userId, name: 'x', email: `${userId}@example.invalid` });

    signedIn = { kind: 'user', userId: owner, emailVerified: true };
    expect(await (await routes.claim(post('/guest-sessions/claim', {}, cookie))).json()).toEqual({
      claimed: 1,
    });
    const [doc] = await orm.select().from(documents).where(eq(documents.projectId, project.id));
    expect([doc?.body, doc?.seq]).toEqual([body, 1]);
    expect(
      await orm.select().from(revisions).where(eq(revisions.projectId, project.id)),
    ).toHaveLength(1);
    const asOwner = await projectResource(orm, project.id, signedIn);
    const asStranger = await projectResource(orm, project.id, {
      kind: 'user',
      userId: stranger,
      emailVerified: true,
    });
    expect(
      [asOwner, asStranger].map((resource) =>
        resource.kind === 'project' ? resource.memberRole : undefined,
      ),
    ).toEqual(['owner', undefined]);

    // A closed session cannot be claimed twice, not even by another account holding the cookie.
    signedIn = { kind: 'user', userId: stranger, emailVerified: true };
    expect(await (await routes.claim(post('/guest-sessions/claim', {}, cookie))).json()).toEqual({
      claimed: 0,
    });
  });

  it('refuses to claim past the free plan, leaves the guest project intact and claimable later', async () => {
    const orm = test.database.orm;
    const { cookie, actor } = await newGuest();
    if (actor?.kind !== 'guest') throw new Error('guest expected');
    const userId = uuidV7(clock.getTime(), randomBytes(10));
    await orm.insert(user).values({ id: userId, name: 'x', email: `${userId}@example.invalid` });
    const owned = [];
    for (const title of ['A', 'B', 'C'])
      owned.push(await createProject(orm, { kind: 'user', userId }, { title, language: 'fr' }));
    const draft = await createProject(orm, actor, { title: 'Guest draft', language: 'fr' });
    signedIn = { kind: 'user', userId, emailVerified: false };

    const refused = await routes.claim(post('/guest-sessions/claim', {}, cookie));
    expect([refused.status, await refused.json()]).toEqual([
      403,
      expect.objectContaining({ code: 'QUOTA_PROJECTS' }),
    ]);
    expect(refused.headers.get('set-cookie')).toBeNull();
    const [untouched] = await orm.select().from(projects).where(eq(projects.id, draft.id));
    expect([untouched?.guestSessionId, untouched?.workspaceId]).toEqual([
      actor.guestSessionId,
      null,
    ]);

    const first = owned[0];
    if (!first) throw new Error('project expected');
    await orm.update(projects).set({ deletedAt: clock }).where(eq(projects.id, first.id));
    expect(await (await routes.claim(post('/guest-sessions/claim', {}, cookie))).json()).toEqual({
      claimed: 1,
    });
    const kept = await listProjects(orm, signedIn, { limit: 50 });
    expect(kept.items.map((item) => item.title).sort()).toEqual(['B', 'C', 'Guest draft']);
  });

  it('lets two accounts race for one guest session: exactly one wins, the project is not split', async () => {
    const orm = test.database.orm;
    const { actor } = await newGuest();
    if (actor?.kind !== 'guest') throw new Error('guest expected');
    const draft = await createProject(orm, actor, { title: 'Contested', language: 'fr' });
    const users = [
      uuidV7(clock.getTime(), randomBytes(10)),
      uuidV7(clock.getTime(), randomBytes(10)),
    ];
    for (const userId of users)
      await orm.insert(user).values({ id: userId, name: 'x', email: `${userId}@example.invalid` });
    const outcomes = await Promise.all(
      users.map((userId) => claimGuestSession(orm, actor.guestSessionId, userId)),
    );
    expect(outcomes.map((outcome) => outcome.claimed).sort()).toEqual([0, 1]);
    const winner = users[outcomes.findIndex((outcome) => outcome.claimed === 1)] ?? '';
    const mine = await listProjects(
      orm,
      { kind: 'user', userId: winner, emailVerified: false },
      { limit: 50 },
    );
    expect(mine.items.map((item) => item.id)).toEqual([draft.id]);
    const [closed] = await orm
      .select({ claimedBy: guestSessions.claimedByUserId })
      .from(guestSessions)
      .where(eq(guestSessions.id, actor.guestSessionId));
    expect(closed?.claimedBy).toBe(winner);
  });

  it('claims nothing without a valid guest cookie, and refuses a foreign Origin', async () => {
    signedIn = {
      kind: 'user',
      userId: uuidV7(clock.getTime(), randomBytes(10)),
      emailVerified: false,
    };
    expect(await (await routes.claim(post('/guest-sessions/claim', {}))).json()).toEqual({
      claimed: 0,
    });
    const forged = await routes.claim(
      post('/guest-sessions/claim', {}, 'atelier_guest=forged.value'),
    );
    expect(await forged.json()).toEqual({ claimed: 0 });
    const foreign = await routes.claim(
      post('/guest-sessions/claim', {}, '', 'https://evil.example'),
    );
    expect(foreign.status).toBe(403);
  });
});

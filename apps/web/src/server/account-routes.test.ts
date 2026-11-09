import { randomBytes } from 'node:crypto';
import type { Actor, ObjectStorage } from '@app/contracts';
import {
  account,
  assets,
  chatMessages,
  documents,
  eq,
  exports,
  guestSessions,
  projectEvents,
  projects,
  revisions,
  session,
  shareLinks,
  usageEvents,
  user,
  workspaceMembers,
  workspaces,
} from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { ok, uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../lib/password';
import { accountHandlers } from './account-routes';
import { createRateLimiter } from './rate-limiter';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const PASSWORD = 'a long enough passphrase';
const id = (): string => uuidV7(Date.now(), randomBytes(10));

describe.runIf(adminUrl !== '')('DELETE /account (AC-13.3, 08_SECURITY_PRIVACY.md §5)', () => {
  let test: TestDatabase;
  let routes: ReturnType<typeof accountHandlers>;
  let storageDown = false;
  const deletedKeys: string[] = [];
  const failures: unknown[] = [];
  const actors: Record<string, Actor> = {};
  const keys: Record<string, string[]> = {};
  let guestOfAlice = '';

  const storage: ObjectStorage = {
    presignPut: () => Promise.reject(new Error('unused')),
    presignGet: () => Promise.reject(new Error('unused')),
    head: () => Promise.resolve(null),
    get: () => Promise.resolve(ok(new Uint8Array(0))),
    put: () => Promise.resolve(),
    delete: (key) => {
      if (storageDown) return Promise.reject(new Error('r2 unreachable'));
      deletedKeys.push(key);
      return Promise.resolve();
    },
  };

  async function seedUser(name: string): Promise<void> {
    const { orm } = test.database;
    const userId = id();
    await orm.insert(user).values({ id: userId, name, email: `${name}@example.invalid` });
    await orm.insert(account).values({
      id: id(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: await hashPassword(PASSWORD),
    });
    await orm
      .insert(session)
      .values({ id: id(), token: id(), userId, expiresAt: new Date(Date.now() + 3_600_000) });
    const workspaceId = id();
    await orm
      .insert(workspaces)
      .values({ id: workspaceId, name: 'Personnel', ownerUserId: userId });
    await orm.insert(workspaceMembers).values({ workspaceId, userId, role: 'owner' });
    const projectId = id();
    await orm.insert(projects).values({ id: projectId, workspaceId, title: `${name} brand` });
    await orm
      .insert(documents)
      .values({ projectId, schemaVersion: 1, body: { brand: name }, seq: 1 });
    await orm.insert(revisions).values({
      id: id(),
      projectId,
      seq: 1,
      actor: 'user',
      command: { type: 'X' },
      inverse: { type: 'X' },
    });
    const assetId = id();
    const key = `projects/${projectId}/logo-${name}`;
    keys[name] = [key];
    await orm
      .insert(assets)
      .values({ id: assetId, projectId, kind: 'logo_original', storageKey: key });
    await orm.insert(exports).values({ id: id(), projectId, kind: 'pdf', assetId });
    await orm
      .insert(chatMessages)
      .values({ id: id(), projectId, role: 'user', content: 'private brief text' });
    await orm.insert(shareLinks).values({
      id: id(),
      projectId,
      tokenHash: id(),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    await orm.insert(projectEvents).values({ projectId, type: 'asset.status', data: {} });
    await orm
      .insert(usageEvents)
      .values({ id: id(), userId, kind: 'analysis', tokensIn: 10, tokensOut: 5 });
    actors[name] = { kind: 'user', userId, emailVerified: true };
  }

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    const { orm } = test.database;
    for (const name of ['alice', 'bob', 'carol']) await seedUser(name);
    guestOfAlice = id();
    await orm.insert(guestSessions).values({
      id: guestOfAlice,
      tokenHash: guestOfAlice,
      expiresAt: new Date(),
      claimedByUserId: actors.alice?.kind === 'user' ? actors.alice.userId : null,
    });
    actors.guest = { kind: 'guest', guestSessionId: id() };
    routes = accountHandlers({
      orm,
      appUrl: APP_URL,
      resolveActor: (request) =>
        Promise.resolve(actors[request.headers.get('x-test-actor') ?? ''] ?? null),
      storage,
      limiter: createRateLimiter(orm, () => new Date()),
      onError: (error) => failures.push(error),
    });
  });
  afterAll(async () => {
    await test.dispose();
  });

  const remove = (actor: string, body: unknown = { password: PASSWORD }, origin = APP_URL) =>
    routes.remove(
      new Request(`${APP_URL}/api/v1/account`, {
        method: 'DELETE',
        headers: { 'x-test-actor': actor, origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  const userId = (name: string): string => {
    const actor = actors[name];
    return actor?.kind === 'user' ? actor.userId : '';
  };
  const count = async (table: typeof user | typeof session | typeof projects, name: string) => {
    const { orm } = test.database;
    if (table === user)
      return (
        await orm
          .select()
          .from(user)
          .where(eq(user.id, userId(name)))
      ).length;
    if (table === session)
      return (
        await orm
          .select()
          .from(session)
          .where(eq(session.userId, userId(name)))
      ).length;
    return (await orm.select().from(projects)).filter((row) => row.title === `${name} brand`)
      .length;
  };

  it('refuses without a session (401), from a guest (403), from a foreign Origin (403)', async () => {
    expect((await remove('nobody')).status).toBe(401);
    expect((await remove('guest')).status).toBe(403);
    expect((await remove('carol', { password: PASSWORD }, 'https://evil.example')).status).toBe(
      403,
    );
    expect(await count(user, 'carol')).toBe(1);
  });

  it('validates the confirmation: missing, extra field (no target user can be named)', async () => {
    expect((await remove('carol', {})).status).toBe(400);
    expect((await remove('carol', { password: PASSWORD, userId: userId('bob') })).status).toBe(400);
    expect(await count(user, 'bob')).toBe(1);
  });

  it('refuses a wrong password and deletes nothing; the 4th attempt of the hour is limited', async () => {
    const wrong = await remove('carol', { password: 'not the password!' });
    expect(wrong.status).toBe(403);
    expect(await wrong.json()).toMatchObject({ code: 'CONFIRMATION_FAILED' });
    expect(await count(user, 'carol')).toBe(1);
    expect(await count(projects, 'carol')).toBe(1);
    await remove('carol', { password: 'not the password!' });
    await remove('carol', { password: 'not the password!' });
    expect((await remove('carol', { password: PASSWORD })).status).toBe(429);
    expect(await count(user, 'carol')).toBe(1);
  });

  it('keeps every row when the storage fails, then finishes on retry (no orphans)', async () => {
    storageDown = true;
    const down = await remove('alice');
    expect(down.status).toBe(503);
    expect(JSON.stringify(await down.json())).not.toMatch(/r2 unreachable|alice/);
    expect(failures).toHaveLength(1);
    expect(await count(user, 'alice')).toBe(1);
    expect(await count(projects, 'alice')).toBe(1);
    storageDown = false;
    expect((await remove('alice')).status).toBe(204);
  });

  it("erases the caller's data, files, sessions and identity, and nothing of anyone else", async () => {
    const { orm } = test.database;
    expect(deletedKeys).toEqual(keys.alice);
    expect(await count(user, 'alice')).toBe(0);
    expect(await count(session, 'alice')).toBe(0);
    expect(await count(projects, 'alice')).toBe(0);
    for (const table of [
      documents,
      revisions,
      assets,
      exports,
      chatMessages,
      shareLinks,
      projectEvents,
    ]) {
      expect(await orm.select().from(table)).toHaveLength(2); // bob and carol only
    }
    expect(await orm.select().from(workspaces)).toHaveLength(2);
    expect(await orm.select().from(account)).toHaveLength(2);
    // Cost accounting survives without identifying anyone; the claimed guest session is released.
    const usage = await orm.select().from(usageEvents);
    expect(usage).toHaveLength(3);
    expect(usage.filter((row) => row.userId === null)).toHaveLength(1);
    const [guest] = await orm
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.id, guestOfAlice));
    expect(guest?.claimedByUserId).toBeNull();
    expect(await count(user, 'bob')).toBe(1);
    expect(await count(projects, 'bob')).toBe(1);
  });

  it('is idempotent: once the account is gone, repeating the call is a 204 that touches nothing', async () => {
    const before = deletedKeys.length;
    expect((await remove('alice')).status).toBe(204);
    expect(deletedKeys).toHaveLength(before);
    expect(await count(user, 'bob')).toBe(1);
  });
});

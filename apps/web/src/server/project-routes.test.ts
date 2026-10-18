import { randomBytes } from 'node:crypto';
import type { Actor } from '@app/contracts';
import { guestSessions, user, workspaceMembers, workspaces } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { projectHandlers } from './project-routes';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const id = (): string => uuidV7(Date.now(), randomBytes(10));

describe.runIf(adminUrl !== '')('project routes (04_API_CONTRACTS.md §3, 10_QUALITY.md §7)', () => {
  let test: TestDatabase;
  let routes: ReturnType<typeof projectHandlers>;
  const actors: Record<string, Actor> = {};

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    const { orm } = test.database;
    for (const name of ['alice', 'bob']) {
      const userId = id();
      await orm.insert(user).values({ id: userId, name, email: `${userId}@example.invalid` });
      actors[name] = { kind: 'user', userId, emailVerified: true };
    }
    const guestId = id();
    await orm
      .insert(guestSessions)
      .values({ id: guestId, tokenHash: guestId, expiresAt: new Date() });
    actors.guest = { kind: 'guest', guestSessionId: guestId };
    routes = projectHandlers({
      orm,
      appUrl: APP_URL,
      resolveActor: (request) =>
        Promise.resolve(actors[request.headers.get('x-test-actor') ?? ''] ?? null),
    });
  });
  afterAll(async () => {
    await test.dispose();
  });

  const request = (method: string, path: string, actor: string, body?: unknown): Request =>
    new Request(`${APP_URL}/api/v1${path}`, {
      method,
      headers: { 'x-test-actor': actor, origin: APP_URL, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const params = (projectId: string) => ({ params: Promise.resolve({ id: projectId }) });
  async function create(actor: string, title: string): Promise<{ status: number; id: string }> {
    const response = await routes.create(request('POST', '/projects', actor, { title }));
    const json: unknown = await response.json();
    const project: unknown =
      typeof json === 'object' && json !== null ? Reflect.get(json, 'project') : null;
    const projectId: unknown =
      typeof project === 'object' && project !== null ? Reflect.get(project, 'id') : '';
    return { status: response.status, id: String(projectId) };
  }
  async function titles(actor: string, query = ''): Promise<string[]> {
    const json: unknown = await (
      await routes.list(request('GET', `/projects${query}`, actor))
    ).json();
    const items: unknown =
      typeof json === 'object' && json !== null ? Reflect.get(json, 'items') : [];
    return Array.isArray(items)
      ? items.map((item: unknown) => String(Reflect.get(Object(item), 'title')))
      : [];
  }

  it('creates projects in a personal workspace made once, with normalised titles', async () => {
    expect((await create('alice', '  Café ')).status).toBe(201);
    expect((await create('alice', 'Second')).status).toBe(201);
    expect(await titles('alice')).toEqual(['Second', 'Café']);
    const userId = actors.alice?.kind === 'user' ? actors.alice.userId : '';
    expect(await test.database.orm.select().from(workspaces)).toHaveLength(1);
    expect(await test.database.orm.select().from(workspaceMembers)).toEqual([
      expect.objectContaining({ userId, role: 'owner' }),
    ]);
    expect((await create('alice', '<script>x</script>')).status).toBe(400);
    expect((await create('nobody', 'x')).status).toBe(401);
  });

  it('lets a guest create one project only', async () => {
    expect((await create('guest', 'Guest brand')).status).toBe(201);
    expect((await create('guest', 'Another')).status).toBe(403);
    expect(await titles('guest')).toEqual(['Guest brand']);
  });

  it('lists only visible projects, searches safely and paginates by cursor', async () => {
    expect(await titles('bob')).toEqual([]);
    expect(await titles('alice', '?q=caf')).toEqual(['Café']);
    expect(await titles('alice', '?q=%25')).toEqual([]);
    const first: unknown = await (
      await routes.list(request('GET', '/projects?limit=1', 'alice'))
    ).json();
    const cursor: unknown =
      typeof first === 'object' && first !== null ? Reflect.get(first, 'nextCursor') : null;
    expect(await titles('alice', `?limit=1&cursor=${String(cursor)}`)).toEqual(['Café']);
    expect((await routes.list(request('GET', '/projects?limit=99', 'alice'))).status).toBe(400);
  });

  it('reads, updates and deletes for the owner; 404 for others', async () => {
    const { id: projectId } = await create('alice', 'Lifecycle');
    const read = await routes.read(
      request('GET', `/projects/${projectId}`, 'alice'),
      params(projectId),
    );
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ project: { title: 'Lifecycle' }, document: null });
    expect(
      (await routes.read(request('GET', `/projects/${projectId}`, 'bob'), params(projectId)))
        .status,
    ).toBe(404);
    expect(
      (
        await routes.update(
          request('PATCH', `/projects/${projectId}`, 'bob', { title: 'X' }),
          params(projectId),
        )
      ).status,
    ).toBe(404);

    const updated = await routes.update(
      request('PATCH', `/projects/${projectId}`, 'alice', { title: 'Renamed' }),
      params(projectId),
    );
    expect(await updated.json()).toMatchObject({ project: { title: 'Renamed' } });
    expect(
      (
        await routes.update(
          request('PATCH', `/projects/${projectId}`, 'alice', {}),
          params(projectId),
        )
      ).status,
    ).toBe(400);

    expect(
      (await routes.remove(request('DELETE', `/projects/${projectId}`, 'alice'), params(projectId)))
        .status,
    ).toBe(204);
    expect(
      (await routes.read(request('GET', `/projects/${projectId}`, 'alice'), params(projectId)))
        .status,
    ).toBe(404);
    expect(await titles('alice')).not.toContain('Renamed');
  });

  it('returns an empty history for a project without revisions, and 404 to strangers', async () => {
    const { id: projectId } = await create('alice', 'History');
    const history = await routes.revisions(
      request('GET', `/projects/${projectId}/revisions`, 'alice'),
      params(projectId),
    );
    expect(await history.json()).toEqual({ items: [], nextCursor: null });
    expect(
      (
        await routes.revisions(
          request('GET', `/projects/${projectId}/revisions`, 'bob'),
          params(projectId),
        )
      ).status,
    ).toBe(404);
  });
});

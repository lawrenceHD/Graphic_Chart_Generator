import { randomBytes } from 'node:crypto';
import type { Actor, JobName, JobPayload, JobQueue, ObjectStorage } from '@app/contracts';
import { assets, eq, guestSessions, projects } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { ok, uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assetHandlers, type AssetRouteDeps } from './asset-routes';
import { createRateLimiter } from './rate-limiter';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const id = (): string => uuidV7(Date.now(), randomBytes(10));

/** In-memory stand-in for R2: the routes' logic stays real, only the remote store is replaced. */
function memoryStorage(objects: Map<string, number>): ObjectStorage {
  return {
    presignPut: (key, contentLength) =>
      Promise.resolve({
        url: `https://r2.test/${key}?signed`,
        method: 'PUT',
        headers: { 'content-length': String(contentLength) },
        expiresAt: new Date('2026-10-18T10:05:00Z'),
      }),
    presignGet: (key, response) =>
      Promise.resolve(
        `https://r2.test/${key}?type=${response.contentType}&disposition=${response.disposition}`,
      ),
    head: (key) => {
      const bytes = objects.get(key);
      return Promise.resolve(bytes === undefined ? null : { bytes });
    },
    get: () => Promise.resolve(ok(new Uint8Array(0))),
    put: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  };
}

describe.runIf(adminUrl !== '')(
  'asset routes (04_API_CONTRACTS.md §3 and §6, SEC-11, SEC-16)',
  () => {
    let test: TestDatabase;
    let routes: ReturnType<typeof assetHandlers>;
    let deps: AssetRouteDeps;
    const objects = new Map<string, number>();
    const sent: { name: JobName; payload: JobPayload<JobName>; key: string }[] = [];
    const actors: Record<string, Actor> = {};
    let projectId = '';

    beforeAll(async () => {
      test = await createTestDatabase(adminUrl);
      const { orm } = test.database;
      for (const name of ['owner', 'stranger']) {
        const guestId = id();
        await orm
          .insert(guestSessions)
          .values({ id: guestId, tokenHash: guestId, expiresAt: new Date() });
        actors[name] = { kind: 'guest', guestSessionId: guestId };
      }
      projectId = id();
      const owner = actors.owner?.kind === 'guest' ? actors.owner.guestSessionId : '';
      await orm.insert(projects).values({ id: projectId, guestSessionId: owner, title: 'Logo' });
      const queue: JobQueue = {
        send: (name, payload, key) => {
          sent.push({ name, payload, key });
          return Promise.resolve();
        },
      };
      deps = {
        orm,
        appUrl: APP_URL,
        resolveActor: (request) =>
          Promise.resolve(actors[request.headers.get('x-test-actor') ?? ''] ?? null),
        storage: memoryStorage(objects),
        queue,
        limiter: createRateLimiter(orm, () => new Date()),
      };
      routes = assetHandlers(deps);
    });
    afterAll(async () => {
      await test.dispose();
    });

    const request = (method: string, actor: string, body?: unknown): Request =>
      new Request(`${APP_URL}/api/v1/x`, {
        method,
        headers: { 'x-test-actor': actor, origin: APP_URL, 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const params = (value: string) => ({ params: Promise.resolve({ id: value }) });
    const json = async (response: Response): Promise<Record<string, unknown>> => {
      const value: unknown = await response.json();
      return typeof value === 'object' && value !== null
        ? Object.fromEntries(Object.entries(value))
        : {};
    };
    const field = (value: unknown, name: string): unknown => Reflect.get(Object(value), name);
    const declare = (actor: string, body: unknown) =>
      routes.declareUpload(request('POST', actor, body), params(projectId));
    const declareId = async (fileName: string, bytes: number): Promise<string> =>
      String(
        field(
          (await json(await declare('owner', { kind: 'logo_original', fileName, bytes }))).asset,
          'id',
        ),
      );
    const originalKey = (assetId: string): string =>
      `projects/${projectId}/assets/${assetId}/original`;

    it('declares an upload: pending asset, server-made key, presigned PUT bound to the size', async () => {
      const response = await declare('owner', {
        kind: 'logo_original',
        fileName: 'logo.svg',
        bytes: 2048,
      });
      expect(response.status).toBe(201);
      const body = await json(response);
      expect(body.asset).toMatchObject({ kind: 'logo_original', status: 'pending', bytes: 2048 });
      const assetId = String(field(body.asset, 'id'));
      const [row] = await test.database.orm.select().from(assets).where(eq(assets.id, assetId));
      expect(row?.storageKey).toBe(originalKey(assetId));
      expect(row?.meta).toEqual({ fileName: 'logo.svg' });
      expect(body.upload).toEqual({
        url: `https://r2.test/${originalKey(assetId)}?signed`,
        method: 'PUT',
        headers: { 'content-length': '2048' },
        expiresAt: '2026-10-18T10:05:00.000Z',
      });
    });

    it('refuses oversized, empty or unknown declarations, and strangers', async () => {
      const valid = { kind: 'logo_original', fileName: 'a.png', bytes: 10 };
      expect((await declare('owner', { ...valid, bytes: 10 * 1024 * 1024 + 1 })).status).toBe(400);
      expect((await declare('owner', { ...valid, bytes: 0 })).status).toBe(400);
      expect((await declare('owner', { ...valid, kind: 'export_pdf' })).status).toBe(400);
      expect((await declare('owner', { ...valid, extra: true })).status).toBe(400);
      expect((await declare('stranger', valid)).status).toBe(404);
      expect((await declare('nobody', valid)).status).toBe(401);
    });

    it('limits declarations to 15 per minute per identity (04_API_CONTRACTS.md §7)', async () => {
      // Hits of the earlier tests carry the real time: after 12:00 UTC they would count in the fixed window below.
      await test.database.pool.query('DELETE FROM rate_limit');
      const limiter = createRateLimiter(test.database.orm, () => new Date('2026-10-18T12:00:00Z'));
      const limited = assetHandlers({ ...deps, limiter });
      const body = { kind: 'logo_original', fileName: 'x.svg', bytes: 1 };
      const statuses: number[] = [];
      for (let attempt = 0; attempt < 16; attempt += 1) {
        statuses.push(
          (await limited.declareUpload(request('POST', 'owner', body), params(projectId))).status,
        );
      }
      expect(statuses.filter((status) => status === 201)).toHaveLength(15);
      expect(statuses[15]).toBe(429);
      // The fixed clock above must not leak its window into the other tests.
      await test.database.pool.query('DELETE FROM rate_limit');
    });

    it('completes only once the object exists, quarantines and enqueues the scan idempotently', async () => {
      const assetId = await declareId('b.svg', 99);
      const complete = (actor: string) => routes.complete(request('POST', actor), params(assetId));
      const missing = await complete('owner');
      expect(missing.status).toBe(409);
      expect((await json(missing)).code).toBe('UPLOAD_MISSING');
      expect(sent).toHaveLength(0);
      objects.set(originalKey(assetId), 99);
      expect((await complete('stranger')).status).toBe(404);
      const done = await complete('owner');
      expect(done.status).toBe(202);
      expect((await json(done)).asset).toMatchObject({ id: assetId, status: 'quarantined' });
      expect((await complete('owner')).status).toBe(202);
      expect(sent).toEqual([
        { name: 'asset.scan', payload: { assetId }, key: assetId },
        { name: 'asset.scan', payload: { assetId }, key: assetId },
      ]);
    });

    it('refuses an object whose size differs from the declaration', async () => {
      const assetId = await declareId('c.svg', 50);
      objects.set(originalKey(assetId), 51);
      const response = await routes.complete(request('POST', 'owner'), params(assetId));
      expect(response.status).toBe(409);
      expect((await json(response)).code).toBe('UPLOAD_SIZE_MISMATCH');
    });

    it('serves only clean derived assets, by a no-store redirect to a presigned read URL', async () => {
      const { orm } = test.database;
      const original = id();
      const sanitized = id();
      const svg = { projectId, status: 'clean' as const, mime: 'image/svg+xml' };
      await orm.insert(assets).values([
        { ...svg, id: original, kind: 'logo_original', storageKey: `o/${original}` },
        { ...svg, id: sanitized, kind: 'logo_sanitized', storageKey: `s/${sanitized}` },
      ]);
      const content = (actor: string, assetId: string) =>
        routes.content(request('GET', actor), params(assetId));
      const response = await content('owner', sanitized);
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(
        `https://r2.test/s/${sanitized}?type=image/svg+xml&disposition=inline`,
      );
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect((await content('owner', original)).status).toBe(404);
      expect((await content('stranger', sanitized)).status).toBe(404);
      await orm.update(assets).set({ status: 'quarantined' }).where(eq(assets.id, sanitized));
      expect((await content('owner', sanitized)).status).toBe(404);
      const read = await routes.read(request('GET', 'owner'), params(sanitized));
      expect((await json(read)).asset).toMatchObject({ id: sanitized, status: 'quarantined' });
      expect((await routes.read(request('GET', 'owner'), params('not-a-uuid'))).status).toBe(404);
    });
  },
);

import { randomBytes } from 'node:crypto';
import type { Actor, JobName, JobPayload, JobQueue } from '@app/contracts';
import { analysisRuns, assets, eq, guestSessions, projects } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analysisHandlers } from './analysis-routes';
import { createRateLimiter } from './rate-limiter';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const id = (): string => uuidV7(Date.now(), randomBytes(10));

describe.runIf(adminUrl !== '')(
  'POST /projects/:id/analyze (04_API_CONTRACTS.md §3, §7, §8)',
  () => {
    let test: TestDatabase;
    let routes: ReturnType<typeof analysisHandlers>;
    const sent: { name: JobName; payload: JobPayload<JobName>; key: string }[] = [];
    const actors: Record<string, Actor> = {};
    const owned: Record<string, string> = {};

    beforeAll(async () => {
      test = await createTestDatabase(adminUrl);
      const { orm } = test.database;
      for (const name of ['owner', 'stranger', 'busy']) {
        const guestId = id();
        await orm
          .insert(guestSessions)
          .values({ id: guestId, tokenHash: guestId, expiresAt: new Date() });
        actors[name] = { kind: 'guest', guestSessionId: guestId };
        const projectId = id();
        await orm.insert(projects).values({ id: projectId, guestSessionId: guestId, title: name });
        owned[name] = projectId;
      }
      const queue: JobQueue = {
        send: (name, payload, key) => {
          sent.push({ name, payload, key });
          return Promise.resolve();
        },
      };
      routes = analysisHandlers({
        orm,
        appUrl: APP_URL,
        resolveActor: (request) =>
          Promise.resolve(actors[request.headers.get('x-test-actor') ?? ''] ?? null),
        queue,
        limiter: createRateLimiter(orm, () => new Date()),
      });
    });
    afterAll(async () => {
      await test.dispose();
    });

    const analyze = (actor: string, projectId: string, key?: string): Promise<Response> =>
      routes.analyze(
        new Request(`${APP_URL}/api/v1/x`, {
          method: 'POST',
          headers: {
            'x-test-actor': actor,
            origin: APP_URL,
            ...(key === undefined ? {} : { 'idempotency-key': key }),
          },
        }),
        { params: Promise.resolve({ id: projectId }) },
      );
    const body = async (response: Response): Promise<unknown> => response.json();
    const field = (value: unknown, ...path: string[]): unknown =>
      path.reduce<unknown>((at, name) => Reflect.get(Object(at), name), value);
    async function cleanLogo(projectId: string, status: 'clean' | 'quarantined' = 'clean') {
      const assetId = id();
      await test.database.orm.insert(assets).values({
        id: assetId,
        projectId,
        kind: 'logo_sanitized',
        status,
        storageKey: `projects/${projectId}/assets/${assetId}/sanitized`,
        mime: 'image/svg+xml',
      });
      return assetId;
    }

    it('refuses a project whose logo is not scanned clean yet', async () => {
      const projectId = owned.owner ?? '';
      await cleanLogo(projectId, 'quarantined');
      const response = await analyze('owner', projectId, 'key-not-ready');
      expect(response.status).toBe(409);
      expect(field(await body(response), 'code')).toBe('LOGO_NOT_READY');
      expect(sent).toHaveLength(0);
    });

    it('requires a well-formed Idempotency-Key', async () => {
      for (const key of [undefined, '', 'x'.repeat(256), 'clé avec espaces']) {
        const response = await analyze('owner', owned.owner ?? '', key);
        expect(response.status).toBe(400);
        expect(field(await body(response), 'code')).toBe('IDEMPOTENCY_KEY_INVALID');
      }
    });

    it('starts a run on the latest clean logo and enqueues its job once', async () => {
      const projectId = owned.owner ?? '';
      await cleanLogo(projectId);
      const latest = await cleanLogo(projectId);
      const response = await analyze('owner', projectId, 'key-1');

      expect(response.status).toBe(202);
      const analysisId = String(field(await body(response), 'analysis', 'id'));
      expect(await body(await analyze('owner', projectId, 'key-1'))).toMatchObject({
        analysis: { id: analysisId, status: 'pending', step: 0 },
      });
      const runs = await test.database.orm
        .select()
        .from(analysisRuns)
        .where(eq(analysisRuns.projectId, projectId));
      expect(runs).toHaveLength(1);
      expect(runs[0]?.logoAssetId).toBe(latest);
      expect(sent).toEqual([
        { name: 'project.analyze', payload: { analysisId }, key: analysisId },
        { name: 'project.analyze', payload: { analysisId }, key: analysisId },
      ]);
    });

    it('answers the same key with the same run, a new key with a new run', async () => {
      const projectId = owned.owner ?? '';
      const first = field(await body(await analyze('owner', projectId, 'key-1')), 'analysis', 'id');
      const second = field(
        await body(await analyze('owner', projectId, 'key-2')),
        'analysis',
        'id',
      );
      expect(second).not.toBe(first);
    });

    it('hides the project from strangers, refuses anonymous, share links and foreign origins', async () => {
      const projectId = owned.owner ?? '';
      actors.share = { kind: 'share', projectId };
      expect((await analyze('stranger', projectId, 'key-3')).status).toBe(404);
      expect((await analyze('nobody', projectId, 'key-3')).status).toBe(401);
      expect((await analyze('share', projectId, 'key-3')).status).toBe(403);
      const foreign = await routes.analyze(
        new Request(`${APP_URL}/api/v1/x`, {
          method: 'POST',
          headers: {
            'x-test-actor': 'owner',
            origin: 'https://evil.example',
            'idempotency-key': 'k',
          },
        }),
        { params: Promise.resolve({ id: projectId }) },
      );
      expect(foreign.status).toBe(403);
    });

    it('limits a guest to 5 analyses per hour; a replayed key is not counted', async () => {
      const projectId = owned.busy ?? '';
      await cleanLogo(projectId);
      for (const key of ['a1', 'a2', 'a3', 'a4', 'a5']) {
        expect((await analyze('busy', projectId, `key-${key}`)).status).toBe(202);
      }
      expect((await analyze('busy', projectId, 'key-a5')).status).toBe(200);
      const limited = await analyze('busy', projectId, 'key-a6');
      expect(limited.status).toBe(429);
      expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    });
  },
);

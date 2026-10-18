import { randomBytes } from 'node:crypto';
import type { Actor } from '@app/contracts';
import { documents, guestSessions, projects, user, workspaceMembers, workspaces } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { makeDocument } from '@app/document/testing';
import { uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { documentHandlers } from './document-routes';
import { ROUTES } from './routes';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const id = (): string => uuidV7(Date.now(), randomBytes(10));
type Handlers = ReturnType<typeof documentHandlers>;
const HANDLER: Readonly<Record<string, keyof Handlers>> = {
  '/projects/[id]/commands': 'commands',
  '/projects/[id]/undo': 'undo',
  '/projects/[id]/redo': 'redo',
  '/projects/[id]/revisions/[seq]/undo': 'undoRevision',
};

describe.runIf(adminUrl !== '')(
  'document routes: generated access tests (10_QUALITY.md §7)',
  () => {
    let test: TestDatabase;
    let handlers: Handlers;
    const projectId = id();
    const actors: Record<string, Actor> = {};

    beforeAll(async () => {
      test = await createTestDatabase(adminUrl);
      const { orm } = test.database;
      for (const name of ['owner', 'viewer', 'stranger']) {
        const userId = id();
        await orm.insert(user).values({ id: userId, name, email: `${userId}@example.invalid` });
        actors[name] = { kind: 'user', userId, emailVerified: true };
      }
      const owner = actors.owner?.kind === 'user' ? actors.owner.userId : '';
      const viewer = actors.viewer?.kind === 'user' ? actors.viewer.userId : '';
      const workspaceId = id();
      await orm.insert(workspaces).values({ id: workspaceId, name: 'W', ownerUserId: owner });
      await orm.insert(workspaceMembers).values([
        { workspaceId, userId: owner, role: 'owner' },
        { workspaceId, userId: viewer, role: 'viewer' },
      ]);
      await orm.insert(projects).values({ id: projectId, title: 'P', workspaceId });
      await orm
        .insert(documents)
        .values({ projectId, schemaVersion: 1, body: makeDocument(), seq: 0 });
      const foreignGuest = id();
      await orm
        .insert(guestSessions)
        .values({ id: foreignGuest, tokenHash: foreignGuest, expiresAt: new Date() });
      actors.guest = { kind: 'guest', guestSessionId: foreignGuest };
      actors.share = { kind: 'share', projectId };
      handlers = documentHandlers({
        orm,
        appUrl: APP_URL,
        // The actor would come from the session cookie; here the test names it explicitly.
        resolveActor: (request) =>
          Promise.resolve(actors[request.headers.get('x-test-actor') ?? ''] ?? null),
      });
    });
    afterAll(async () => {
      await test.dispose();
    });

    function call(
      route: string,
      actor: string,
      body: unknown,
      seq = '1',
      origin = APP_URL,
    ): Promise<Response> {
      const name = HANDLER[route];
      if (!name) throw new Error(`no handler for ${route}`);
      const request = new Request(`${APP_URL}/api/v1${route}`, {
        method: 'POST',
        headers: { 'x-test-actor': actor, origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return handlers[name](request, { params: Promise.resolve({ id: projectId, seq }) });
    }
    const colour = { type: 'SetColorToken', token: 'primary', hex: '#111111' };
    const body = (route: string): unknown =>
      route.endsWith('/commands') ? { baseSeq: 0, command: colour } : { baseSeq: 0 };

    it.each(
      ROUTES.filter((route) => route.action === 'document:command').map((route) => route.path),
    )('%s: a 401, b 404, c 404, d 403, f 403 — never 2xx', async (route) => {
      expect((await call(route, 'nobody', body(route))).status).toBe(401);
      expect((await call(route, 'stranger', body(route))).status).toBe(404);
      expect((await call(route, 'guest', body(route))).status).toBe(404);
      expect((await call(route, 'share', body(route))).status).toBe(403);
      expect((await call(route, 'viewer', body(route))).status).toBe(403);
      expect((await call(route, 'owner', body(route), '1', 'https://evil.example')).status).toBe(
        403,
      );
    });

    it('g. the owner edits, undoes a given revision, redoes and undoes again', async () => {
      const steps: [string, unknown, string][] = [
        ['/projects/[id]/commands', { baseSeq: 0, command: colour }, '1'],
        ['/projects/[id]/revisions/[seq]/undo', { baseSeq: 1 }, '1'],
        ['/projects/[id]/redo', { baseSeq: 2 }, '1'],
        ['/projects/[id]/undo', { baseSeq: 3 }, '1'],
      ];
      const seqs: number[] = [];
      for (const [route, payload, seq] of steps) {
        const response = await call(route, 'owner', payload, seq);
        expect(response.status).toBe(200);
        const json: unknown = await response.json();
        seqs.push(
          typeof json === 'object' && json !== null ? Number(Reflect.get(json, 'seq')) : -1,
        );
      }
      expect(seqs).toEqual([1, 2, 3, 4]);
    });

    it('maps business errors to stable codes and refuses malformed bodies', async () => {
      const stale = await call('/projects/[id]/commands', 'owner', { baseSeq: 0, command: colour });
      const invalid = await call('/projects/[id]/commands', 'owner', {
        baseSeq: 4,
        command: { type: 'Nope' },
      });
      const malformed = await call('/projects/[id]/commands', 'owner', { baseSeq: -1 });

      expect([stale.status, invalid.status, malformed.status]).toEqual([409, 422, 400]);
      expect(await stale.json()).toMatchObject({ code: 'REVISION_CONFLICT', status: 409 });
      expect(await invalid.json()).toMatchObject({ code: 'INVALID_COMMAND', status: 422 });
      expect(JSON.stringify(await malformed.json())).not.toMatch(/stack|at .*\.ts/);
    });
  },
);

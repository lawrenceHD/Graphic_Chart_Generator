import { randomBytes } from 'node:crypto';
import type { ObjectStorage } from '@app/contracts';
import {
  assets,
  documents,
  eq,
  guestSessions,
  projectEvents,
  projects,
  revisions,
  usageEvents,
  user,
  workspaces,
} from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { ok, uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { purge } from './purge.js';

const adminUrl = integrationDatabaseUrl();
const id = (): string => uuidV7(Date.now(), randomBytes(10));
const NOW = new Date('2026-10-18T12:00:00Z');
const hoursAgo = (hours: number): Date => new Date(NOW.getTime() - hours * 3_600_000);

/** In-memory stand-in for R2 recording deletions; the purge logic itself stays real. */
function memoryStorage(objects: Set<string>): ObjectStorage {
  const unused = () => Promise.reject(new Error('not used by the purge'));
  return {
    presignPut: unused,
    presignGet: unused,
    head: unused,
    get: () => Promise.resolve(ok(new Uint8Array(0))),
    put: unused,
    delete: (key) => {
      objects.delete(key);
      return Promise.resolve();
    },
  };
}

describe.runIf(adminUrl !== '')('purge (03_DATA_MODEL.md §6, AC-01.2)', () => {
  let test: TestDatabase;
  const objects = new Set<string>();
  const run = () =>
    purge({ orm: test.database.orm, storage: memoryStorage(objects), now: () => NOW });

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
  });
  afterAll(async () => {
    await test.dispose();
  });

  async function guest(expiresAt: Date, claimedBy: string | null = null): Promise<string> {
    const guestId = id();
    await test.database.orm
      .insert(guestSessions)
      .values({ id: guestId, tokenHash: guestId, expiresAt, claimedByUserId: claimedBy });
    return guestId;
  }
  async function project(
    owner: { guestSessionId?: string; workspaceId?: string },
    deletedAt: Date | null = null,
  ) {
    const { orm } = test.database;
    const projectId = id();
    await orm.insert(projects).values({ id: projectId, title: 'P', deletedAt, ...owner });
    await orm.insert(documents).values({ projectId, schemaVersion: 1, body: {}, seq: 1 });
    await orm.insert(revisions).values({
      id: id(),
      projectId,
      seq: 1,
      actor: 'user',
      command: {},
      inverse: {},
    });
    // An SSE event past the 24 h replay window (04_API_CONTRACTS.md §5).
    await orm.insert(projectEvents).values({
      projectId,
      type: 'analysis.done',
      data: { seq: 1 },
      createdAt: hoursAgo(25),
    });
    for (const name of ['original', 'sanitized']) {
      const storageKey = `projects/${projectId}/assets/${projectId}/${name}`;
      objects.add(storageKey);
      await orm.insert(assets).values({ id: id(), projectId, kind: 'logo_original', storageKey });
    }
    return projectId;
  }
  const exists = async (projectId: string) =>
    (await test.database.orm.select().from(projects).where(eq(projects.id, projectId))).length ===
    1;
  const keysOf = (projectId: string) => [...objects].filter((key) => key.includes(projectId));

  it('removes expired guest projects, deleted projects and their files; keeps everything live', async () => {
    const { orm } = test.database;
    const userId = id();
    await orm.insert(user).values({ id: userId, name: 'u', email: `${userId}@example.invalid` });
    const workspaceId = id();
    await orm.insert(workspaces).values({ id: workspaceId, name: 'w', ownerUserId: userId });

    const expiredGuest = await guest(hoursAgo(1));
    const liveGuest = await guest(new Date(NOW.getTime() + 3_600_000));
    const expired = await project({ guestSessionId: expiredGuest });
    const live = await project({ guestSessionId: liveGuest });
    const deleted = await project({ workspaceId }, hoursAgo(2));
    const kept = await project({ workspaceId });

    expect(await run()).toEqual({
      expiredGuestProjects: 1,
      purgedProjects: 2,
      purgedGuestSessions: 1,
      purgedEvents: 2, // those of the two live projects; the others went with their project
    });
    expect(await orm.select().from(projectEvents)).toEqual([]);
    expect([await exists(expired), await exists(deleted)]).toEqual([false, false]);
    expect([await exists(live), await exists(kept)]).toEqual([true, true]);
    expect([keysOf(expired), keysOf(deleted)]).toEqual([[], []]);
    expect(keysOf(live)).toHaveLength(2);
    expect(await orm.select().from(assets).where(eq(assets.projectId, deleted))).toEqual([]);
    const sessions = (await orm.select().from(guestSessions)).map((row) => row.id);
    expect(sessions).toEqual([liveGuest]);
    expect(await run()).toEqual({
      expiredGuestProjects: 0,
      purgedProjects: 0,
      purgedGuestSessions: 0,
      purgedEvents: 0,
    });
  });

  it('keeps an expired guest session still referenced by cost accounting', async () => {
    const { orm } = test.database;
    const accounted = await guest(hoursAgo(3));
    await orm.insert(usageEvents).values({
      id: id(),
      guestSessionId: accounted,
      kind: 'ai.analyze',
      tokensIn: 1,
      tokensOut: 1,
      estCostMicroEur: 0,
    });
    expect((await run()).purgedGuestSessions).toBe(0);
    expect(
      await orm.select().from(guestSessions).where(eq(guestSessions.id, accounted)),
    ).toHaveLength(1);
  });
});

import { randomUUID } from 'node:crypto';
import type { ProjectEvent } from '@app/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  appendProjectEvent,
  listenProjectEvents,
  purgeProjectEvents,
  readProjectEvents,
  type ProjectEventListener,
} from './events.js';
import { guestSessions, projectEvents, projects } from './schema/index.js';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from './testing.js';

const adminUrl = integrationDatabaseUrl();
const ASSET = '01890a5d-ac96-774b-bcce-b302099a8057';
const clean: ProjectEvent = { type: 'asset.status', data: { assetId: ASSET, status: 'clean' } };

async function until(condition: () => boolean, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe.runIf(adminUrl !== '')('project event log (04_API_CONTRACTS.md §5)', () => {
  let test: TestDatabase;
  let listener: ProjectEventListener;
  const notified: string[] = [];
  const project = randomUUID();

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    const { orm } = test.database;
    const session = randomUUID();
    await orm
      .insert(guestSessions)
      .values({ id: session, tokenHash: session, expiresAt: new Date(Date.now() + 3_600_000) });
    await orm.insert(projects).values({ id: project, guestSessionId: session, title: 'p' });
    listener = await listenProjectEvents(test.url, {
      onProject: (id) => notified.push(id),
      onResync: () => undefined,
      onError: (error) => {
        throw error;
      },
    });
  }, 60_000);
  afterAll(async () => {
    await listener.close();
    await test.dispose();
  });

  it('an event exists and is notified only once its transaction commits', async () => {
    const { orm } = test.database;
    await orm
      .transaction(async (tx) => {
        await appendProjectEvent(tx, project, clean);
        throw new Error('rolled back');
      })
      .catch(() => undefined);
    await orm.transaction((tx) => appendProjectEvent(tx, project, clean));

    await until(() => notified.length === 1);
    const page = await readProjectEvents(orm, project, 0, 10);
    expect(page.events.map((stored) => stored.event)).toEqual([clean]);
    expect(notified).toEqual([project]);
  });

  it('replays after a cursor, in id order, and steps over rows outside the contract', async () => {
    const { orm } = test.database;
    const first = (await readProjectEvents(orm, project, 0, 10)).cursor;
    await orm
      .insert(projectEvents)
      .values({ projectId: project, type: 'asset.status', data: { bad: 1 } });
    await orm.transaction((tx) =>
      appendProjectEvent(tx, project, {
        type: 'analysis.step',
        data: { step: 1, state: 'running' },
      }),
    );

    const page = await readProjectEvents(orm, project, first, 10);
    expect(page.events.map((stored) => stored.event.type)).toEqual(['analysis.step']);
    expect(page.cursor).toBe(page.events.at(-1)?.id);
    const tail = await readProjectEvents(orm, project, first, 1); // only the invalid row
    expect(tail.events).toEqual([]);
    expect(tail.cursor).toBeGreaterThan(first);
  });

  it('purges events older than the retention date', async () => {
    const { orm } = test.database;
    expect(await purgeProjectEvents(orm, new Date(Date.now() - 60_000))).toBe(0);
    expect(await purgeProjectEvents(orm, new Date(Date.now() + 60_000))).toBe(3);
  });
});

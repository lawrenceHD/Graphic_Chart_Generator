import { randomBytes } from 'node:crypto';
import type { Actor, ProjectEvent } from '@app/contracts';
import {
  appendProjectEvent,
  guestSessions,
  listenProjectEvents,
  projects,
  readProjectEvents,
} from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProjectEventHub, type ProjectEventHub } from './event-hub';
import { eventHandlers, type EventRouteDeps } from './event-routes';

const adminUrl = integrationDatabaseUrl();
const APP_URL = 'http://localhost:3000';
const id = (): string => uuidV7(Date.now(), randomBytes(10));
const step = (n: number): ProjectEvent => ({
  type: 'analysis.step',
  data: { step: n, state: 'done' },
});

/** Reads SSE text until `done` holds for what was received, or fails after the timeout. */
async function readUntil(
  response: Response,
  done: (text: string) => boolean,
  timeoutMs = 8_000,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('no body');
  const decoder = new TextDecoder();
  let text = '';
  const deadline = Date.now() + timeoutMs;
  while (!done(text)) {
    const left = deadline - Date.now();
    if (left <= 0) throw new Error(`timed out, received: ${JSON.stringify(text)}`);
    const chunk = await Promise.race([
      reader.read(),
      new Promise<null>((resolve) =>
        setTimeout(() => {
          resolve(null);
        }, left),
      ),
    ]);
    if (chunk === null) continue;
    if (chunk.done) break;
    text += decoder.decode(chunk.value, { stream: true });
  }
  await reader.cancel();
  return text;
}
const frames = (text: string) =>
  [...text.matchAll(/id: (\d+)\nevent: (\S+)\ndata: (.*)\n\n/g)].map((match) => {
    const data: unknown = JSON.parse(match[3] ?? 'null');
    return { id: Number(match[1]), event: match[2], data };
  });

describe.runIf(adminUrl !== '')('GET /projects/:id/events (04_API_CONTRACTS.md §5)', () => {
  let test: TestDatabase;
  let hub: ProjectEventHub;
  let listener: Promise<{ close: () => Promise<void> }> | undefined;
  const actors: Record<string, Actor> = {};
  let projectId = '';

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    const { orm } = test.database;
    for (const name of ['owner', 'stranger']) {
      const guestId = id();
      await orm
        .insert(guestSessions)
        .values({ id: guestId, tokenHash: guestId, expiresAt: new Date(Date.now() + 3_600_000) });
      actors[name] = { kind: 'guest', guestSessionId: guestId };
    }
    projectId = id();
    const owner = actors.owner?.kind === 'guest' ? actors.owner.guestSessionId : '';
    await orm.insert(projects).values({ id: projectId, guestSessionId: owner, title: 'Logo' });
    hub = createProjectEventHub(
      (handlers) => (listener = listenProjectEvents(test.url, handlers)),
      (error) => {
        throw error;
      },
    );
  });
  afterAll(async () => {
    await (await listener)?.close();
    await test.dispose();
  });

  const routes = (overrides: Partial<EventRouteDeps> = {}) =>
    eventHandlers({
      orm: test.database.orm,
      appUrl: APP_URL,
      resolveActor: (request) =>
        Promise.resolve(actors[request.headers.get('x-test-actor') ?? ''] ?? null),
      hub,
      onError: (error) => {
        throw error;
      },
      ...overrides,
    });
  const open = (actor: string, lastEventId?: string, overrides?: Partial<EventRouteDeps>) =>
    routes(overrides).stream(
      new Request(`${APP_URL}/api/v1/projects/${projectId}/events`, {
        headers: {
          'x-test-actor': actor,
          ...(lastEventId === undefined ? {} : { 'last-event-id': lastEventId }),
        },
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
  // Last-Event-ID of a client that has seen the whole log so far: only new events follow.
  const latest = async () =>
    String((await readProjectEvents(test.database.orm, projectId, 0, 1000)).cursor);
  const append = (event: ProjectEvent) =>
    test.database.orm.transaction((tx) => appendProjectEvent(tx, projectId, event));

  it('refuses the anonymous (401) and strangers (404), before any stream', async () => {
    expect((await open('nobody')).status).toBe(401);
    expect((await open('stranger')).status).toBe(404);
  });

  it('replays the log in order with increasing ids, then only what came after Last-Event-ID', async () => {
    for (const n of [1, 2, 3]) await append(step(n));
    const response = await open('owner');
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store, no-transform');
    const all = frames(await readUntil(response, (text) => frames(text).length >= 3));
    expect(all.map((f) => [f.event, f.data])).toEqual(
      [1, 2, 3].map((n) => ['analysis.step', step(n).data]),
    );
    expect(all.map((f) => f.id)).toEqual([...all.map((f) => f.id)].sort((a, b) => a - b));

    const second = all[1]?.id ?? 0;
    const resumed = await open('owner', String(second));
    const rest = frames(await readUntil(resumed, (text) => frames(text).length >= 1));
    expect(rest.map((f) => f.id)).toEqual([all[2]?.id]);
    // A malformed Last-Event-ID replays everything rather than guessing.
    const garbled = await open('owner', '12abc');
    expect(frames(await readUntil(garbled, (text) => frames(text).length >= 3))).toHaveLength(3);
  });

  it('pushes an event committed while the stream is open (NOTIFY)', async () => {
    const response = await open('owner', await latest());
    const received = readUntil(response, (text) => frames(text).length >= 1);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await append({ type: 'analysis.done', data: { seq: 7 } });
    const [pushed] = frames(await received);
    expect(pushed).toMatchObject({ event: 'analysis.done', data: { seq: 7 } });
  });

  it('heartbeats, and catches up on the heartbeat when no notification comes', async () => {
    const deaf: ProjectEventHub = { subscribe: () => () => undefined };
    const response = await open('owner', await latest(), { hub: deaf, heartbeatMs: 200 });
    const received = readUntil(response, (text) => frames(text).length >= 1);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await append(step(4));
    const text = await received;
    expect(text.startsWith('retry: 3000\n\n')).toBe(true);
    expect(text).toContain(': ping\n\n');
    expect(frames(text)[0]?.data).toEqual(step(4).data);
  });

  it('ends after its maximum age and unsubscribes, so access is checked again on reconnect', async () => {
    let subscribed = 0;
    const counting: ProjectEventHub = {
      subscribe: () => {
        subscribed += 1;
        return () => (subscribed -= 1);
      },
    };
    const response = await open('owner', await latest(), { hub: counting, maxAgeMs: 200 });
    expect(subscribed).toBe(1);
    const text = await readUntil(response, () => false, 3_000); // returns when the stream ends
    expect(text).toBe('retry: 3000\n\n');
    expect(subscribed).toBe(0);
  });
});

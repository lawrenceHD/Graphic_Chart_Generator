import { parseProjectEvent, type ProjectEvent } from '@app/contracts';
import { and, asc, eq, gt, lt, sql } from 'drizzle-orm';
import { Client } from 'pg';
import type { createDatabase } from './index.js';
import { projectEvents } from './schema/index.js';

// Project event log behind the SSE stream (04_API_CONTRACTS.md §5). Writers append inside their own
// transaction, so an event exists exactly when the change it reports is committed; NOTIFY is delivered at
// commit too. Readers follow an id cursor, so a missed notification only delays an event, never loses it.
type Orm = ReturnType<typeof createDatabase>['orm'];
type Tx = Parameters<Parameters<Orm['transaction']>[0]>[0];

export const PROJECT_EVENTS_CHANNEL = 'project_events';

export interface StoredProjectEvent {
  readonly id: number;
  readonly event: ProjectEvent;
}
export interface ProjectEventPage {
  readonly events: readonly StoredProjectEvent[];
  /** Id of the last row read, valid or not: the next read starts after it. */
  readonly cursor: number;
}

/** Appends `event` in the caller's transaction and notifies listeners at commit. */
export async function appendProjectEvent(
  tx: Tx,
  projectId: string,
  event: ProjectEvent,
): Promise<void> {
  // Writers of one project are serialised until commit: ids then become visible in increasing order, and a
  // reader past id n can never see a smaller id commit later.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${projectId}, 0))`);
  await tx.insert(projectEvents).values({ projectId, type: event.type, data: event.data });
  await tx.execute(sql`SELECT pg_notify(${PROJECT_EVENTS_CHANNEL}, ${projectId})`);
}

/** Events of a project after `afterId`, oldest first. Rows outside the contract are skipped. */
export async function readProjectEvents(
  orm: Orm,
  projectId: string,
  afterId: number,
  limit: number,
): Promise<ProjectEventPage> {
  const rows = await orm
    .select()
    .from(projectEvents)
    .where(and(eq(projectEvents.projectId, projectId), gt(projectEvents.id, afterId)))
    .orderBy(asc(projectEvents.id))
    .limit(limit);
  const events = rows.flatMap((row) => {
    const event = parseProjectEvent(row.type, row.data);
    return event === null ? [] : [{ id: row.id, event }];
  });
  return { events, cursor: rows.at(-1)?.id ?? afterId };
}

/** Retention of the replay log: a client away longer than this reloads the project state instead. */
export async function purgeProjectEvents(orm: Orm, before: Date): Promise<number> {
  const removed = await orm
    .delete(projectEvents)
    .where(lt(projectEvents.createdAt, before))
    .returning({ id: projectEvents.id });
  return removed.length;
}

export interface ProjectEventListener {
  readonly close: () => Promise<void>;
}

const RECONNECT_DELAY_MS = 1_000;

/**
 * One LISTEN connection per process. `onProject` receives the project id of each committed event; after a lost
 * connection is re-established, `onResync` asks every reader to catch up, since notifications sent while it
 * was down are gone.
 */
export async function listenProjectEvents(
  databaseUrl: string,
  handlers: {
    readonly onProject: (projectId: string) => void;
    readonly onResync: () => void;
    readonly onError: (error: Error) => void;
  },
): Promise<ProjectEventListener> {
  let closed = false;
  let client: Client | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const connect = async (): Promise<void> => {
    const next = new Client({ connectionString: databaseUrl });
    next.on('notification', (message) => {
      if (message.channel === PROJECT_EVENTS_CHANNEL && message.payload !== undefined)
        handlers.onProject(message.payload);
    });
    next.on('error', (error) => {
      handlers.onError(error);
      void next.end().catch(() => undefined);
      if (client === next) client = undefined;
      if (!closed) timer = setTimeout(() => void reconnect(), RECONNECT_DELAY_MS);
    });
    await next.connect();
    await next.query(`LISTEN ${PROJECT_EVENTS_CHANNEL}`);
    client = next;
  };
  const reconnect = async (): Promise<void> => {
    try {
      await connect();
      handlers.onResync();
    } catch (error) {
      handlers.onError(error instanceof Error ? error : new Error(String(error)));
      if (!closed) timer = setTimeout(() => void reconnect(), RECONNECT_DELAY_MS);
    }
  };
  await connect();
  return {
    close: async () => {
      closed = true;
      clearTimeout(timer);
      await client?.end();
    },
  };
}

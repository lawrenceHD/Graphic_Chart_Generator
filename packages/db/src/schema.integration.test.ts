import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { uuidV7 } from '@app/kernel';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import {
  chatMessages,
  createDatabase,
  guestSessions,
  projects,
  revisions,
  user,
  workspaces,
} from './index.js';
import { migrateDatabase } from './migrate.js';

// Local runs read the private root .env.local (never printed); CI provides DATABASE_URL.
const rootEnv = fileURLToPath(new URL('../../../.env.local', import.meta.url));
if (process.env.DATABASE_URL === undefined && existsSync(rootEnv)) loadEnvFile(rootEnv);
const adminUrl = process.env.DATABASE_URL ?? '';
const id = (): string => uuidV7(Date.now(), randomBytes(10));
const ignorePoolError = (): void => undefined;

// Error code of a failed PostgreSQL statement (23505 unique, 23514 check), or 'none'.
async function pgCode(statement: Promise<unknown>): Promise<string> {
  try {
    await statement;
    return 'none';
  } catch (error: unknown) {
    const cause: unknown = error instanceof Error ? (error.cause ?? error) : error;
    const code: unknown =
      typeof cause === 'object' && cause !== null ? Reflect.get(cause, 'code') : undefined;
    return typeof code === 'string' ? code : 'unknown';
  }
}

describe.runIf(adminUrl !== '')('schema and migrations against PostgreSQL (T-014)', () => {
  // A throwaway database per run: the developer database is never touched.
  const name = `atelier_test_${randomBytes(6).toString('hex')}`;
  const admin = new Pool({ connectionString: adminUrl });
  admin.on('error', ignorePoolError);
  // Vitest still runs this callback when the suite is skipped: build the URL without throwing on ''.
  const url = new URL(adminUrl === '' ? 'postgresql://skipped@localhost/skipped' : adminUrl);
  url.pathname = `/${name}`;
  const database = createDatabase({ DATABASE_URL: url.toString() }, ignorePoolError);
  const { orm } = database;

  beforeAll(async () => {
    await admin.query(`CREATE DATABASE ${name}`);
    await migrateDatabase(orm);
  });
  afterAll(async () => {
    await database.pool.end();
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.end();
  });

  it('applies the committed migrations, and a second run is a no-op', async () => {
    await expect(migrateDatabase(orm)).resolves.toBeUndefined();
    const tables = await orm.execute<{ table_name: string }>(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'account',
      'analysis_runs',
      'assets',
      'audit_log',
      'chat_messages',
      'documents',
      'exports',
      'guest_sessions',
      'project_events',
      'projects',
      'rate_limit',
      'revisions',
      'session',
      'share_links',
      'usage_events',
      'user',
      'verification',
      'workspace_members',
      'workspaces',
    ]);
  });

  it('requires exactly one project owner: a workspace or a guest session', async () => {
    const userId = id();
    await orm.insert(user).values({ id: userId, name: 'Ada', email: `${userId}@example.invalid` });
    const workspaceId = id();
    await orm.insert(workspaces).values({ id: workspaceId, name: 'Perso', ownerUserId: userId });
    const guestId = id();
    await orm
      .insert(guestSessions)
      .values({ id: guestId, tokenHash: guestId, expiresAt: new Date() });

    expect(await pgCode(orm.insert(projects).values({ id: id(), title: 'None' }))).toBe('23514');
    expect(
      await pgCode(
        orm
          .insert(projects)
          .values({ id: id(), title: 'Both', workspaceId, guestSessionId: guestId }),
      ),
    ).toBe('23514');
    expect(await pgCode(orm.insert(projects).values({ id: id(), title: 'Ok', workspaceId }))).toBe(
      'none',
    );
    expect(
      await pgCode(
        orm.insert(projects).values({ id: id(), title: 'Guest', guestSessionId: guestId }),
      ),
    ).toBe('none');
    expect(
      await pgCode(
        orm.insert(user).values({ id: id(), name: 'Twin', email: `${userId}@example.invalid` }),
      ),
    ).toBe('23505');
  });

  it('keeps revisions unique per project and never both an undo and a redo', async () => {
    const guestId = id();
    await orm
      .insert(guestSessions)
      .values({ id: guestId, tokenHash: guestId, expiresAt: new Date() });
    const projectId = id();
    await orm.insert(projects).values({ id: projectId, title: 'History', guestSessionId: guestId });
    const revision = { projectId, actor: 'user' as const, command: {}, inverse: { expect: null } };

    expect(await pgCode(orm.insert(revisions).values({ ...revision, id: id(), seq: 1 }))).toBe(
      'none',
    );
    expect(await pgCode(orm.insert(revisions).values({ ...revision, id: id(), seq: 1 }))).toBe(
      '23505',
    );
    expect(
      await pgCode(
        orm.insert(revisions).values({ ...revision, id: id(), seq: 2, undoOf: 1, redoOf: 1 }),
      ),
    ).toBe('23514');
    expect(
      await pgCode(
        orm.insert(chatMessages).values({ id: id(), projectId, role: 'system', content: 'x' }),
      ),
    ).toBe('23514');
  });
});

import type { Env } from '@app/contracts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

export * from './schema/index.js';

// A health check must answer "degraded" quickly instead of hanging on an unreachable host.
const CONNECTION_TIMEOUT_MS = 3_000;

export type PoolErrorHandler = (error: Error) => void;

// The handler is mandatory: an idle client losing its connection (database restart, network cut) emits
// 'error' on the pool, and an unhandled 'error' event terminates the Node process.
export function createDatabase(
  configuration: Pick<Env, 'DATABASE_URL'>,
  onPoolError: PoolErrorHandler,
) {
  const pool = new Pool({
    connectionString: configuration.DATABASE_URL,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  pool.on('error', onPoolError);

  return {
    orm: drizzle(pool, { schema }),
    pool,
  };
}

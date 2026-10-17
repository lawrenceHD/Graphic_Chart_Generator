import type { Env } from '@app/contracts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// A health check must answer "degraded" quickly instead of hanging on an unreachable host.
const CONNECTION_TIMEOUT_MS = 3_000;

export function createDatabase(configuration: Pick<Env, 'DATABASE_URL'>) {
  const pool = new Pool({
    connectionString: configuration.DATABASE_URL,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });

  return {
    orm: drizzle(pool),
    pool,
  };
}

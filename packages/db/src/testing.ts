import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { createDatabase } from './index.js';
import { migrateDatabase } from './migrate.js';

// `@app/db/testing`: integration-test helpers only, never imported by application code.

/** DATABASE_URL from CI, or from the private root .env.local in local runs (never printed). */
export function integrationDatabaseUrl(): string {
  const rootEnv = fileURLToPath(new URL('../../../.env.local', import.meta.url));
  if (process.env.DATABASE_URL === undefined && existsSync(rootEnv)) loadEnvFile(rootEnv);
  return process.env.DATABASE_URL ?? '';
}

export interface TestDatabase {
  readonly database: ReturnType<typeof createDatabase>;
  /** Connection string of the throwaway database (for clients other than Drizzle, such as pg-boss). */
  readonly url: string;
  /** Drops the throwaway database. */
  readonly dispose: () => Promise<void>;
}

/** Creates and migrates a throwaway database: the developer database is never touched. */
export async function createTestDatabase(adminUrl: string): Promise<TestDatabase> {
  const ignore = (): void => undefined;
  const name = `atelier_test_${randomBytes(6).toString('hex')}`;
  const admin = new Pool({ connectionString: adminUrl });
  admin.on('error', ignore);
  await admin.query(`CREATE DATABASE ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const database = createDatabase({ DATABASE_URL: url.toString() }, ignore);
  await migrateDatabase(database.orm);
  return {
    database,
    url: url.toString(),
    dispose: async () => {
      await database.pool.end();
      await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}

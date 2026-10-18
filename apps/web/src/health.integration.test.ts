import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createDatabase } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { createHealthResponse } from './health-response';

// The real database URL lives in the private root .env.local; it is loaded, never printed.
const rootEnvFile = resolve(import.meta.dirname, '../../../.env.local');
if (existsSync(rootEnvFile)) {
  loadEnvFile(rootEnvFile);
}
const databaseUrl = process.env.DATABASE_URL;
// Idle-client errors cannot happen in these short-lived pools; the handler only satisfies the contract.
const ignorePoolError = (): void => undefined;

describe('GET /api/health against PostgreSQL', () => {
  // Port 1 is reserved and closed: the connection is refused immediately.
  const unreachable = createDatabase(
    {
      DATABASE_URL: 'postgresql://health:check@127.0.0.1:1/none',
    },
    ignorePoolError,
  );
  afterAll(() => unreachable.pool.end());

  it('answers 503 degraded when the database is unreachable', async () => {
    const response = await createHealthResponse(() => unreachable.pool.query('SELECT 1'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: 'degraded' });
  });

  it.runIf(databaseUrl !== undefined && databaseUrl !== '')(
    'answers 200 ok when the database answers SELECT 1',
    async () => {
      const reachable = createDatabase({ DATABASE_URL: databaseUrl ?? '' }, ignorePoolError);
      try {
        const response = await createHealthResponse(() => reachable.pool.query('SELECT 1'));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ status: 'ok' });
      } finally {
        await reachable.pool.end();
      }
    },
  );
});

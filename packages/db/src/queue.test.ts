import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startJobQueue, type JobRunner } from './queue.js';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from './testing.js';

const adminUrl = integrationDatabaseUrl();
const ASSET = '01890a5d-ac96-774b-bcce-b302099a8057';
const fail = (error: Error): never => {
  throw error;
};

async function until(condition: () => boolean, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

describe.runIf(adminUrl !== '')('pg-boss job queue (ADR-005)', () => {
  let test: TestDatabase;
  let producer: JobRunner;
  let worker: JobRunner;

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    // Two producers in a row: queue creation must be idempotent (web and worker both start it).
    await (await startJobQueue(test.url, 'producer', fail)).stop();
    producer = await startJobQueue(test.url, 'producer', fail);
    worker = await startJobQueue(test.url, 'worker', fail);
  }, 60_000);
  afterAll(async () => {
    await producer.stop();
    await worker.stop();
    await test.dispose();
  });

  it('delivers a validated payload once per singleton key, and retries a failed attempt', async () => {
    await producer.send('asset.scan', { assetId: ASSET }, ASSET);
    await producer.send('asset.scan', { assetId: ASSET }, ASSET);
    const attempts: { assetId: string; attempt: number }[] = [];
    await worker.work('asset.scan', (payload, attempt) => {
      attempts.push({ assetId: payload.assetId, attempt });
      return attempt === 0 ? Promise.reject(new Error('transient')) : Promise.resolve();
    });
    await until(() => attempts.length >= 2);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(attempts).toEqual([
      { assetId: ASSET, attempt: 0 },
      { assetId: ASSET, attempt: 1 },
    ]);
  }, 30_000);

  it('moves a job out of attempts to its dead-letter queue', async () => {
    // Own database: the asset.scan handler of the test above would otherwise take some attempts.
    const own = await createTestDatabase(adminUrl);
    const producer = await startJobQueue(own.url, 'producer', fail);
    const worker = await startJobQueue(own.url, 'worker', fail);
    const doomed = '01890a5d-ac96-774b-bcce-b302099a8058';
    const attempts: number[] = [];
    const dead: string[] = [];
    await worker.work('asset.scan.failed', (payload) => {
      dead.push(payload.assetId);
      return Promise.resolve();
    });
    await worker.work('asset.scan', (payload, attempt) => {
      attempts.push(attempt);
      return Promise.reject(new Error('down'));
    });
    await producer.send('asset.scan', { assetId: doomed }, doomed);
    await until(() => dead.length > 0, 40_000);
    await producer.stop();
    await worker.stop();
    await own.dispose();
    expect(attempts).toEqual([0, 1, 2]);
    expect(dead).toEqual([doomed]);
  }, 60_000);

  it('refuses to enqueue a payload that breaks the contract', async () => {
    await expect(producer.send('asset.scan', { assetId: 'not-a-uuid' }, 'x')).rejects.toThrow(
      'invalid asset.scan payload',
    );
  });
});

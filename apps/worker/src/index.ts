import { loadEnv } from '@app/contracts';
import { createDatabase } from '@app/db';
import { startJobQueue } from '@app/db/queue';
import { createR2Storage } from '@app/storage';
import { createNodeRasterizer, normalizeRaster } from '@app/svg-engine/raster';
import { createLogger, errorSummary } from './logger.js';
import { purge } from './purge.js';
import { rejectTimedOut, scanAsset } from './scan.js';

// Composition root of the worker process (02_ARCHITECTURE.md §2): real clock, network and child processes are
// wired here only; job logic receives them.
const logger = createLogger();
const env = loadEnv(process.env);
if (!env.ok) {
  // Names only: values may be secrets.
  logger.fatal({ event: 'invalid_environment', variables: env.error.invalidVariables });
  process.exit(1);
}
const { DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
  env.value;

const database = createDatabase(env.value, (error) => {
  logger.error({ event: 'database_pool_error', error: errorSummary(error) });
});
const queue = await startJobQueue(DATABASE_URL, 'worker', (error) => {
  logger.error({ event: 'job_queue_error', error: errorSummary(error) });
});
const scanDeps = {
  orm: database.orm,
  storage: createR2Storage(
    {
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET,
    },
    () => new Date(),
  ),
  rasterizer: createNodeRasterizer(),
  normalizeRaster,
};

await queue.work('asset.scan', async ({ assetId }, attempt) => {
  try {
    await scanAsset(scanDeps, assetId);
    logger.info({ event: 'asset_scanned', assetId, attempt });
  } catch (error) {
    logger.error({ event: 'asset_scan_failed', assetId, attempt, error: errorSummary(error) });
    throw error;
  }
});
await queue.work('asset.scan.failed', async ({ assetId }) => {
  await rejectTimedOut(database.orm, assetId);
  logger.warn({ event: 'asset_scan_timed_out', assetId });
});
await queue.work('maintenance.purge', async () => {
  const report = await purge({
    orm: database.orm,
    storage: scanDeps.storage,
    now: () => new Date(),
  });
  logger.info({ event: 'purge_done', ...report });
});
await queue.schedule('maintenance.purge', '0 * * * *', {});
logger.info({ event: 'worker_started' });

async function shutdown(): Promise<void> {
  await queue.stop();
  await database.pool.end();
  logger.info({ event: 'worker_stopped' });
}
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());

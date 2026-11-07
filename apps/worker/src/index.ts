import { readFile } from 'node:fs/promises';
import { createGeminiTransport } from '@app/ai';
import { loadEnv } from '@app/contracts';
import { createDatabase } from '@app/db';
import { startJobQueue } from '@app/db/queue';
import { createR2Storage } from '@app/storage';
import { createNodeRasterizer, normalizeRaster } from '@app/svg-engine/raster';
import { analyzeProject, failTimedOutAnalysis } from './analyze.js';
import { createVtracer } from './vectorizer.js';
import { z } from 'zod';
import { createLogger, errorSummary } from './logger.js';
import { defaultResearch, loadRecordedResearch, type ResearchPort } from './research.js';
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
const {
  DATABASE_URL,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  AI_API_KEY,
  AI_MODEL,
} = env.value;
// The placeholders of .env.example mean "no AI": step 3 keeps its explicit defaults (07 §3.3).
const aiConfigured =
  !/^(replace-me|development)/u.test(AI_API_KEY) && !/^(replace-me|development)/u.test(AI_MODEL);

// Demo mode: RESEARCH_REPLAY_FILE names a recorded ChartPlan (JSON) served without any network call. An
// unreadable or invalid file is a configuration error, refused at start rather than hidden by a fallback.
// Without it the standard plan is used; the adapter for @app/ai (aiResearch) is wired once R2 has merged.
const replayFile = z.string().min(1).optional().parse(process.env.RESEARCH_REPLAY_FILE);
let research: ResearchPort = defaultResearch;
if (replayFile !== undefined) {
  const replay = await loadRecordedResearch((path) => readFile(path, 'utf8'), replayFile);
  if (!replay.ok) {
    logger.fatal({ event: 'invalid_research_replay', code: replay.error.code });
    process.exit(1);
  }
  research = replay.value;
}
logger.info({
  event: 'research_configuration',
  mode: replayFile === undefined ? 'standard' : 'replay',
});

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
      ...(R2_ENDPOINT === undefined ? {} : { endpoint: R2_ENDPOINT }),
    },
    () => new Date(),
  ),
  rasterizer: createNodeRasterizer(),
  normalizeRaster,
  vectorizer: createVtracer(),
  research,
  ...(aiConfigured
    ? {
        ai: {
          model: AI_MODEL,
          transport: createGeminiTransport({
            apiKey: AI_API_KEY,
            fetch: (url, init) => fetch(url, init),
            sleep: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
          }),
        },
      }
    : {}),
};
logger.info({
  event: 'ai_configuration',
  configured: aiConfigured,
  model: aiConfigured ? AI_MODEL : null,
});

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
await queue.work('project.analyze', async ({ analysisId }, attempt) => {
  try {
    await analyzeProject(scanDeps, analysisId);
    logger.info({ event: 'project_analyzed', analysisId, attempt });
  } catch (error) {
    logger.error({
      event: 'project_analyze_failed',
      analysisId,
      attempt,
      error: errorSummary(error),
    });
    throw error;
  }
});
await queue.work('project.analyze.failed', async ({ analysisId }) => {
  await failTimedOutAnalysis(database.orm, analysisId);
  logger.warn({ event: 'project_analyze_timed_out', analysisId });
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

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createGeminiTransport, loadFontCatalogue, runResearch } from '@app/ai';
import { loadEnv } from '@app/contracts';
import { createDatabase } from '@app/db';
import { startJobQueue } from '@app/db/queue';
import { createR2Storage } from '@app/storage';
import { createNodeRasterizer, normalizeRaster } from '@app/svg-engine/raster';
import { analyzeProject, failTimedOutAnalysis } from './analyze.js';
import { createVtracer } from './vectorizer.js';
import { z } from 'zod';
import { createLogger, errorSummary } from './logger.js';
import type { ResearchLogEntry } from './research-step.js';
import { fromRepoRoot, loadRecordings, readCorpusIndex, writeRecording } from './corpus.js';
import {
  aiResearch,
  defaultResearch,
  loadRecordedResearch,
  type ResearchPort,
} from './research.js';
import { purge } from './purge.js';
import { rejectTimedOut, scanAsset } from './scan.js';
import { createVectorConverter, createVectorcraftRunner } from './vector-converter.js';

// Composition root of the worker process (02_ARCHITECTURE.md §2): real clock, network and child processes are
// wired here only; job logic receives them.
const logger = createLogger();

function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file)
      .on('data', (chunk: Buffer | string) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => {
        resolve(hash.digest('hex'));
      });
  });
}
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

// Research (docs/team/QUEUE.md, "Variables d'environnement de la recherche"), validated here:
// - RESEARCH_REPLAY_FILE: a recorded ChartPlan (JSON) served without any network call (demo). An unreadable
//   or invalid file is a configuration error, refused at start rather than hidden by a fallback.
// - RESEARCH_CORPUS_DIR: the private corpus (default corpus-reel); absent means degraded, not failed.
// - RESEARCH_RECORD_DIR: recordings of live researches are written there and, on a later live failure,
//   replayed (same logo).
const ResearchEnv = z.object({
  RESEARCH_REPLAY_FILE: z.string().min(1).optional(),
  RESEARCH_CORPUS_DIR: z.string().min(1).default('corpus-reel'),
  RESEARCH_RECORD_DIR: z.string().min(1).optional(),
});
const researchEnv = ResearchEnv.safeParse(process.env);
if (!researchEnv.success) {
  logger.fatal({ event: 'invalid_research_environment' });
  process.exit(1);
}
const replayFile =
  researchEnv.data.RESEARCH_REPLAY_FILE === undefined
    ? undefined
    : fromRepoRoot(researchEnv.data.RESEARCH_REPLAY_FILE);
const corpusDir = fromRepoRoot(researchEnv.data.RESEARCH_CORPUS_DIR);
const recordDir =
  researchEnv.data.RESEARCH_RECORD_DIR === undefined
    ? undefined
    : fromRepoRoot(researchEnv.data.RESEARCH_RECORD_DIR);
const geminiTransport = aiConfigured
  ? createGeminiTransport({
      apiKey: AI_API_KEY,
      fetch: (url, init) => fetch(url, init),
      sleep: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    })
  : undefined;

let research: ResearchPort = defaultResearch;
let researchMode = 'standard';
if (replayFile !== undefined) {
  const replay = await loadRecordedResearch((path) => readFile(path, 'utf8'), replayFile);
  if (!replay.ok) {
    logger.fatal({ event: 'invalid_research_replay', code: replay.error.code });
    process.exit(1);
  }
  research = replay.value;
  researchMode = 'replay';
} else if (geminiTransport !== undefined) {
  const transport = geminiTransport;
  // An unreadable recordings directory is a configuration error: refused at start, with its cause.
  const loaded =
    recordDir === undefined
      ? undefined
      : await loadRecordings(recordDir).catch((cause: unknown) => {
          logger.fatal({ event: 'invalid_research_recordings', error: errorSummary(cause) });
          return process.exit(1);
        });
  for (const file of loaded?.rejected ?? []) {
    logger.warn({ event: 'research_recording_rejected', file });
  }
  const catalogue = loadFontCatalogue();
  research = aiResearch({
    run: (input) =>
      runResearch(
        {
          transport,
          visionModel: AI_MODEL,
          catalogue,
          readIndex: () => readCorpusIndex(corpusDir),
          recordings: loaded?.recordings ?? [],
          now: () => new Date().toISOString(),
        },
        input,
      ),
    ...(recordDir === undefined
      ? {}
      : { record: (recording) => writeRecording(recordDir, recording) }),
  });
  researchMode = 'live';
}
logger.info({ event: 'research_configuration', mode: researchMode });

// ADR-033: VECTORCRAFT_CLI, absolute path of vectorcraft-cli, and VECTORCRAFT_CLI_SHA256, the digest of that
// very executable, checked at every start: a binary replaced behind our back never runs. Unset or empty,
// .ai, EPS, PDF and SVG with live text are refused as before. A missing or mismatched binary stops the start.
const unsetIfEmpty = (value: unknown): unknown => (value === '' ? undefined : value);
const VectorEnv = z
  .object({
    VECTORCRAFT_CLI: z.preprocess(unsetIfEmpty, z.string().min(1).optional()),
    VECTORCRAFT_CLI_SHA256: z.preprocess(
      unsetIfEmpty,
      z
        .string()
        .regex(/^[0-9a-f]{64}$/iu)
        .optional(),
    ),
  })
  .refine(
    (vars) => vars.VECTORCRAFT_CLI === undefined || vars.VECTORCRAFT_CLI_SHA256 !== undefined,
  );
const vectorEnv = VectorEnv.safeParse(process.env);
if (!vectorEnv.success) {
  logger.fatal({ event: 'invalid_vector_environment' });
  process.exit(1);
}
const { VECTORCRAFT_CLI: vectorBinary, VECTORCRAFT_CLI_SHA256: vectorDigest } = vectorEnv.data;
if (vectorBinary !== undefined) {
  const digest = await sha256File(vectorBinary).catch(() => null);
  if (digest === null || digest !== vectorDigest?.toLowerCase()) {
    logger.fatal({ event: 'vector_converter_rejected', found: digest !== null });
    process.exit(1);
  }
}
const vectors =
  vectorBinary === undefined
    ? undefined
    : createVectorConverter({
        run: createVectorcraftRunner(vectorBinary),
        onFailure: ({ code, reason }) => {
          logger.warn({ event: 'vector_conversion_failed', code, reason });
        },
      });
logger.info({ event: 'vector_configuration', configured: vectors !== undefined });

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
  ...(vectors === undefined ? {} : { vectors }),
  vectorizer: createVtracer(),
  research,
  onResearchWarning: (entry: ResearchLogEntry) => {
    logger.warn({ event: 'research_warning', ...entry });
  },
  ...(geminiTransport !== undefined
    ? {
        ai: {
          model: AI_MODEL,
          transport: geminiTransport,
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
function stop(): void {
  shutdown().catch((cause: unknown) => {
    logger.fatal({ event: 'worker_shutdown_failed', error: errorSummary(cause) });
    process.exit(1);
  });
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);

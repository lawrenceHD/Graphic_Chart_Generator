import { z } from 'zod';

// ADR-005: job names and payloads shared by the web app (producer) and the worker (consumer). Payloads are
// validated on both sides: the queue is a boundary.
export interface JobPayloads {
  'asset.scan': { assetId: string };
  /** Dead letter of asset.scan: every attempt failed (infrastructure), the asset is rejected as timed out. */
  'asset.scan.failed': { assetId: string };
  /** Analysis of a project's logo (02_ARCHITECTURE.md §5.2); the run row carries its progress. */
  'project.analyze': { analysisId: string };
  /** Dead letter of project.analyze: every attempt failed, the run is marked failed for the user. */
  'project.analyze.failed': { analysisId: string };
  /** Hourly, scheduled by the worker (03_DATA_MODEL.md §6). */
  'maintenance.purge': Record<string, never>;
}
export type JobName = keyof JobPayloads;
export type JobPayload<N extends JobName> = JobPayloads[N];

// The mapped annotation keeps each schema's output equal to its declared payload, and lets generic code
// index the map without casts.
export const JOB_PAYLOADS: { readonly [N in JobName]: z.ZodType<JobPayloads[N]> } = {
  'asset.scan': z.object({ assetId: z.uuid() }).strict(),
  'asset.scan.failed': z.object({ assetId: z.uuid() }).strict(),
  'project.analyze': z.object({ analysisId: z.uuid() }).strict(),
  'project.analyze.failed': z.object({ analysisId: z.uuid() }).strict(),
  'maintenance.purge': z.object({}).strict(),
};

export interface JobQueue {
  /** Enqueues once per `singletonKey` while a job with that key is waiting (idempotent producers). */
  send<N extends JobName>(name: N, payload: JobPayload<N>, singletonKey: string): Promise<void>;
}

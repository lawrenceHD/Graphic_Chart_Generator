import { z } from 'zod';

// ADR-005: job names and payloads shared by the web app (producer) and the worker (consumer). Payloads are
// validated on both sides: the queue is a boundary.
export const JOB_PAYLOADS = {
  'asset.scan': z.object({ assetId: z.uuid() }).strict(),
} as const;

export type JobName = keyof typeof JOB_PAYLOADS;
export type JobPayload<N extends JobName> = z.infer<(typeof JOB_PAYLOADS)[N]>;

export interface JobQueue {
  /** Enqueues once per `singletonKey` while a job with that key is waiting (idempotent producers). */
  send<N extends JobName>(name: N, payload: JobPayload<N>, singletonKey: string): Promise<void>;
}

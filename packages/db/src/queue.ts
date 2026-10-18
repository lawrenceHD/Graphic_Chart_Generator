import { JOB_PAYLOADS, type JobName, type JobPayload, type JobQueue } from '@app/contracts';
import { PgBoss } from 'pg-boss';

// `@app/db/queue` — ADR-005: pg-boss in its own PostgreSQL schema. Jobs are idempotent and get 3 attempts
// with exponential backoff; `stately` + singletonKey keeps at most one waiting job per key, so a producer may
// safely send again (a retried HTTP request, for instance).
const QUEUE_OPTIONS = {
  policy: 'stately',
  retryLimit: 2,
  retryDelay: 5,
  retryBackoff: true,
  expireInSeconds: 300,
} as const;

// A job out of attempts is moved to its dead-letter queue, whose handler records the failure for the user.
const DEAD_LETTERS = new Map<string, string>([['asset.scan', 'asset.scan.failed']]);

export interface JobRunner extends JobQueue {
  /** Runs `handler` for each job; `attempt` counts from 0. A rejection fails the attempt (retried). */
  work<N extends JobName>(
    name: N,
    handler: (payload: JobPayload<N>, attempt: number) => Promise<void>,
  ): Promise<void>;
  /** Recurring job on a cron expression (UTC); scheduling again replaces the previous schedule. */
  schedule<N extends JobName>(name: N, cron: string, payload: JobPayload<N>): Promise<void>;
  stop(): Promise<void>;
}

/**
 * A producer (web) only sends; a worker also runs maintenance and the scheduler. Both create the queues,
 * which pg-boss does idempotently.
 */
export async function startJobQueue(
  connectionString: string,
  role: 'producer' | 'worker',
  onError: (error: Error) => void,
): Promise<JobRunner> {
  const worker = role === 'worker';
  const boss = new PgBoss({
    connectionString,
    supervise: worker,
    schedule: worker,
    max: worker ? 4 : 2,
  });
  boss.on('error', onError);
  await boss.start();
  const names = Object.keys(JOB_PAYLOADS);
  const targets = new Set(DEAD_LETTERS.values());
  // Dead-letter queues must exist before the queues that point to them.
  for (const name of [
    ...names.filter((n) => targets.has(n)),
    ...names.filter((n) => !targets.has(n)),
  ]) {
    const deadLetter = DEAD_LETTERS.get(name);
    const options = deadLetter === undefined ? QUEUE_OPTIONS : { ...QUEUE_OPTIONS, deadLetter };
    if ((await boss.getQueue(name)) === null) await boss.createQueue(name, options);
    else if (deadLetter !== undefined) await boss.updateQueue(name, { deadLetter });
  }

  const parse = <N extends JobName>(name: N, data: unknown): JobPayload<N> => {
    const parsed = JOB_PAYLOADS[name].safeParse(data);
    if (!parsed.success) throw new Error(`invalid ${name} payload`);
    return parsed.data;
  };

  return {
    async send(name, payload, singletonKey) {
      await boss.send(name, parse(name, payload), { singletonKey });
    },
    async work(name, handler) {
      await boss.work(name, { batchSize: 1 }, async (jobs) => {
        for (const job of jobs) await handler(parse(name, job.data), job.retryCount);
      });
    },
    async schedule(name, cron, payload) {
      await boss.schedule(name, cron, parse(name, payload), { tz: 'UTC' });
    },
    stop: () => boss.stop({ graceful: true, close: true }),
  };
}

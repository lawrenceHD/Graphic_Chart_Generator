import { randomBytes } from 'node:crypto';
import type { JobQueue } from '@app/contracts';
import { analysisRuns, and, assets, desc, eq, isNull, type createDatabase } from '@app/db';
import { uuidV7 } from '@app/kernel';
import { clientIp, problemResponse, tooManyRequests } from './http';
import type { RateLimiter } from './rate-limiter';
import { guardProject, type RouteDeps, type RouteParams } from './route-guard';

// POST /projects/:id/analyze (04_API_CONTRACTS.md §3, §7, §8; decision T-019 part 2). The run row is the
// resource: the same Idempotency-Key returns it again, and its id is the job's singleton key.
type Orm = ReturnType<typeof createDatabase>['orm'];
type RunRow = typeof analysisRuns.$inferSelect;

export interface AnalysisRouteDeps extends RouteDeps {
  readonly queue: JobQueue;
  readonly limiter: RateLimiter;
}

// 04_API_CONTRACTS.md §7: 5/h for a guest, 30/day for a (free) account; the same daily cap per IP.
const GUEST = { max: 5, windowMs: 3_600_000 };
const ACCOUNT = { max: 30, windowMs: 86_400_000 };
// Visible ASCII, as clients generate them (a UUID fits).
const IDEMPOTENCY_KEY = /^[\x21-\x7E]{1,255}$/;

type Context = { params: RouteParams };

const runJson = (run: RunRow, status: number): Response =>
  Response.json(
    { analysis: { id: run.id, status: run.status, step: run.step, errorCode: run.errorCode } },
    { status },
  );

async function findRun(orm: Orm, projectId: string, key: string): Promise<RunRow | undefined> {
  const [run] = await orm
    .select()
    .from(analysisRuns)
    .where(and(eq(analysisRuns.projectId, projectId), eq(analysisRuns.idempotencyKey, key)));
  return run;
}

async function latestCleanLogo(orm: Orm, projectId: string): Promise<string | undefined> {
  const [logo] = await orm
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.projectId, projectId),
        eq(assets.kind, 'logo_sanitized'),
        eq(assets.status, 'clean'),
        isNull(assets.deletedAt),
      ),
    )
    .orderBy(desc(assets.id));
  return logo?.id;
}

export function analysisHandlers(deps: AnalysisRouteDeps) {
  const enqueue = (run: RunRow) =>
    deps.queue.send('project.analyze', { analysisId: run.id }, run.id);

  return {
    async analyze(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:write');
      if (!guard.ok) return guard.error;
      const { actor, params } = guard.value;
      const key = request.headers.get('idempotency-key') ?? '';
      if (!IDEMPOTENCY_KEY.test(key))
        return problemResponse(request, 400, 'IDEMPOTENCY_KEY_INVALID', 'missing or malformed key');

      // A replay re-sends the job: harmless (singleton key), and it recovers a send lost after the insert.
      const known = await findRun(deps.orm, params.id, key);
      if (known) {
        if (known.status === 'pending') await enqueue(known);
        return runJson(known, 200);
      }
      const logoAssetId = await latestCleanLogo(deps.orm, params.id);
      if (logoAssetId === undefined)
        return problemResponse(request, 409, 'LOGO_NOT_READY', 'no clean logo to analyze');

      const identity =
        actor.kind === 'user'
          ? `user:${actor.userId}`
          : actor.kind === 'guest'
            ? `guest:${actor.guestSessionId}`
            : actor.kind;
      const wait = await deps.limiter.hit([
        { key: `analyze:${identity}`, limit: actor.kind === 'guest' ? GUEST : ACCOUNT },
        { key: `analyze-ip:${clientIp(request) ?? 'unknown'}`, limit: ACCOUNT },
      ]);
      if (wait > 0) return tooManyRequests(request, wait);

      // Two concurrent first calls with one key: the unique constraint keeps a single run for both.
      await deps.orm
        .insert(analysisRuns)
        .values({
          id: uuidV7(Date.now(), randomBytes(10)),
          projectId: params.id,
          logoAssetId,
          idempotencyKey: key,
        })
        .onConflictDoNothing({ target: [analysisRuns.projectId, analysisRuns.idempotencyKey] });
      const run = await findRun(deps.orm, params.id, key);
      if (!run) return problemResponse(request, 500, 'INTERNAL', 'analysis run not stored');
      await enqueue(run);
      return runJson(run, 202);
    },
  };
}

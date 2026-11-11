import { problemResponse, tooManyRequests } from './http';
import { buildInspirationQueries } from './inspiration/queries';
import { inspirationInputOf, type createInspirationCollector } from './inspiration-service';
import { getProject } from './project-service';
import type { RateLimiter } from './rate-limiter';
import { guardProject, type RouteDeps, type RouteParams } from './route-guard';

// GET /projects/:id/inspirations: inspirations from public sources for the brand of the project, asked by
// the person from the studio. Read access is enough: nothing is written, nothing is stored. Limited per
// person, so a loop of clicks never turns into a flood of calls to the source.
type Context = { params: RouteParams };
const LIMIT = { max: 10, windowMs: 60_000 };

export function inspirationHandlers(
  deps: RouteDeps & {
    readonly collect: ReturnType<typeof createInspirationCollector>;
    readonly limiter: RateLimiter;
  },
) {
  return {
    async list(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:read');
      if (!guard.ok) return guard.error;
      const { actor } = guard.value;
      const identity =
        actor.kind === 'user'
          ? `user:${actor.userId}`
          : actor.kind === 'guest'
            ? `guest:${actor.guestSessionId}`
            : actor.kind;
      const wait = await deps.limiter.hit([{ key: `inspirations:${identity}`, limit: LIMIT }]);
      if (wait > 0) return tooManyRequests(request, wait);
      const found = await getProject(deps.orm, guard.value.params.id);
      if (found === undefined)
        return problemResponse(request, 404, 'NOT_FOUND', 'no such resource');
      const input = inspirationInputOf(found.project.sceneCategory, found.document?.body ?? null);
      const collected = await deps.collect(buildInspirationQueries(input));
      if (!collected.ok)
        return problemResponse(request, 503, 'INSPIRATION_UNAVAILABLE', 'source unavailable');
      return Response.json({ items: collected.value }, { headers: { 'Cache-Control': 'private' } });
    },
  };
}

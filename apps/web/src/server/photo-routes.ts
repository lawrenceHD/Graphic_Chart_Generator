import { userText, type Actor } from '@app/contracts';
import { z } from 'zod';
import { problemResponse, readJson, tooManyRequests } from './http';
import { categoryOf, primaryOf, type createPhotoService } from './photos/photo-service';
import { getProject } from './project-service';
import type { RateLimiter } from './rate-limiter';
import { guardProject, type RouteDeps, type RouteParams } from './route-guard';

// GET /projects/:id/photos: six free photos for an application of the brand (U-03), from the person's word and
// the sector, closest to the brand's colour. POST /projects/:id/photos/chosen: the person picked one (Unsplash
// is told, as its guidelines ask). Nothing is stored; the keys never leave the server.
type Context = { params: RouteParams };
const LIMIT = { max: 20, windowMs: 60_000 };
const Query = z.object({
  q: userText(60).optional(),
  orientation: z.enum(['portrait', 'landscape', 'squarish']).default('portrait'),
});
const Chosen = z.object({ photoId: z.string().regex(/^(pexels|unsplash)-[\w-]{1,40}$/u) }).strict();

export function photoHandlers(
  deps: RouteDeps & {
    readonly photos: ReturnType<typeof createPhotoService>;
    readonly limiter: RateLimiter;
  },
) {
  const limited = async (request: Request, actorKey: string): Promise<Response | null> => {
    const wait = await deps.limiter.hit([{ key: `photos:${actorKey}`, limit: LIMIT }]);
    return wait > 0 ? tooManyRequests(request, wait) : null;
  };
  const keyOf = (actor: Actor): string =>
    actor.kind === 'user'
      ? `user:${actor.userId}`
      : actor.kind === 'guest'
        ? `guest:${actor.guestSessionId}`
        : actor.kind;

  return {
    async list(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:read');
      if (!guard.ok) return guard.error;
      const blocked = await limited(request, keyOf(guard.value.actor));
      if (blocked !== null) return blocked;
      const query = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      if (!query.success) return problemResponse(request, 400, 'VALIDATION_FAILED', 'bad query');
      const found = await getProject(deps.orm, guard.value.params.id);
      if (found === undefined)
        return problemResponse(request, 404, 'NOT_FOUND', 'no such resource');
      const photos = await deps.photos.candidates({
        category: categoryOf(found.project.sceneCategory),
        word: query.data.q ?? null,
        orientation: query.data.orientation,
        primary: primaryOf(found.document?.body ?? null),
      });
      if (!photos.ok)
        return problemResponse(
          request,
          503,
          photos.error,
          photos.error === 'PHOTOS_NOT_CONFIGURED' ? 'no photo key' : 'source unavailable',
        );
      return Response.json({ items: photos.value }, { headers: { 'Cache-Control': 'private' } });
    },

    async chosen(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:write');
      if (!guard.ok) return guard.error;
      const blocked = await limited(request, keyOf(guard.value.actor));
      if (blocked !== null) return blocked;
      const body = await readJson(request, Chosen);
      if (!body.ok) return body.error;
      return (await deps.photos.chosen(body.value.photoId))
        ? new Response(null, { status: 204 })
        : problemResponse(request, 404, 'NOT_FOUND', 'unknown photo');
    },
  };
}

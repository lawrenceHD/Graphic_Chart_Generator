import { authorize, userText } from '@app/contracts';
import { z } from 'zod';
import { authorizationResponse, problemResponse, readJson } from './http';
import {
  countGuestProjects,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  listRevisions,
  PAGE_LIMIT,
  updateProject,
  type ProjectRow,
} from './project-service';
import { authenticate, guardProject, type RouteDeps, type RouteParams } from './route-guard';

// 04_API_CONTRACTS.md §3 "Projets" and the revision history of "Document".
const CreateBody = z
  .object({
    title: userText(120, 1),
    industryLabel: userText(120).optional(),
    language: z.enum(['fr', 'en']).default('fr'),
    briefText: userText(8000).optional(),
  })
  .strict();
const PatchBody = z
  .object({ title: userText(120, 1).optional(), industryLabel: userText(120).optional() })
  .strict()
  .refine((body) => body.title !== undefined || body.industryLabel !== undefined, {
    message: 'empty patch',
  });
const ListQuery = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_LIMIT).default(20),
  q: userText(120, 1).optional(),
});
const RevisionQuery = z.object({
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_LIMIT).default(50),
});

/** Public shape: ownership columns (workspace, guest session) stay internal. */
const publicProject = (row: ProjectRow) => ({
  id: row.id,
  title: row.title,
  industryLabel: row.industryLabel,
  language: row.language,
  briefText: row.briefText,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

function query<T>(request: Request, schema: z.ZodType<T>): T | Response {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  return parsed.success
    ? parsed.data
    : problemResponse(request, 400, 'INVALID_QUERY', 'query does not match the contract');
}

type Context = { params: RouteParams };

export function projectHandlers(deps: RouteDeps) {
  return {
    async create(request: Request): Promise<Response> {
      const actor = await authenticate(deps, request);
      if (!actor.ok) return actor.error;
      const guestProjectCount =
        actor.value.kind === 'guest'
          ? await countGuestProjects(deps.orm, actor.value.guestSessionId)
          : 0;
      const denied = authorizationResponse(
        request,
        authorize(actor.value, 'project:create', { kind: 'none', guestProjectCount }),
      );
      if (denied) return denied;
      const body = await readJson(request, CreateBody);
      if (!body.ok) return body.error;
      const owner =
        actor.value.kind === 'guest'
          ? { kind: 'guest' as const, guestSessionId: actor.value.guestSessionId }
          : actor.value.kind === 'user'
            ? { kind: 'user' as const, userId: actor.value.userId }
            : null;
      if (owner === null)
        return problemResponse(request, 403, 'FORBIDDEN', 'action not allowed for this actor');
      return Response.json(
        { project: publicProject(await createProject(deps.orm, owner, body.value)) },
        { status: 201 },
      );
    },

    async list(request: Request): Promise<Response> {
      const actor = await authenticate(deps, request);
      if (!actor.ok) return actor.error;
      const options = query(request, ListQuery);
      if (options instanceof Response) return options;
      const page = await listProjects(deps.orm, actor.value, {
        cursor: options.cursor,
        limit: options.limit,
        query: options.q,
      });
      return Response.json({ items: page.items.map(publicProject), nextCursor: page.nextCursor });
    },

    async read(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:read');
      if (!guard.ok) return guard.error;
      const found = await getProject(deps.orm, guard.value.params.id);
      if (!found) return problemResponse(request, 404, 'NOT_FOUND', 'no such resource');
      return Response.json({ project: publicProject(found.project), document: found.document });
    },

    async update(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:write');
      if (!guard.ok) return guard.error;
      const body = await readJson(request, PatchBody);
      if (!body.ok) return body.error;
      const row = await updateProject(deps.orm, guard.value.params.id, body.value);
      return row
        ? Response.json({ project: publicProject(row) })
        : problemResponse(request, 404, 'NOT_FOUND', 'no such resource');
    },

    async remove(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:delete');
      if (!guard.ok) return guard.error;
      return (await deleteProject(deps.orm, guard.value.params.id))
        ? new Response(null, { status: 204 })
        : problemResponse(request, 404, 'NOT_FOUND', 'no such resource');
    },

    async revisions(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:read');
      if (!guard.ok) return guard.error;
      const options = query(request, RevisionQuery);
      if (options instanceof Response) return options;
      const page = await listRevisions(deps.orm, guard.value.params.id, options);
      return Response.json({
        items: page.items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
        nextCursor: page.nextCursor,
      });
    },
  };
}

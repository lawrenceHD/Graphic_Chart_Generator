import { authorize, type Action, type Actor } from '@app/contracts';
import type { createDatabase } from '@app/db';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import { authorizationResponse, checkOrigin, problemResponse } from './http';
import { findAsset, type AssetRow } from './asset-service';
import { projectResource } from './project-access';

// The fixed preamble of every project route (SEC-07): authentication, Origin on mutations (SEC-06),
// validated path parameters, then can() on the project. Callers hold no authorisation logic.
type Orm = ReturnType<typeof createDatabase>['orm'];

export interface RouteDeps {
  readonly orm: Orm;
  readonly appUrl: string;
  readonly resolveActor: (request: Request) => Promise<Actor | null>;
}
export type RouteParams = Promise<Record<string, string | string[] | undefined>>;

const ProjectParams = z.object({
  id: z.uuid(),
  seq: z.coerce.number().int().positive().optional(),
});
export type ProjectParams = z.infer<typeof ProjectParams>;

/** Authenticated actor, with the Origin check for mutations. */
export async function authenticate(
  deps: RouteDeps,
  request: Request,
): Promise<Result<Actor, Response>> {
  const actor = await deps.resolveActor(request);
  if (actor === null)
    return err(problemResponse(request, 401, 'UNAUTHENTICATED', 'sign in required'));
  if (request.method !== 'GET') {
    const rejected = checkOrigin(request, deps.appUrl);
    if (rejected) return err(rejected);
  }
  return ok(actor);
}

/** Actor allowed to perform `action` on the project named by the path, or the 401/403/404 response. */
export async function guardProject(
  deps: RouteDeps,
  request: Request,
  params: RouteParams,
  action: Action,
): Promise<Result<{ actor: Actor; params: ProjectParams }, Response>> {
  const actor = await authenticate(deps, request);
  if (!actor.ok) return actor;
  const parsed = ProjectParams.safeParse(await params);
  if (!parsed.success) return err(problemResponse(request, 404, 'NOT_FOUND', 'no such resource'));
  const resource = await projectResource(deps.orm, parsed.data.id, actor.value);
  const denied = authorizationResponse(request, authorize(actor.value, action, resource));
  return denied ? err(denied) : ok({ actor: actor.value, params: parsed.data });
}

const AssetParams = z.object({ id: z.uuid() });

/** Actor allowed to perform `action` on the asset named by the path: assets inherit their project's access. */
export async function guardAsset(
  deps: RouteDeps,
  request: Request,
  params: RouteParams,
  action: Action,
): Promise<Result<{ actor: Actor; asset: AssetRow }, Response>> {
  const actor = await authenticate(deps, request);
  if (!actor.ok) return actor;
  const parsed = AssetParams.safeParse(await params);
  const asset = parsed.success ? await findAsset(deps.orm, parsed.data.id) : undefined;
  // A missing asset answers exactly like a foreign one (SEC-08).
  if (!asset) return err(problemResponse(request, 404, 'NOT_FOUND', 'no such resource'));
  const resource = await projectResource(deps.orm, asset.projectId, actor.value);
  const denied = authorizationResponse(request, authorize(actor.value, action, resource));
  return denied ? err(denied) : ok({ actor: actor.value, asset });
}

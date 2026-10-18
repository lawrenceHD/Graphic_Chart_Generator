import type { Actor } from '@app/contracts';
import { getDatabase } from '../lib/database';
import { getRuntimeEnv } from '../lib/runtime-env';
import { actorFromSession, createAuth, type Auth } from './auth';
import { documentHandlers } from './document-routes';
import { projectHandlers } from './project-routes';

// Built on first use, never at import time: `next build` must not need the runtime environment.
let auth: Auth | undefined;
let handlers: ReturnType<typeof documentHandlers> | undefined;
let projectRoutes: ReturnType<typeof projectHandlers> | undefined;

export function getAuth(): Auth {
  auth ??= createAuth(getDatabase().orm, getRuntimeEnv());
  return auth;
}

/** The can() actor of a request: a Better Auth session (guest sessions arrive with T-017). */
export async function resolveActor(request: Request): Promise<Actor | null> {
  return actorFromSession(await getAuth().api.getSession({ headers: request.headers }));
}

export function getDocumentHandlers(): ReturnType<typeof documentHandlers> {
  handlers ??= documentHandlers({
    orm: getDatabase().orm,
    appUrl: getRuntimeEnv().APP_URL,
    resolveActor,
  });
  return handlers;
}

export function getProjectHandlers(): ReturnType<typeof projectHandlers> {
  projectRoutes ??= projectHandlers({
    orm: getDatabase().orm,
    appUrl: getRuntimeEnv().APP_URL,
    resolveActor,
  });
  return projectRoutes;
}

import type { Actor } from '@app/contracts';
import { getDatabase } from '../lib/database';
import { getRuntimeEnv } from '../lib/runtime-env';
import { actorFromSession, createAuth, type Auth } from './auth';
import { documentHandlers } from './document-routes';
import { guestActorFromCookie } from './guest-service';
import { guestCookieOf, guestHandlers } from './guest-routes';
import { createTurnstileVerifier } from './turnstile';
import { projectHandlers } from './project-routes';

// Built on first use, never at import time: `next build` must not need the runtime environment.
let auth: Auth | undefined;
let handlers: ReturnType<typeof documentHandlers> | undefined;
let projectRoutes: ReturnType<typeof projectHandlers> | undefined;

export function getAuth(): Auth {
  auth ??= createAuth(getDatabase().orm, getRuntimeEnv());
  return auth;
}

/** The can() actor of a request: an account session first, otherwise a valid guest session cookie. */
export async function resolveActor(request: Request): Promise<Actor | null> {
  const account = actorFromSession(await getAuth().api.getSession({ headers: request.headers }));
  if (account) return account;
  const cookie = guestCookieOf(request);
  return cookie === undefined
    ? null
    : guestActorFromCookie(getDatabase().orm, cookie, getRuntimeEnv().AUTH_SECRET, new Date());
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

let guestRoutes: ReturnType<typeof guestHandlers> | undefined;

export function getGuestHandlers(): ReturnType<typeof guestHandlers> {
  const env = getRuntimeEnv();
  guestRoutes ??= guestHandlers({
    orm: getDatabase().orm,
    appUrl: env.APP_URL,
    resolveActor,
    // The HMAC label in guest-token.ts separates this use of AUTH_SECRET from Better Auth's.
    guestSecret: env.AUTH_SECRET,
    verifyTurnstile: createTurnstileVerifier(env.TURNSTILE_SECRET),
    now: () => new Date(),
  });
  return guestRoutes;
}

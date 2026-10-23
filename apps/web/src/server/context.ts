import type { Actor, JobQueue } from '@app/contracts';
import { listenProjectEvents } from '@app/db';
import { startJobQueue, type JobRunner } from '@app/db/queue';
import { createR2Storage } from '@app/storage';
import { errorSummary } from '../lib/error-summary';
import { appLogger } from '../logger';
import { getDatabase } from '../lib/database';
import { getRuntimeEnv } from '../lib/runtime-env';
import { analysisHandlers } from './analysis-routes';
import { assetHandlers } from './asset-routes';
import { actorFromSession, createAuth, type Auth } from './auth';
import { documentHandlers } from './document-routes';
import { createProjectEventHub, type ProjectEventHub } from './event-hub';
import { eventHandlers } from './event-routes';
import { guestActorFromCookie } from './guest-service';
import { createLoginThrottle, type LoginThrottle } from './login-throttle';
import { guestCookieOf, guestHandlers } from './guest-routes';
import { createTurnstileVerifier } from './turnstile';
import { projectHandlers } from './project-routes';
import { createRateLimiter, type RateLimiter } from './rate-limiter';

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
    limiter: getRateLimiter(),
  });
  return guestRoutes;
}

let rateLimiter: RateLimiter | undefined;

function getRateLimiter(): RateLimiter {
  rateLimiter ??= createRateLimiter(getDatabase().orm, () => new Date());
  return rateLimiter;
}

let loginThrottle: LoginThrottle | undefined;

export function getLoginThrottle(): LoginThrottle {
  loginThrottle ??= createLoginThrottle(getDatabase().orm, () => new Date());
  return loginThrottle;
}

// The pg-boss producer starts on the first enqueue, not at import time (same reason as above).
let queue: Promise<JobRunner> | undefined;
const lazyQueue: JobQueue = {
  async send(name, payload, singletonKey) {
    queue ??= startJobQueue(getRuntimeEnv().DATABASE_URL, 'producer', (error) => {
      appLogger().error({ event: 'job_queue_error', error: errorSummary(error) });
    });
    await (await queue).send(name, payload, singletonKey);
  },
};
let assetRoutes: ReturnType<typeof assetHandlers> | undefined;
let analysisRoutes: ReturnType<typeof analysisHandlers> | undefined;

export function getAnalysisHandlers(): ReturnType<typeof analysisHandlers> {
  analysisRoutes ??= analysisHandlers({
    orm: getDatabase().orm,
    appUrl: getRuntimeEnv().APP_URL,
    resolveActor,
    queue: lazyQueue,
    limiter: getRateLimiter(),
  });
  return analysisRoutes;
}

export function getAssetHandlers(): ReturnType<typeof assetHandlers> {
  const env = getRuntimeEnv();
  assetRoutes ??= assetHandlers({
    orm: getDatabase().orm,
    appUrl: env.APP_URL,
    resolveActor,
    storage: createR2Storage(
      {
        accountId: env.R2_ACCOUNT_ID,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        bucket: env.R2_BUCKET,
      },
      () => new Date(),
    ),
    queue: lazyQueue,
    limiter: getRateLimiter(),
  });
  return assetRoutes;
}

// One LISTEN connection per process, opened by the first stream (event-hub.ts).
let eventHub: ProjectEventHub | undefined;
let eventRoutes: ReturnType<typeof eventHandlers> | undefined;

export function getEventHandlers(): ReturnType<typeof eventHandlers> {
  const logError = (event: string) => (error: unknown) => {
    appLogger().error({ event, error: errorSummary(error) });
  };
  eventHub ??= createProjectEventHub(
    (handlers) => listenProjectEvents(getRuntimeEnv().DATABASE_URL, handlers),
    logError('project_events_listener_error'),
  );
  eventRoutes ??= eventHandlers({
    orm: getDatabase().orm,
    appUrl: getRuntimeEnv().APP_URL,
    resolveActor,
    hub: eventHub,
    onError: logError('project_events_stream_error'),
  });
  return eventRoutes;
}

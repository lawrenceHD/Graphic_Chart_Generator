import type { Actor, JobQueue } from '@app/contracts';
import { listenProjectEvents } from '@app/db';
import { startJobQueue, type JobRunner } from '@app/db/queue';
import { createR2Storage } from '@app/storage';
import { errorSummary } from '../lib/error-summary';
import { appLogger } from '../logger';
import { getDatabase } from '../lib/database';
import { getRuntimeEnv } from '../lib/runtime-env';
import { analysisHandlers } from './analysis-routes';
import { accountHandlers } from './account-routes';
import { assetHandlers } from './asset-routes';
import { actorFromSession, createAuth, type Auth } from './auth';
import { documentHandlers } from './document-routes';
import { createProjectEventHub, type ProjectEventHub } from './event-hub';
import { eventHandlers } from './event-routes';
import { guestActorFromCookie } from './guest-service';
import { createLoginThrottle, type LoginThrottle } from './login-throttle';
import { guestCookieOf, guestHandlers } from './guest-routes';
import { parseTrustedProxyHops } from './client-ip';
import { signupVerifier, type SignupGuardDeps } from './signup-guard';
import { createTurnstileVerifier } from './turnstile';
import { projectHandlers } from './project-routes';
import { searchArena } from './inspiration/arena';
import { inspirationHandlers } from './inspiration-routes';
import { createInspirationCollector } from './inspiration-service';
import { createRateLimiter, type RateLimiter } from './rate-limiter';

// Built on first use, never at import time: `next build` must not need the runtime environment.
let auth: Auth | undefined;
let handlers: ReturnType<typeof documentHandlers> | undefined;
let projectRoutes: ReturnType<typeof projectHandlers> | undefined;

/** TRUSTED_PROXY_HOPS (client-ip.ts); validated on first use, absent means 0. */
export function getTrustedProxyHops(): number {
  return parseTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS);
}

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
    trustedProxyHops: getTrustedProxyHops(),
  });
  return handlers;
}

export function getProjectHandlers(): ReturnType<typeof projectHandlers> {
  projectRoutes ??= projectHandlers({
    orm: getDatabase().orm,
    appUrl: getRuntimeEnv().APP_URL,
    resolveActor,
    trustedProxyHops: getTrustedProxyHops(),
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
    trustedProxyHops: getTrustedProxyHops(),
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

/**
 * Sign-up anti-bot dependencies. TURNSTILE_SECRET is required by the environment schema, so a missing secret stops
 * the application at startup; a dummy Cloudflare secret on https closes sign-up (503) instead of opening it.
 */
export function getSignupGuardDeps(): SignupGuardDeps {
  const env = getRuntimeEnv();
  return {
    verify: signupVerifier(env.TURNSTILE_SECRET, env.APP_URL, createTurnstileVerifier),
    limiter: getRateLimiter(),
    trustedProxyHops: getTrustedProxyHops(),
  };
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
    trustedProxyHops: getTrustedProxyHops(),
    queue: lazyQueue,
    limiter: getRateLimiter(),
  });
  return analysisRoutes;
}

function newStorage() {
  const env = getRuntimeEnv();
  return createR2Storage(
    {
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
      ...(env.R2_ENDPOINT === undefined ? {} : { endpoint: env.R2_ENDPOINT }),
    },
    () => new Date(),
  );
}

let accountRoutes: ReturnType<typeof accountHandlers> | undefined;

export function getAccountHandlers(): ReturnType<typeof accountHandlers> {
  accountRoutes ??= accountHandlers({
    orm: getDatabase().orm,
    appUrl: getRuntimeEnv().APP_URL,
    resolveActor,
    trustedProxyHops: getTrustedProxyHops(),
    storage: newStorage(),
    limiter: getRateLimiter(),
    // Counts only: no identifier, e-mail or project content.
    onErased: (summary) => {
      appLogger().info({ event: 'account_erased', files: summary.files });
    },
    // Summary only: no e-mail, no project content.
    onError: (error) => {
      appLogger().error({ event: 'account_erasure_storage_error', error: errorSummary(error) });
    },
  });
  return accountRoutes;
}

export function getAssetHandlers(): ReturnType<typeof assetHandlers> {
  const env = getRuntimeEnv();
  assetRoutes ??= assetHandlers({
    orm: getDatabase().orm,
    appUrl: env.APP_URL,
    resolveActor,
    trustedProxyHops: getTrustedProxyHops(),
    storage: newStorage(),
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
    trustedProxyHops: getTrustedProxyHops(),
    hub: eventHub,
    onError: logError('project_events_stream_error'),
  });
  return eventRoutes;
}

let inspirationRoutes: ReturnType<typeof inspirationHandlers> | undefined;

/** Inspirations from Are.na (public API, no key), one hour of memory per search (inspiration-service.ts). */
export function getInspirationHandlers(): ReturnType<typeof inspirationHandlers> {
  inspirationRoutes ??= inspirationHandlers({
    orm: getDatabase().orm,
    appUrl: getRuntimeEnv().APP_URL,
    resolveActor,
    trustedProxyHops: getTrustedProxyHops(),
    limiter: getRateLimiter(),
    collect: createInspirationCollector({
      search: (query) => searchArena({ fetch: (url, init) => fetch(url, init) }, query),
      now: () => Date.now(),
    }),
  });
  return inspirationRoutes;
}

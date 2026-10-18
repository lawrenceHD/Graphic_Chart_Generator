import { authorize } from '@app/contracts';
import { z } from 'zod';
import {
  claimGuestSession,
  createGuestSession,
  GUEST_SESSION_HOURS,
  guestActorFromCookie,
} from './guest-service';
import { authorizationResponse, checkOrigin, problemResponse, readJson } from './http';
import { authenticate, type RouteDeps } from './route-guard';
import type { TurnstileVerifier } from './turnstile';

// 04_API_CONTRACTS.md §3 "Session et compte": POST /guest-sessions, POST /guest-sessions/claim.
export const GUEST_COOKIE = 'atelier_guest';

export interface GuestRouteDeps extends RouteDeps {
  readonly guestSecret: string;
  readonly verifyTurnstile: TurnstileVerifier;
  readonly now: () => Date;
}

const CreateBody = z.object({ turnstileToken: z.string().min(1).max(2048) }).strict();

/** Value of the guest cookie in a request, if any. */
export function guestCookieOf(request: Request): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === GUEST_COOKIE) return value.join('=');
  }
  return undefined;
}

function cookieHeader(value: string, maxAgeSeconds: number, appUrl: string): string {
  const secure = appUrl.startsWith('https://') ? '; Secure' : '';
  return `${GUEST_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${String(maxAgeSeconds)}${secure}`;
}

export function guestHandlers(deps: GuestRouteDeps) {
  return {
    /** Public by nature: it creates the identity. Guarded by Origin (SEC-06) and Turnstile instead of can(). */
    async create(request: Request): Promise<Response> {
      const rejected = checkOrigin(request, deps.appUrl);
      if (rejected) return rejected;
      const body = await readJson(request, CreateBody);
      if (!body.ok) return body.error;
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
      if (!(await deps.verifyTurnstile(body.value.turnstileToken, ip))) {
        return problemResponse(request, 403, 'TURNSTILE_FAILED', 'anti-bot check failed');
      }
      const session = await createGuestSession(deps.orm, deps.guestSecret, deps.now());
      return Response.json(
        { expiresAt: session.expiresAt.toISOString() },
        {
          status: 201,
          headers: {
            'set-cookie': cookieHeader(
              session.cookieValue,
              GUEST_SESSION_HOURS * 3600,
              deps.appUrl,
            ),
          },
        },
      );
    },

    async claim(request: Request): Promise<Response> {
      const actor = await authenticate(deps, request);
      if (!actor.ok) return actor.error;
      const denied = authorizationResponse(
        request,
        authorize(actor.value, 'guest:claim', { kind: 'none' }),
      );
      if (denied) return denied;
      if (actor.value.kind !== 'user')
        return problemResponse(request, 403, 'FORBIDDEN', 'account required');
      const cookie = guestCookieOf(request);
      const guest =
        cookie === undefined
          ? null
          : await guestActorFromCookie(deps.orm, cookie, deps.guestSecret, deps.now());
      const claimed =
        guest?.kind === 'guest'
          ? await claimGuestSession(deps.orm, guest.guestSessionId, actor.value.userId)
          : 0;
      return Response.json(
        { claimed },
        { headers: { 'set-cookie': cookieHeader('', 0, deps.appUrl) } },
      );
    },
  };
}

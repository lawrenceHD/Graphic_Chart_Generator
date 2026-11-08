import type { ObjectStorage } from '@app/contracts';
import { authorize } from '@app/contracts';
import { z } from 'zod';
import { verifyPassword } from '../lib/password';
import { eraseAccountRows, passwordHashOf, storageKeysOf, userExists } from './account-service';
import { authorizationResponse, problemResponse, readJson, tooManyRequests } from './http';
import type { RateLimiter } from './rate-limiter';
import { authenticate, type RouteDeps } from './route-guard';

// DELETE /api/v1/account (04_API_CONTRACTS.md §3, AC-13.3). The target is always the caller: no identifier is
// accepted. The password re-confirms the intent against a stolen session.
export interface AccountRouteDeps extends RouteDeps {
  readonly storage: ObjectStorage;
  readonly limiter: RateLimiter;
  /** Receives unexpected failures; the caller logs them without personal data. */
  readonly onError: (error: unknown) => void;
}

const Confirmation = z.object({ password: z.string().min(1).max(128) }).strict();
const ATTEMPTS = { max: 3, windowMs: 3_600_000 };
const SESSION_COOKIES = ['better-auth.session_token', '__Secure-better-auth.session_token'];

export function accountHandlers(deps: AccountRouteDeps) {
  return {
    async remove(request: Request): Promise<Response> {
      const actor = await authenticate(deps, request);
      if (!actor.ok) return actor.error;
      const denied = authorizationResponse(
        request,
        authorize(actor.value, 'account:delete', { kind: 'none' }),
      );
      if (denied) return denied;
      if (actor.value.kind !== 'user')
        return problemResponse(request, 403, 'FORBIDDEN', 'account required');
      const { userId } = actor.value;
      const body = await readJson(request, Confirmation);
      if (!body.ok) return body.error;

      // Already erased (a retry): nothing left to do, nothing to reveal.
      if (!(await userExists(deps.orm, userId))) return gone();
      const wait = await deps.limiter.hit([{ key: `account-delete:${userId}`, limit: ATTEMPTS }]);
      if (wait > 0) return tooManyRequests(request, wait);
      const hash = await passwordHashOf(deps.orm, userId);
      if (hash === null || !(await verifyPassword({ hash, password: body.value.password }))) {
        return problemResponse(request, 403, 'CONFIRMATION_FAILED', 'confirmation refused');
      }

      // Files first, rows second: a storage failure leaves everything in place and the call can be repeated.
      try {
        for (const key of await storageKeysOf(deps.orm, userId)) await deps.storage.delete(key);
      } catch (error) {
        deps.onError(error);
        return problemResponse(request, 503, 'STORAGE_UNAVAILABLE', 'try again later');
      }
      await eraseAccountRows(deps.orm, userId);
      return gone();
    },
  };
}

function gone(): Response {
  const headers = new Headers();
  for (const name of SESSION_COOKIES) headers.append('set-cookie', `${name}=; Path=/; Max-Age=0`);
  return new Response(null, { status: 204, headers });
}

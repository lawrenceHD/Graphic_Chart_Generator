import { createHash, randomBytes } from 'node:crypto';
import { eq, rateLimit, sql, type createDatabase } from '@app/db';
import { uuidV7 } from '@app/kernel';
import { z } from 'zod';

// SEC-05, per account: 5 failed sign-ins in 15 minutes lock the account for the rest of the window, on top of
// Better Auth's per-IP limit. Keys hold a hash of the e-mail, never the address itself.
type Orm = ReturnType<typeof createDatabase>['orm'];
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

const keyOf = (email: string): string =>
  `account-sign-in:${createHash('sha256').update(email.trim().toLowerCase()).digest('hex')}`;

export function createLoginThrottle(orm: Orm, now: () => Date) {
  return {
    /** Seconds until the account may try again, or 0. */
    async retryAfter(email: string): Promise<number> {
      const [row] = await orm
        .select()
        .from(rateLimit)
        .where(eq(rateLimit.key, keyOf(email)));
      if (!row || row.count < MAX_FAILURES) return 0;
      const remaining = row.lastRequest + WINDOW_MS - now().getTime();
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
    },

    async recordFailure(email: string): Promise<void> {
      const at = now().getTime();
      // A failure after a quiet window restarts the count at 1.
      await orm
        .insert(rateLimit)
        .values({ id: uuidV7(at, randomBytes(10)), key: keyOf(email), count: 1, lastRequest: at })
        .onConflictDoUpdate({
          target: rateLimit.key,
          set: {
            count: sql`CASE WHEN ${at} - ${rateLimit.lastRequest} > ${WINDOW_MS} THEN 1 ELSE ${rateLimit.count} + 1 END`,
            lastRequest: at,
          },
        });
    },

    async reset(email: string): Promise<void> {
      await orm.delete(rateLimit).where(eq(rateLimit.key, keyOf(email)));
    },
  };
}
export type LoginThrottle = ReturnType<typeof createLoginThrottle>;

const SignInBody = z.object({ email: z.string().min(1).max(320) }).loose();

/** Wraps the Better Auth handler of POST /sign-in/email with the per-account limit. */
export function throttledSignIn(
  handler: (request: Request) => Promise<Response>,
  throttle: LoginThrottle,
) {
  return async (request: Request): Promise<Response> => {
    let email: string | undefined;
    try {
      const parsed = SignInBody.safeParse(await request.clone().json());
      email = parsed.success ? parsed.data.email : undefined;
    } catch {
      email = undefined; // malformed body: Better Auth rejects it itself
    }
    if (email === undefined) return handler(request);
    const wait = await throttle.retryAfter(email);
    if (wait > 0) {
      // Same answer whether the account exists or not.
      return Response.json(
        { code: 'TOO_MANY_ATTEMPTS', status: 429 },
        { status: 429, headers: { 'retry-after': String(wait) } },
      );
    }
    const response = await handler(request);
    if (response.status === 200) await throttle.reset(email);
    else if (response.status === 401) await throttle.recordFailure(email);
    return response;
  };
}

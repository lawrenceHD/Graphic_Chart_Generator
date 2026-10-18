import { createHash, randomBytes } from 'node:crypto';
import { rateLimit, sql, type createDatabase } from '@app/db';
import { uuidV7 } from '@app/kernel';

// 04_API_CONTRACTS.md §7 / SEC-24: fixed-window limits in the `rate_limit` table, shared by every instance and
// kept across restarts. Keys are hashed: identities and IP addresses are not stored in clear.
type Orm = ReturnType<typeof createDatabase>['orm'];

export interface Limit {
  readonly max: number;
  readonly windowMs: number;
}

export interface LimitedKey {
  readonly key: string;
  readonly limit: Limit;
}

const hashed = (key: string): string => `api:${createHash('sha256').update(key).digest('hex')}`;

export function createRateLimiter(orm: Orm, now: () => Date) {
  return {
    /** Counts one hit on every key; seconds to wait when any key is over its limit, otherwise 0. */
    async hit(keys: readonly LimitedKey[]): Promise<number> {
      const at = now().getTime();
      let wait = 0;
      for (const { key, limit } of keys) {
        // One atomic statement per key: concurrent hits cannot both see the old count.
        const expired = sql`${at} - ${rateLimit.lastRequest} >= ${limit.windowMs}`;
        const [row] = await orm
          .insert(rateLimit)
          .values({ id: uuidV7(at, randomBytes(10)), key: hashed(key), count: 1, lastRequest: at })
          .onConflictDoUpdate({
            target: rateLimit.key,
            set: {
              count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimit.count} + 1 END`,
              lastRequest: sql`CASE WHEN ${expired} THEN ${at} ELSE ${rateLimit.lastRequest} END`,
            },
          })
          .returning({ count: rateLimit.count, windowStart: rateLimit.lastRequest });
        if (row && row.count > limit.max) {
          wait = Math.max(wait, Math.ceil((row.windowStart + limit.windowMs - at) / 1000));
        }
      }
      return wait;
    },
  };
}
export type RateLimiter = ReturnType<typeof createRateLimiter>;

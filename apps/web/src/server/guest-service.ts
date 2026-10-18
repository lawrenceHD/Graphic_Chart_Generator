import { randomBytes } from 'node:crypto';
import type { Actor } from '@app/contracts';
import { and, eq, guestSessions, isNull, projects, sql, type createDatabase } from '@app/db';
import { uuidV7 } from '@app/kernel';
import { hashToken, newGuestToken, readGuestCookie } from './guest-token';
import { personalWorkspace } from './project-service';

// Guest sessions (SEC-10, 01_PRODUCT_MVP.md §3): 24 h, one project, claimable by an account.
type Orm = ReturnType<typeof createDatabase>['orm'];
export const GUEST_SESSION_HOURS = 24;

export async function createGuestSession(
  orm: Orm,
  secret: string,
  now: Date,
): Promise<{ cookieValue: string; expiresAt: Date }> {
  const { token, cookieValue } = newGuestToken(secret);
  const expiresAt = new Date(now.getTime() + GUEST_SESSION_HOURS * 3_600_000);
  await orm.insert(guestSessions).values({
    id: uuidV7(now.getTime(), randomBytes(10)),
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt,
  });
  return { cookieValue, expiresAt };
}

/** Guest actor of a signed, unexpired, unclaimed session cookie; null otherwise. */
export async function guestActorFromCookie(
  orm: Orm,
  cookieValue: string,
  secret: string,
  now: Date,
): Promise<Actor | null> {
  const token = readGuestCookie(cookieValue, secret);
  if (token === undefined) return null;
  const [row] = await orm
    .select({ id: guestSessions.id })
    .from(guestSessions)
    .where(
      and(
        eq(guestSessions.tokenHash, hashToken(token)),
        sql`${guestSessions.expiresAt} > ${now}`,
        isNull(guestSessions.claimedByUserId),
      ),
    );
  return row ? { kind: 'guest', guestSessionId: row.id } : null;
}

/** Moves the guest's projects into the user's personal workspace and closes the guest session. */
export function claimGuestSession(
  orm: Orm,
  guestSessionId: string,
  userId: string,
): Promise<number> {
  return orm.transaction(async (tx) => {
    const workspaceId = await personalWorkspace(tx, userId);
    const moved = await tx
      .update(projects)
      .set({ workspaceId, guestSessionId: null, updatedAt: new Date() })
      .where(and(eq(projects.guestSessionId, guestSessionId), isNull(projects.deletedAt)))
      .returning({ id: projects.id });
    await tx
      .update(guestSessions)
      .set({ claimedByUserId: userId })
      .where(eq(guestSessions.id, guestSessionId));
    return moved.length;
  });
}

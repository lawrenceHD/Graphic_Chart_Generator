import type { ObjectStorage } from '@app/contracts';
import {
  and,
  assets,
  chatMessages,
  documents,
  eq,
  exports,
  guestSessions,
  isNotNull,
  isNull,
  lte,
  projects,
  revisions,
  shareLinks,
  sql,
  usageEvents,
  type createDatabase,
} from '@app/db';

// Hourly purge (03_DATA_MODEL.md §6, AC-01.2): guest projects expire at 24 h; deleted projects lose their rows
// and stored files. Each project is removed files first, rows second, so an interrupted run is simply resumed
// by the next one. Bounded per run to keep the job short.
type Orm = ReturnType<typeof createDatabase>['orm'];

export interface PurgeDeps {
  readonly orm: Orm;
  readonly storage: ObjectStorage;
  readonly now: () => Date;
}

export interface PurgeReport {
  readonly expiredGuestProjects: number;
  readonly purgedProjects: number;
  readonly purgedGuestSessions: number;
}

const PROJECTS_PER_RUN = 200;

async function purgeProject(deps: PurgeDeps, projectId: string): Promise<void> {
  const stored = await deps.orm
    .select({ key: assets.storageKey })
    .from(assets)
    .where(eq(assets.projectId, projectId));
  for (const { key } of stored) await deps.storage.delete(key);
  await deps.orm.transaction(async (tx) => {
    // Children before parents (foreign keys); exports reference assets.
    await tx.delete(shareLinks).where(eq(shareLinks.projectId, projectId));
    await tx.delete(exports).where(eq(exports.projectId, projectId));
    await tx.delete(chatMessages).where(eq(chatMessages.projectId, projectId));
    await tx.delete(revisions).where(eq(revisions.projectId, projectId));
    await tx.delete(documents).where(eq(documents.projectId, projectId));
    await tx.delete(assets).where(eq(assets.projectId, projectId));
    await tx.delete(projects).where(eq(projects.id, projectId));
  });
}

export async function purge(deps: PurgeDeps): Promise<PurgeReport> {
  const { orm } = deps;
  const now = deps.now();
  const expiredSessions = sql`SELECT ${guestSessions.id} FROM ${guestSessions} WHERE ${guestSessions.expiresAt} <= ${now} AND ${guestSessions.claimedByUserId} IS NULL`;
  const expired = await orm
    .update(projects)
    .set({ deletedAt: now })
    .where(and(isNull(projects.deletedAt), sql`${projects.guestSessionId} IN (${expiredSessions})`))
    .returning({ id: projects.id });

  const doomed = await orm
    .select({ id: projects.id })
    .from(projects)
    .where(and(isNotNull(projects.deletedAt), lte(projects.deletedAt, now)))
    .limit(PROJECTS_PER_RUN);
  for (const { id } of doomed) await purgeProject(deps, id);

  // A session row outlives its projects only while cost accounting (usage_events, 13 months) refers to it.
  const sessions = await orm
    .delete(guestSessions)
    .where(
      and(
        lte(guestSessions.expiresAt, now),
        sql`NOT EXISTS (SELECT 1 FROM ${projects} WHERE ${projects.guestSessionId} = ${guestSessions.id})`,
        sql`NOT EXISTS (SELECT 1 FROM ${usageEvents} WHERE ${usageEvents.guestSessionId} = ${guestSessions.id})`,
      ),
    )
    .returning({ id: guestSessions.id });

  return {
    expiredGuestProjects: expired.length,
    purgedProjects: doomed.length,
    purgedGuestSessions: sessions.length,
  };
}

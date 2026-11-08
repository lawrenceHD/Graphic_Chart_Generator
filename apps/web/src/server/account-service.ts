import {
  account,
  analysisRuns,
  and,
  assets,
  chatMessages,
  documents,
  eq,
  exports,
  guestSessions,
  inArray,
  projectEvents,
  projects,
  revisions,
  session,
  shareLinks,
  sql,
  usageEvents,
  user,
  verification,
  workspaceMembers,
  workspaces,
  type createDatabase,
} from '@app/db';

// Account erasure (AC-13.3). The application tables hold no ON DELETE CASCADE, so rows go children first.
// Only workspaces the user owns are erased (the MVP has a single personal workspace per user).
type Orm = ReturnType<typeof createDatabase>['orm'];

const ownedProjects = (userId: string) =>
  sql`SELECT ${projects.id} FROM ${projects} WHERE ${projects.workspaceId} IN (SELECT ${workspaces.id} FROM ${workspaces} WHERE ${workspaces.ownerUserId} = ${userId})`;

/** Stored objects of every asset of the user's projects, deleted ones included. */
export async function storageKeysOf(orm: Orm, userId: string): Promise<string[]> {
  const rows = await orm
    .select({ key: assets.storageKey })
    .from(assets)
    .where(sql`${assets.projectId} IN (${ownedProjects(userId)})`);
  return rows.map((row) => row.key);
}

/** Hash of the credential password, or null when the user (or a password) does not exist. */
export async function passwordHashOf(orm: Orm, userId: string): Promise<string | null> {
  const [row] = await orm
    .select({ hash: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
  return row?.hash ?? null;
}

export async function userExists(orm: Orm, userId: string): Promise<boolean> {
  const [row] = await orm.select({ id: user.id }).from(user).where(eq(user.id, userId));
  return row !== undefined;
}

/** One transaction: either the whole account is gone or nothing changed. Usage rows are anonymised, not erased. */
export function eraseAccountRows(orm: Orm, userId: string): Promise<void> {
  return orm.transaction(async (tx) => {
    const [owner] = await tx.select({ email: user.email }).from(user).where(eq(user.id, userId));
    const projectIds = tx.$with('owned').as(
      tx
        .select({ id: projects.id })
        .from(projects)
        .where(sql`${projects.id} IN (${ownedProjects(userId)})`),
    );
    const ids = (await tx.with(projectIds).select().from(projectIds)).map((row) => row.id);
    if (ids.length > 0) {
      // Exports reference assets, analysis runs reference assets: both before the assets.
      await tx.delete(shareLinks).where(inArray(shareLinks.projectId, ids));
      await tx.delete(exports).where(inArray(exports.projectId, ids));
      await tx.delete(chatMessages).where(inArray(chatMessages.projectId, ids));
      await tx.delete(projectEvents).where(inArray(projectEvents.projectId, ids));
      await tx.delete(analysisRuns).where(inArray(analysisRuns.projectId, ids));
      await tx.delete(revisions).where(inArray(revisions.projectId, ids));
      await tx.delete(documents).where(inArray(documents.projectId, ids));
      await tx.delete(assets).where(inArray(assets.projectId, ids));
      await tx.delete(projects).where(inArray(projects.id, ids));
    }
    const owned = tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.ownerUserId, userId));
    await tx.delete(workspaceMembers).where(inArray(workspaceMembers.workspaceId, owned));
    await tx.delete(workspaceMembers).where(eq(workspaceMembers.userId, userId));
    await tx.delete(workspaces).where(eq(workspaces.ownerUserId, userId));
    await tx.update(usageEvents).set({ userId: null }).where(eq(usageEvents.userId, userId));
    await tx
      .update(guestSessions)
      .set({ claimedByUserId: null })
      .where(eq(guestSessions.claimedByUserId, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    if (owner) await tx.delete(verification).where(eq(verification.identifier, owner.email));
    await tx.delete(user).where(eq(user.id, userId));
  });
}

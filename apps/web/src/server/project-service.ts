import { randomBytes } from 'node:crypto';
import type { Actor } from '@app/contracts';
import {
  and,
  documents,
  eq,
  isNull,
  projects,
  revisions,
  sql,
  workspaceMembers,
  workspaces,
  type createDatabase,
} from '@app/db';
import { uuidV7 } from '@app/kernel';

// 04_API_CONTRACTS.md §3 "Projets". Authorisation is decided by the routes through can(); these functions
// only read and write.
type Orm = ReturnType<typeof createDatabase>['orm'];
const newId = (): string => uuidV7(Date.now(), randomBytes(10));
export const PAGE_LIMIT = 50;

export interface ProjectInput {
  readonly title: string;
  readonly industryLabel?: string | undefined;
  readonly language: 'fr' | 'en';
  readonly briefText?: string | undefined;
}
export type ProjectRow = typeof projects.$inferSelect;
type Owner =
  | { readonly kind: 'user'; readonly userId: string }
  | { readonly kind: 'guest'; readonly guestSessionId: string };

/** Projects of a guest session (limit of one, 01_PRODUCT_MVP.md §3). */
export async function countGuestProjects(orm: Orm, guestSessionId: string): Promise<number> {
  const [row] = await orm
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(and(eq(projects.guestSessionId, guestSessionId), isNull(projects.deletedAt)));
  return row?.count ?? 0;
}

/** MVP: one personal workspace per user, created with its owner membership on first use. */
export async function personalWorkspace(
  tx: Parameters<Parameters<Orm['transaction']>[0]>[0],
  userId: string,
) {
  const [existing] = await tx
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerUserId, userId));
  if (existing) return existing.id;
  const id = newId();
  await tx.insert(workspaces).values({ id, name: 'Personnel', ownerUserId: userId });
  await tx.insert(workspaceMembers).values({ workspaceId: id, userId, role: 'owner' });
  return id;
}

export function createProject(orm: Orm, owner: Owner, input: ProjectInput): Promise<ProjectRow> {
  return orm.transaction(async (tx) => {
    const ownership =
      owner.kind === 'user'
        ? { workspaceId: await personalWorkspace(tx, owner.userId) }
        : { guestSessionId: owner.guestSessionId };
    const [row] = await tx
      .insert(projects)
      .values({ id: newId(), ...ownership, ...input })
      .returning();
    if (!row) throw new Error('INSERT … RETURNING returned no row');
    return row;
  });
}

const escapeLike = (text: string): string =>
  text.replace(/[\\%_]/g, (character) => `\\${character}`);

/** Projects the actor can see, newest first (UUID v7 ids are time-ordered), cursor = last id of the page. */
export async function listProjects(
  orm: Orm,
  actor: Actor,
  options: {
    readonly cursor?: string | undefined;
    readonly limit: number;
    readonly query?: string | undefined;
  },
): Promise<{ items: ProjectRow[]; nextCursor: string | null }> {
  const visibility =
    actor.kind === 'user'
      ? sql`${projects.workspaceId} IN (SELECT ${workspaceMembers.workspaceId} FROM ${workspaceMembers} WHERE ${workspaceMembers.userId} = ${actor.userId})`
      : actor.kind === 'guest'
        ? eq(projects.guestSessionId, actor.guestSessionId)
        : sql`false`;
  const filters = [
    visibility,
    isNull(projects.deletedAt),
    ...(options.cursor === undefined ? [] : [sql`${projects.id} < ${options.cursor}`]),
    ...(options.query === undefined
      ? []
      : [sql`${projects.title} ILIKE ${`%${escapeLike(options.query)}%`}`]),
  ];
  const rows = await orm
    .select()
    .from(projects)
    .where(and(...filters))
    .orderBy(sql`${projects.id} DESC`)
    .limit(options.limit + 1);
  const items = rows.slice(0, options.limit);
  return { items, nextCursor: rows.length > options.limit ? (items.at(-1)?.id ?? null) : null };
}

export async function getProject(orm: Orm, projectId: string) {
  const [project] = await orm
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!project) return undefined;
  const [document] = await orm.select().from(documents).where(eq(documents.projectId, projectId));
  return { project, document: document ? { seq: document.seq, body: document.body } : null };
}

export async function updateProject(
  orm: Orm,
  projectId: string,
  changes: { readonly title?: string | undefined; readonly industryLabel?: string | undefined },
): Promise<ProjectRow | undefined> {
  const [row] = await orm
    .update(projects)
    .set({ ...changes, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning();
  return row;
}

/** Logical deletion; the scheduled purge removes the data later (03_DATA_MODEL.md §1). */
export async function deleteProject(orm: Orm, projectId: string): Promise<boolean> {
  const rows = await orm
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning({ id: projects.id });
  return rows.length === 1;
}

/** History with the undone state of each revision (04_API_CONTRACTS.md §3 "Document"). */
export async function listRevisions(
  orm: Orm,
  projectId: string,
  options: { readonly before?: number | undefined; readonly limit: number },
) {
  const rows = await orm
    .select({
      seq: revisions.seq,
      actor: revisions.actor,
      undoOf: revisions.undoOf,
      redoOf: revisions.redoOf,
      createdAt: revisions.createdAt,
    })
    .from(revisions)
    .where(
      and(
        eq(revisions.projectId, projectId),
        ...(options.before === undefined ? [] : [sql`${revisions.seq} < ${options.before}`]),
      ),
    )
    .orderBy(sql`${revisions.seq} DESC`)
    .limit(options.limit + 1);
  const [undone] = await orm
    .select({
      seqs: sql<
        number[]
      >`coalesce(array_agg(${revisions.undoOf}) FILTER (WHERE ${revisions.undoOf} IS NOT NULL), '{}')`,
    })
    .from(revisions)
    .where(eq(revisions.projectId, projectId));
  const undoneSeqs = new Set((undone?.seqs ?? []).map(Number));
  const items = rows
    .slice(0, options.limit)
    .map((row) => ({ ...row, undone: undoneSeqs.has(row.seq) }));
  return { items, nextCursor: rows.length > options.limit ? (items.at(-1)?.seq ?? null) : null };
}

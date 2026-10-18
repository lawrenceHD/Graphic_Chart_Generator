import type { Actor, Resource } from '@app/contracts';
import { and, eq, isNull, projects, workspaceMembers, type createDatabase } from '@app/db';

type Orm = ReturnType<typeof createDatabase>['orm'];

/**
 * The can() resource of a project for this actor (08_SECURITY_PRIVACY.md §4). A missing or deleted project
 * yields a resource nobody but the worker may read, so authorize() answers 404 without revealing anything.
 */
export async function projectResource(
  orm: Orm,
  projectId: string,
  actor: Actor | null,
): Promise<Resource> {
  const [project] = await orm
    .select({ workspaceId: projects.workspaceId, guestSessionId: projects.guestSessionId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  if (!project) return { kind: 'project', projectId };
  const base = {
    kind: 'project' as const,
    projectId,
    ...(project.guestSessionId === null ? {} : { guestSessionId: project.guestSessionId }),
  };
  if (actor?.kind !== 'user' || project.workspaceId === null) return base;
  const [membership] = await orm
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, project.workspaceId),
        eq(workspaceMembers.userId, actor.userId),
      ),
    );
  return membership ? { ...base, memberRole: membership.role } : base;
}

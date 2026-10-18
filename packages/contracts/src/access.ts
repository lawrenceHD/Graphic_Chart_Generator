// Central authorisation (docs/08_SECURITY_PRIVACY.md §4, ADR-025). Every route and server action calls
// authorize() after authentication; callers hold no authorisation logic of their own. Pure: the caller
// resolves memberships and ownership from the database and passes them in `resource`.

export type Actor =
  | { readonly kind: 'user'; readonly userId: string; readonly emailVerified: boolean }
  | { readonly kind: 'guest'; readonly guestSessionId: string }
  | { readonly kind: 'share'; readonly projectId: string }
  | { readonly kind: 'system' };

export const ACTIONS = [
  'project:create',
  'project:read',
  'project:write',
  'project:delete',
  'asset:create',
  'asset:read',
  'document:command',
  'copilot:use',
  'export:create',
  'export:read',
  'share:create',
  'share:revoke',
  'share:read',
  'account:delete',
  'guest:claim',
] as const;
export type Action = (typeof ACTIONS)[number];

export type MemberRole = 'owner' | 'editor' | 'viewer';

export type Resource =
  | {
      readonly kind: 'project';
      readonly projectId: string;
      /** Role of the user actor in the project's workspace, absent when not a member. */
      readonly memberRole?: MemberRole;
      /** Guest session owning the project, for projects not yet claimed by an account. */
      readonly guestSessionId?: string;
    }
  | {
      readonly kind: 'none';
      /** Projects already owned by the guest actor (limit of one, 01_PRODUCT_MVP.md §3). */
      readonly guestProjectCount?: number;
    };

const PROJECT_ACTIONS = new Set<Action>([
  'project:read',
  'project:write',
  'project:delete',
  'asset:create',
  'asset:read',
  'document:command',
  'copilot:use',
  'export:create',
  'export:read',
  'share:create',
  'share:revoke',
  'share:read',
]);
const VIEWER = new Set<Action>(['project:read', 'asset:read', 'export:read']);
const SHARE = new Set<Action>(['project:read', 'asset:read', 'share:read']);
const GUEST = new Set<Action>([
  'project:read',
  'project:write',
  'asset:create',
  'asset:read',
  'document:command',
]);
const SYSTEM = new Set<Action>([
  'project:read',
  'project:write',
  'asset:create',
  'asset:read',
  'export:create',
  'export:read',
]);
const USER_OUTSIDE_PROJECT = new Set<Action>(['project:create', 'account:delete', 'guest:claim']);
/** SEC-03: these actions need an account with a verified e-mail. */
const VERIFIED_ONLY = new Set<Action>(['copilot:use', 'export:create', 'share:create']);
const VERIFIED_EMAIL = new Set<Action>(['export:create', 'share:create']);
const GUEST_PROJECT_LIMIT = 1;

/** Default deny: any combination absent from the ADR-025 matrix is refused. */
export function can(actor: Actor, action: Action, resource: Resource): boolean {
  if (resource.kind === 'none') {
    if (actor.kind === 'user') return USER_OUTSIDE_PROJECT.has(action);
    if (actor.kind === 'guest') {
      return action === 'project:create' && (resource.guestProjectCount ?? 0) < GUEST_PROJECT_LIMIT;
    }
    return false;
  }
  switch (actor.kind) {
    case 'system':
      return SYSTEM.has(action);
    case 'share':
      return actor.projectId === resource.projectId && SHARE.has(action);
    case 'guest':
      return resource.guestSessionId === actor.guestSessionId && GUEST.has(action);
    case 'user':
      if (resource.memberRole === 'viewer') return VIEWER.has(action);
      if (resource.memberRole !== 'owner' && resource.memberRole !== 'editor') return false;
      return PROJECT_ACTIONS.has(action) && (actor.emailVerified || !VERIFIED_EMAIL.has(action));
  }
}

export type Authorization =
  | { readonly outcome: 'allowed' }
  | { readonly outcome: 'unauthenticated' }
  | { readonly outcome: 'not-found' }
  | { readonly outcome: 'forbidden'; readonly code: 'FORBIDDEN' | 'VERIFIED_ACCOUNT_REQUIRED' };

/**
 * HTTP outcome (10_QUALITY.md §7): 401 without actor; 404 when the actor cannot even read the resource, so
 * its existence is never revealed (SEC-08); 403 only for an actor who can read it but not do this.
 */
export function authorize(actor: Actor | null, action: Action, resource: Resource): Authorization {
  if (actor === null) return { outcome: 'unauthenticated' };
  if (can(actor, action, resource)) return { outcome: 'allowed' };
  if (resource.kind === 'project' && !can(actor, 'project:read', resource))
    return { outcome: 'not-found' };
  const needsAccount =
    VERIFIED_ONLY.has(action) &&
    (actor.kind === 'guest' || (actor.kind === 'user' && !actor.emailVerified));
  return { outcome: 'forbidden', code: needsAccount ? 'VERIFIED_ACCOUNT_REQUIRED' : 'FORBIDDEN' };
}

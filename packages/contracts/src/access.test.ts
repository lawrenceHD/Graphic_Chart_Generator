import { describe, expect, it } from 'vitest';
import { ACTIONS, authorize, can, type Action, type Actor, type Resource } from './access.js';

// The matrix of docs/08_SECURITY_PRIVACY.md §4 (ADR-025), written independently of the implementation.
const PROJECT_ACTIONS: readonly Action[] = [
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
];
const VERIFIED_ONLY: readonly Action[] = ['export:create', 'share:create'];

const project = (extra: Partial<Extract<Resource, { kind: 'project' }>> = {}): Resource => ({
  kind: 'project',
  projectId: 'p1',
  ...extra,
});
const verified: Actor = { kind: 'user', userId: 'u1', emailVerified: true };
const unverified: Actor = { kind: 'user', userId: 'u1', emailVerified: false };
const guest: Actor = { kind: 'guest', guestSessionId: 'g1' };
const share: Actor = { kind: 'share', projectId: 'p1' };
const system: Actor = { kind: 'system' };

function allowed(actor: Actor, resource: Resource): Action[] {
  return ACTIONS.filter((action) => can(actor, action, resource));
}

describe('can() matrix (ADR-025)', () => {
  it('owner and editor: every project action', () => {
    expect(allowed(verified, project({ memberRole: 'owner' }))).toEqual(PROJECT_ACTIONS);
    expect(allowed(verified, project({ memberRole: 'editor' }))).toEqual(PROJECT_ACTIONS);
  });

  it('an unverified e-mail cannot export or share (SEC-03)', () => {
    expect(allowed(unverified, project({ memberRole: 'owner' }))).toEqual(
      PROJECT_ACTIONS.filter((action) => !VERIFIED_ONLY.includes(action)),
    );
  });

  it('viewer: read actions only', () => {
    expect(allowed(verified, project({ memberRole: 'viewer' }))).toEqual([
      'project:read',
      'asset:read',
      'export:read',
    ]);
  });

  it('a user without membership gets nothing on the project', () => {
    expect(allowed(verified, project())).toEqual([]);
  });

  it('share link: read on its own project only', () => {
    expect(allowed(share, project())).toEqual(['project:read', 'asset:read', 'share:read']);
    expect(allowed(share, project({ projectId: 'p2' }))).toEqual([]);
  });

  it('guest: its own project, without copilot, export creation or sharing', () => {
    expect(allowed(guest, project({ guestSessionId: 'g1' }))).toEqual([
      'project:read',
      'project:write',
      'asset:create',
      'asset:read',
      'document:command',
    ]);
    expect(allowed(guest, project({ guestSessionId: 'g2' }))).toEqual([]);
  });

  it('outside a project: users create, delete their account, claim; guests create one project', () => {
    expect(allowed(verified, { kind: 'none' })).toEqual([
      'project:create',
      'account:delete',
      'guest:claim',
    ]);
    expect(allowed(guest, { kind: 'none', guestProjectCount: 0 })).toEqual(['project:create']);
    expect(allowed(guest, { kind: 'none', guestProjectCount: 1 })).toEqual([]);
    expect(allowed(share, { kind: 'none' })).toEqual([]);
  });

  it('system (worker): its six actions on any project', () => {
    expect(allowed(system, project())).toEqual([
      'project:read',
      'project:write',
      'asset:create',
      'asset:read',
      'export:create',
      'export:read',
    ]);
    expect(allowed(system, { kind: 'none' })).toEqual([]);
  });
});

describe('authorize(): HTTP outcome of 10_QUALITY.md §7', () => {
  it('a. no actor → 401', () => {
    expect(authorize(null, 'project:read', project())).toEqual({ outcome: 'unauthenticated' });
  });

  it("b, c. someone else's project → 404, never revealing it", () => {
    expect(authorize(verified, 'project:write', project())).toEqual({ outcome: 'not-found' });
    expect(authorize(guest, 'project:read', project({ guestSessionId: 'g2' }))).toEqual({
      outcome: 'not-found',
    });
  });

  it('d. share link on a write route: 403 on its project, 404 elsewhere', () => {
    expect(authorize(share, 'document:command', project())).toEqual({
      outcome: 'forbidden',
      code: 'FORBIDDEN',
    });
    expect(authorize(share, 'document:command', project({ projectId: 'p2' }))).toEqual({
      outcome: 'not-found',
    });
  });

  it('e. guest on its own project: copilot, exports, sharing → 403 asking for a verified account', () => {
    for (const action of ['copilot:use', 'export:create', 'share:create'] as const) {
      expect(authorize(guest, action, project({ guestSessionId: 'g1' }))).toEqual({
        outcome: 'forbidden',
        code: 'VERIFIED_ACCOUNT_REQUIRED',
      });
    }
  });

  it('f. viewer on a write route → 403; g. authorised actor → allowed', () => {
    expect(authorize(verified, 'project:write', project({ memberRole: 'viewer' }))).toEqual({
      outcome: 'forbidden',
      code: 'FORBIDDEN',
    });
    expect(authorize(verified, 'project:write', project({ memberRole: 'owner' }))).toEqual({
      outcome: 'allowed',
    });
  });
});

import type { Action } from '@app/contracts';

// SEC-08 / ADR-014: every API route is declared here with the can() action it requires. A route file
// missing from this table fails CI (routes.test.ts), and each entry gets the generated access tests.
export interface RouteEntry {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Path under /api/v1, Next.js dynamic segments in brackets. */
  readonly path: string;
  readonly action: Action;
}

export const ROUTES: readonly RouteEntry[] = [
  { method: 'POST', path: '/projects/[id]/commands', action: 'document:command' },
  { method: 'POST', path: '/projects/[id]/undo', action: 'document:command' },
  { method: 'POST', path: '/projects/[id]/redo', action: 'document:command' },
  { method: 'POST', path: '/projects/[id]/revisions/[seq]/undo', action: 'document:command' },
];

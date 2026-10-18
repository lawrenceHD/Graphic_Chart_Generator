import { authorize, type Actor } from '@app/contracts';
import type { createDatabase } from '@app/db';
import { z } from 'zod';
import {
  applyCommand,
  redo,
  undo,
  undoRevision,
  type DocumentServiceError,
  type DocumentState,
} from './document-service';
import { authorizationResponse, checkOrigin, problemResponse, readJson } from './http';
import { projectResource } from './project-access';

// Route handlers of 04_API_CONTRACTS.md §3 "Document". Order: authentication, Origin (SEC-06),
// authorisation through can() (SEC-07), body validation, then the service.
type Orm = ReturnType<typeof createDatabase>['orm'];

export interface RouteDeps {
  readonly orm: Orm;
  readonly appUrl: string;
  readonly resolveActor: (request: Request) => Promise<Actor | null>;
}
export type RouteParams = Promise<Record<string, string | string[] | undefined>>;

const Params = z.object({ id: z.uuid(), seq: z.coerce.number().int().positive().optional() });
const BaseBody = z.object({ baseSeq: z.number().int().nonnegative() }).strict();
const CommandBody = z
  .object({ baseSeq: z.number().int().nonnegative(), command: z.unknown() })
  .strict();

const STATUS: Readonly<Record<DocumentServiceError['code'], number>> = {
  PROJECT_NOT_FOUND: 404,
  REVISION_NOT_FOUND: 404,
  REVISION_CONFLICT: 409,
  EXPECTATION_FAILED: 409,
  UNDO_CONFLICT: 409,
  NOTHING_TO_UNDO: 409,
  NOTHING_TO_REDO: 409,
  ALREADY_UNDONE: 409,
  PAGE_NOT_FOUND: 422,
  FIELD_NOT_ALLOWED: 422,
  VALUE_OUT_OF_RANGE: 422,
  INVALID_COMMAND: 422,
  DOCUMENT_TOO_LARGE: 422,
  CORRUPTED_DOCUMENT: 500,
};

function outcomeResponse(
  request: Request,
  outcome: { ok: true; value: DocumentState } | { ok: false; error: DocumentServiceError },
): Response {
  if (outcome.ok)
    return Response.json({ seq: outcome.value.seq, document: outcome.value.document });
  const code = outcome.error.code === 'PROJECT_NOT_FOUND' ? 'NOT_FOUND' : outcome.error.code;
  return problemResponse(request, STATUS[outcome.error.code], code, 'document operation refused');
}

type Operation = (
  orm: Orm,
  base: { projectId: string; baseSeq: number; actor: 'user' | 'system' },
  body: unknown,
  seq: number | undefined,
) => Promise<{ ok: true; value: DocumentState } | { ok: false; error: DocumentServiceError }>;

function handler(deps: RouteDeps, schema: z.ZodType<{ baseSeq: number }>, operation: Operation) {
  return async (request: Request, context: { params: RouteParams }): Promise<Response> => {
    const actor = await deps.resolveActor(request);
    if (actor === null) return problemResponse(request, 401, 'UNAUTHENTICATED', 'sign in required');
    const rejectedOrigin = checkOrigin(request, deps.appUrl);
    if (rejectedOrigin) return rejectedOrigin;
    const params = Params.safeParse(await context.params);
    if (!params.success) return problemResponse(request, 404, 'NOT_FOUND', 'no such resource');
    const resource = await projectResource(deps.orm, params.data.id, actor);
    const denied = authorizationResponse(request, authorize(actor, 'document:command', resource));
    if (denied) return denied;
    const body = await readJson(request, schema);
    if (!body.ok) return body.error;
    const base = {
      projectId: params.data.id,
      baseSeq: body.value.baseSeq,
      actor: actor.kind === 'system' ? ('system' as const) : ('user' as const),
    };
    return outcomeResponse(request, await operation(deps.orm, base, body.value, params.data.seq));
  };
}

export function documentHandlers(deps: RouteDeps) {
  return {
    commands: handler(deps, CommandBody, (orm, base, body) =>
      applyCommand(orm, { ...base, command: CommandBody.parse(body).command }),
    ),
    undo: handler(deps, BaseBody, (orm, base) => undo(orm, base)),
    redo: handler(deps, BaseBody, (orm, base) => redo(orm, base)),
    undoRevision: handler(deps, BaseBody, (orm, base, _body, seq) =>
      seq === undefined
        ? Promise.resolve({ ok: false, error: { code: 'REVISION_NOT_FOUND' } })
        : undoRevision(orm, { ...base, seq }),
    ),
  };
}

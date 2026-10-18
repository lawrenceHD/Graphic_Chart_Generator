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
import { problemResponse, readJson } from './http';
import { guardProject, type RouteDeps, type RouteParams } from './route-guard';

// Route handlers of 04_API_CONTRACTS.md §3 "Document". Order: authentication, Origin (SEC-06),
// authorisation through can() (SEC-07), body validation, then the service.
type Orm = ReturnType<typeof createDatabase>['orm'];

const BaseBody = z.object({ baseSeq: z.number().int().nonnegative() }).strict();
const CommandBody = z
  .object({ baseSeq: z.number().int().nonnegative(), command: z.unknown() })
  .strict();

const STATUS: Readonly<Record<DocumentServiceError['code'], number>> = {
  PROJECT_NOT_FOUND: 404,
  REVISION_NOT_FOUND: 404,
  REVISION_CONFLICT: 409,
  DOCUMENT_NOT_READY: 409,
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
    const guard = await guardProject(deps, request, context.params, 'document:command');
    if (!guard.ok) return guard.error;
    const { actor, params } = guard.value;
    const body = await readJson(request, schema);
    if (!body.ok) return body.error;
    const base = {
      projectId: params.id,
      baseSeq: body.value.baseSeq,
      actor: actor.kind === 'system' ? ('system' as const) : ('user' as const),
    };
    return outcomeResponse(request, await operation(deps.orm, base, body.value, params.seq));
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

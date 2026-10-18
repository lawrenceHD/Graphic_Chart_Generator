import { randomBytes } from 'node:crypto';
import { and, documents, eq, revisions, type createDatabase } from '@app/db';
import {
  apply,
  applyInverse,
  checkTargetedUndo,
  migrate,
  redoTarget,
  undoTarget,
  type ApplyResult,
  type BrandDocument,
  type CommandError,
} from '@app/document';
import { err, ok, uuidV7, type Result } from '@app/kernel';

// Server side of 04_API_CONTRACTS.md §3 "Document" and 03_DATA_MODEL.md §5 (ADR-018). Each operation runs in
// one transaction holding the document row lock, so concurrent writers serialise on `seq`.
type Orm = ReturnType<typeof createDatabase>['orm'];
type Transaction = Parameters<Parameters<Orm['transaction']>[0]>[0];
type Actor = 'user' | 'ai' | 'system';

const SNAPSHOT_EVERY = 25;

export type DocumentServiceError =
  | CommandError
  | { readonly code: 'PROJECT_NOT_FOUND' }
  | { readonly code: 'CORRUPTED_DOCUMENT' }
  | { readonly code: 'REVISION_CONFLICT'; readonly currentSeq: number }
  | { readonly code: 'UNDO_CONFLICT' }
  | { readonly code: 'NOTHING_TO_UNDO' }
  | { readonly code: 'NOTHING_TO_REDO' }
  | { readonly code: 'REVISION_NOT_FOUND' }
  | { readonly code: 'ALREADY_UNDONE' };

export interface DocumentState {
  readonly seq: number;
  readonly document: BrandDocument;
}
type Outcome = Result<DocumentState, DocumentServiceError>;

interface Base {
  readonly projectId: string;
  readonly baseSeq: number;
  readonly actor: Actor;
}

async function lockDocument(
  tx: Transaction,
  projectId: string,
  baseSeq: number,
): Promise<Result<DocumentState, DocumentServiceError>> {
  const [row] = await tx
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId))
    .for('update');
  if (!row) return err({ code: 'PROJECT_NOT_FOUND' });
  if (row.seq !== baseSeq) return err({ code: 'REVISION_CONFLICT', currentSeq: row.seq });
  // Every jsonb read is validated (03_DATA_MODEL.md §1).
  const document = migrate(row.body);
  return document.ok
    ? ok({ seq: row.seq, document: document.value })
    : err({ code: 'CORRUPTED_DOCUMENT' });
}

async function commit(
  tx: Transaction,
  projectId: string,
  previousSeq: number,
  command: unknown,
  result: Extract<ApplyResult, { ok: true }>['value'],
  actor: Actor,
  link: { undoOf?: number; redoOf?: number } = {},
): Promise<DocumentState> {
  const seq = previousSeq + 1;
  await tx.insert(revisions).values({
    id: uuidV7(Date.now(), randomBytes(10)),
    projectId,
    seq,
    actor,
    command,
    inverse: result.inverse,
    undoOf: link.undoOf ?? null,
    redoOf: link.redoOf ?? null,
    snapshot: seq % SNAPSHOT_EVERY === 0 ? result.doc : null,
  });
  await tx
    .update(documents)
    .set({ body: result.doc, seq, updatedAt: new Date() })
    .where(eq(documents.projectId, projectId));
  return { seq, document: result.doc };
}

/** `POST /projects/:id/commands`: applies a public command on top of `baseSeq`. */
export function applyCommand(
  orm: Orm,
  request: Base & { readonly command: unknown },
): Promise<Outcome> {
  return orm.transaction(async (tx) => {
    const current = await lockDocument(tx, request.projectId, request.baseSeq);
    if (!current.ok) return current;
    const result = apply(current.value.document, request.command);
    if (!result.ok) return err(result.error);
    return ok(
      await commit(
        tx,
        request.projectId,
        current.value.seq,
        request.command,
        result.value,
        request.actor,
      ),
    );
  });
}

async function revisionRefs(tx: Transaction, projectId: string) {
  return tx
    .select({ seq: revisions.seq, undoOf: revisions.undoOf, redoOf: revisions.redoOf })
    .from(revisions)
    .where(eq(revisions.projectId, projectId));
}

async function storedInverse(tx: Transaction, projectId: string, seq: number): Promise<unknown> {
  const [row] = await tx
    .select({ inverse: revisions.inverse })
    .from(revisions)
    .where(and(eq(revisions.projectId, projectId), eq(revisions.seq, seq)));
  return row?.inverse;
}

// Applies the stored inverse of `targetSeq`; a changed value since then is an UNDO_CONFLICT (ADR-018).
async function replayInverse(
  tx: Transaction,
  request: Base,
  current: DocumentState,
  targetSeq: number,
  link: { undoOf?: number; redoOf?: number },
): Promise<Outcome> {
  const inverse = await storedInverse(tx, request.projectId, targetSeq);
  const result = applyInverse(current.document, inverse);
  if (!result.ok)
    return err(
      result.error.code === 'EXPECTATION_FAILED' ? { code: 'UNDO_CONFLICT' } : result.error,
    );
  return ok(
    await commit(tx, request.projectId, current.seq, inverse, result.value, request.actor, link),
  );
}

/** `POST /projects/:id/undo`: newest revision neither an undo nor already undone. */
export function undo(orm: Orm, request: Base): Promise<Outcome> {
  return orm.transaction(async (tx) => {
    const current = await lockDocument(tx, request.projectId, request.baseSeq);
    if (!current.ok) return current;
    const target = undoTarget(await revisionRefs(tx, request.projectId));
    if (target === undefined) return err({ code: 'NOTHING_TO_UNDO' });
    return replayInverse(tx, request, current.value, target, { undoOf: target });
  });
}

/** `POST /projects/:id/redo`: newest undo not redone, unless an ordinary revision came after it. */
export function redo(orm: Orm, request: Base): Promise<Outcome> {
  return orm.transaction(async (tx) => {
    const current = await lockDocument(tx, request.projectId, request.baseSeq);
    if (!current.ok) return current;
    const target = redoTarget(await revisionRefs(tx, request.projectId));
    if (target === undefined) return err({ code: 'NOTHING_TO_REDO' });
    return replayInverse(tx, request, current.value, target, { redoOf: target });
  });
}

/** `POST /projects/:id/revisions/:seq/undo`: undoes one past revision, e.g. a copilot command. */
export function undoRevision(orm: Orm, request: Base & { readonly seq: number }): Promise<Outcome> {
  return orm.transaction(async (tx) => {
    const current = await lockDocument(tx, request.projectId, request.baseSeq);
    if (!current.ok) return current;
    const check = checkTargetedUndo(await revisionRefs(tx, request.projectId), request.seq);
    if (check === 'NOT_FOUND' || check === 'IS_UNDO') return err({ code: 'REVISION_NOT_FOUND' });
    if (check === 'ALREADY_UNDONE') return err({ code: 'ALREADY_UNDONE' });
    return replayInverse(tx, request, current.value, request.seq, { undoOf: request.seq });
  });
}

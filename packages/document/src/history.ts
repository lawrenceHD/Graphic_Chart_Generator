// Server-side undo / redo selection (03_DATA_MODEL.md §5, ADR-018). Pure: the caller loads the revision
// references of a project, applies the chosen revision's stored inverse with applyInverse(), and records
// the result as a new revision with `undo_of` or `redo_of`.

export interface RevisionRef {
  readonly seq: number;
  /** seq of the revision this one undoes. */
  readonly undoOf: number | null;
  /** seq of the undo this one redoes. */
  readonly redoOf: number | null;
}

const newestFirst = (revisions: readonly RevisionRef[]): RevisionRef[] =>
  [...revisions].sort((a, b) => b.seq - a.seq);

/** Newest revision that is not itself an undo and has not been undone yet; its inverse is applied. */
export function undoTarget(revisions: readonly RevisionRef[]): number | undefined {
  const undone = new Set(revisions.flatMap((revision) => revision.undoOf ?? []));
  return newestFirst(revisions).find(
    (revision) => revision.undoOf === null && !undone.has(revision.seq),
  )?.seq;
}

/**
 * Newest undo not redone yet and later than the last ordinary revision (a new edit clears redo). The undo's
 * own inverse re-applies the original command, with `expect` set to the value the undo restored.
 */
export function redoTarget(revisions: readonly RevisionRef[]): number | undefined {
  const redone = new Set(revisions.flatMap((revision) => revision.redoOf ?? []));
  for (const revision of newestFirst(revisions)) {
    const ordinaryRevision = revision.undoOf === null && revision.redoOf === null;
    if (ordinaryRevision) return undefined;
    if (revision.undoOf !== null && !redone.has(revision.seq)) return revision.seq;
  }
  return undefined;
}

export type TargetedUndoCheck = 'ok' | 'NOT_FOUND' | 'IS_UNDO' | 'ALREADY_UNDONE';

/** `POST /revisions/:seq/undo`: any past revision may be undone; a later edit surfaces as UNDO_CONFLICT. */
export function checkTargetedUndo(
  revisions: readonly RevisionRef[],
  seq: number,
): TargetedUndoCheck {
  const revision = revisions.find((entry) => entry.seq === seq);
  if (!revision) return 'NOT_FOUND';
  if (revision.undoOf !== null) return 'IS_UNDO';
  return revisions.some((entry) => entry.undoOf === seq) ? 'ALREADY_UNDONE' : 'ok';
}
